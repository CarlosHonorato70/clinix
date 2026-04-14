/**
 * Clinix — Extração de códigos TUSS/CID do prontuário com defesa anti-alucinação
 *
 * Implementa as 7 camadas de defesa:
 * - Camada 1: validação estrutural (TUSS no banco de referência)
 * - Camada 2: seed + max_tokens determinístico (via safeChatCompletion)
 * - Camada 3: prompt defensivo com few-shot e confiança por item
 * - Camada 4: retorna flag requiresReview para UI destacar
 * - Camada 5: injeta regras aprendidas do tenant no contexto
 * - Camada 6: guard-rails externos (regex CID, datas, quantidades)
 * - Camada 7: telemetria de toda inferência
 */

import { isAIAvailable, safeChatCompletion } from './openai'
import { validateTussExtraction, type ExtractionValidation } from './validators'
import { logInference, shouldPauseFeature } from './telemetry'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas } from '@/lib/db/schema'
import { and, eq, gte } from 'drizzle-orm'

export interface RawTussExtraction {
  cid10_principal: string
  cid10_secundarios: string[]
  procedimentos: {
    tuss: string
    descricao: string
    quantidade: number
    confianca: number
  }[]
  tipo_consulta: string
  observacao_auditoria?: string | null
  confianca_geral: number
}

export interface TussExtractionResult {
  raw: RawTussExtraction
  validation: ExtractionValidation
  inferenceId: string | null
  source: 'ai' | 'paused' | 'unavailable'
}

const SYSTEM_PROMPT = `Você é um auditor médico especialista em codificação TUSS e CID-10 para faturamento de planos de saúde brasileiros (TISS v4.02 ANS).

REGRAS ABSOLUTAS:
1. NUNCA invente códigos TUSS ou CID-10. Use SOMENTE códigos que você tem certeza que existem.
2. Se não tem certeza sobre um código, use confianca < 0.7 e seja explícito no campo observacao_auditoria.
3. NÃO infira procedimentos não documentados no prontuário. Extraia APENAS o que está descrito.
4. Quantidades devem corresponder ao documentado. Default = 1 se não especificado.
5. CID-10 deve seguir formato: Letra + 2 dígitos + opcional ponto + 1-2 dígitos (ex: J45.0, M54.5).
6. TUSS deve ter 8 dígitos (10 para materiais/OPME).

EXEMPLO DE BOA EXTRAÇÃO:
Input: "Paciente 45a, dor torácica, PA 160/100, solicitado ECG e troponina"
Output:
{
  "cid10_principal": "R07.4",
  "cid10_secundarios": ["I10"],
  "procedimentos": [
    {"tuss": "10101012", "descricao": "Consulta em consultório", "quantidade": 1, "confianca": 0.95},
    {"tuss": "40304361", "descricao": "Eletrocardiograma de repouso", "quantidade": 1, "confianca": 0.92},
    {"tuss": "40302558", "descricao": "Troponina I (pesquisa e/ou dosagem)", "quantidade": 1, "confianca": 0.88}
  ],
  "tipo_consulta": "primeira_consulta",
  "observacao_auditoria": null,
  "confianca_geral": 0.92
}

EXEMPLO DE EXTRAÇÃO COM INCERTEZA:
Input: "Retorno, paciente melhor, mantida medicação"
Output:
{
  "cid10_principal": "Z09.8",
  "cid10_secundarios": [],
  "procedimentos": [
    {"tuss": "10101012", "descricao": "Consulta em consultório (retorno)", "quantidade": 1, "confianca": 0.90}
  ],
  "tipo_consulta": "retorno",
  "observacao_auditoria": "CID-10 principal incerto - prontuário não especifica condição de base",
  "confianca_geral": 0.65
}

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "cid10_principal": "string (CID-10 válido)",
  "cid10_secundarios": ["string"],
  "procedimentos": [
    {"tuss": "8 dígitos", "descricao": "string", "quantidade": number 1-999, "confianca": number 0-1}
  ],
  "tipo_consulta": "primeira_consulta|retorno|urgencia",
  "observacao_auditoria": "string ou null",
  "confianca_geral": number 0-1
}`

export async function extractTussCodes(
  anamnese: string,
  exameFisico: string,
  conduta: string,
  tenantId: string,
): Promise<TussExtractionResult> {
  // Circuit breaker: pausa se taxa de rejeição muito alta
  if (await shouldPauseFeature('tuss_extraction')) {
    return {
      raw: {
        cid10_principal: '',
        cid10_secundarios: [],
        procedimentos: [],
        tipo_consulta: 'primeira_consulta',
        confianca_geral: 0,
      },
      validation: {
        cid10_principal: { code: '', isValid: false, confianca: 0 },
        cid10_secundarios: [],
        procedimentos: [],
        hasErrors: true,
        requiresReview: true,
        summary: { totalProcedures: 0, validProcedures: 0, invalidTussCodes: 0, lowConfidenceItems: 0 },
      },
      inferenceId: null,
      source: 'paused',
    }
  }

  if (!isAIAvailable()) {
    return emptyResult('unavailable')
  }

  // Camada 5: buscar regras aprendidas do tenant para injetar no contexto
  const regras = await db
    .select({
      descricao: convenioRegrasAprendidas.descricao,
      tipoRegra: convenioRegrasAprendidas.tipoRegra,
      confianca: convenioRegrasAprendidas.confianca,
    })
    .from(convenioRegrasAprendidas)
    .where(
      and(
        eq(convenioRegrasAprendidas.tenantId, tenantId),
        eq(convenioRegrasAprendidas.ativa, true),
        gte(convenioRegrasAprendidas.confianca, 0.8),
      )
    )
    .limit(15)

  const rulesContext = regras.length > 0
    ? `\n\nREGRAS APRENDIDAS DESTA CLÍNICA (${regras.length}):\n${regras
        .map((r) => `- [${r.tipoRegra}] ${r.descricao}`)
        .join('\n')}\nConsidere estas regras ao extrair os códigos.`
    : ''

  const input = `Prontuário:\nAnamnese: ${anamnese}\nExame Físico: ${exameFisico}\nConduta: ${conduta}`

  const startTime = Date.now()
  let raw: RawTussExtraction | null = null
  const validationErrors: string[] = []

  try {
    const response = await safeChatCompletion({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + rulesContext },
        { role: 'user', content: input },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      validationErrors.push('Resposta vazia do modelo')
    } else {
      try {
        raw = JSON.parse(content) as RawTussExtraction
      } catch (parseErr) {
        validationErrors.push(`JSON inválido: ${parseErr instanceof Error ? parseErr.message : 'parse error'}`)
      }
    }

    // Validação estrutural (Camadas 1 + 6)
    let validation: ExtractionValidation
    if (raw && raw.procedimentos) {
      validation = await validateTussExtraction({
        cid10_principal: raw.cid10_principal,
        cid10_secundarios: raw.cid10_secundarios,
        procedimentos: raw.procedimentos.map((p) => ({
          tuss: p.tuss,
          descricao: p.descricao,
          quantidade: p.quantidade,
          confianca: p.confianca,
        })),
        confidence: raw.confianca_geral,
      })

      if (validation.summary.invalidTussCodes > 0) {
        validationErrors.push(`${validation.summary.invalidTussCodes} códigos TUSS inválidos`)
      }
      if (!validation.cid10_principal.isValid) {
        validationErrors.push(`CID-10 principal inválido: ${raw.cid10_principal}`)
      }
    } else {
      validation = {
        cid10_principal: { code: '', isValid: false, confianca: 0 },
        cid10_secundarios: [],
        procedimentos: [],
        hasErrors: true,
        requiresReview: true,
        summary: { totalProcedures: 0, validProcedures: 0, invalidTussCodes: 0, lowConfidenceItems: 0 },
      }
    }

    // Camada 7: telemetria
    const inferenceId = await logInference({
      tenantId,
      feature: 'tuss_extraction',
      model: 'gpt-4o',
      input,
      outputSummary: raw ? `${raw.procedimentos.length} procedimentos, CID: ${raw.cid10_principal}` : 'falha',
      confidence: raw?.confianca_geral,
      durationMs: Date.now() - startTime,
      tokensInput: response.usage?.prompt_tokens,
      tokensOutput: response.usage?.completion_tokens,
      validationErrors,
    })

    return {
      raw: raw || {
        cid10_principal: '',
        cid10_secundarios: [],
        procedimentos: [],
        tipo_consulta: 'primeira_consulta',
        confianca_geral: 0,
      },
      validation,
      inferenceId,
      source: 'ai',
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    validationErrors.push(`Erro na API: ${errMsg}`)

    await logInference({
      tenantId,
      feature: 'tuss_extraction',
      model: 'gpt-4o',
      input,
      durationMs: Date.now() - startTime,
      validationErrors,
    })

    return emptyResult('unavailable')
  }
}

function emptyResult(source: 'paused' | 'unavailable'): TussExtractionResult {
  return {
    raw: {
      cid10_principal: '',
      cid10_secundarios: [],
      procedimentos: [],
      tipo_consulta: 'primeira_consulta',
      confianca_geral: 0,
    },
    validation: {
      cid10_principal: { code: '', isValid: false, confianca: 0 },
      cid10_secundarios: [],
      procedimentos: [],
      hasErrors: true,
      requiresReview: true,
      summary: { totalProcedures: 0, validProcedures: 0, invalidTussCodes: 0, lowConfidenceItems: 0 },
    },
    inferenceId: null,
    source,
  }
}
