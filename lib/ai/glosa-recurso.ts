/**
 * MedFlow — Gerador de Argumentação IA para Recurso de Glosa
 *
 * Usa GPT-4o para gerar texto de contestação baseado no motivo da glosa,
 * regras aprendidas do convênio e histórico de glosas similares.
 */

import { openai, isAIAvailable } from './openai'
import { generateEmbedding } from './embeddings'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas, glosaEmbeddings } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

interface RecursoInput {
  motivoGlosa: string
  codigoGlosa?: string
  pacienteNome: string
  convenioNome: string
  convenioId: string
  tenantId: string
  procedimentos: { codigo: string; descricao: string; valor: number }[]
  cid10?: string
  observacoesMedicas?: string
}

interface RecursoResult {
  argumentacao: string
  fundamentacao: string[]
  probabilidadeAceite: number // 0-100
  fonte: 'ai' | 'template'
}

// ─── Templates de fallback ───────────────────────────────────────────────────

function gerarTemplateFallback(input: RecursoInput): RecursoResult {
  const procs = input.procedimentos.map((p) => `${p.codigo} - ${p.descricao}`).join(', ')
  const valor = input.procedimentos.reduce((s, p) => s + p.valor, 0)

  return {
    argumentacao: [
      `Prezados Senhores,`,
      ``,
      `Venho por meio deste contestar a glosa aplicada aos procedimentos realizados ` +
      `no paciente ${input.pacienteNome}, conforme detalhado abaixo.`,
      ``,
      `Motivo da glosa: ${input.motivoGlosa}`,
      `Procedimentos: ${procs}`,
      `Valor total: R$ ${valor.toFixed(2)}`,
      input.cid10 ? `Diagnóstico (CID-10): ${input.cid10}` : '',
      ``,
      `Os procedimentos foram realizados em conformidade com as diretrizes da ANS ` +
      `e o contrato vigente com ${input.convenioNome}. Solicitamos a reanálise ` +
      `e liberação do pagamento.`,
      ``,
      input.observacoesMedicas ? `Justificativa clínica: ${input.observacoesMedicas}` : '',
      ``,
      `Atenciosamente,`,
    ].filter(Boolean).join('\n'),
    fundamentacao: [
      'RN 501 ANS — Padrão TISS',
      'Contrato vigente com a operadora',
    ],
    probabilidadeAceite: 50,
    fonte: 'template',
  }
}

// ─── Gerador IA ──────────────────────────────────────────────────────────────

export async function gerarArgumentacaoRecurso(input: RecursoInput): Promise<RecursoResult> {
  if (!isAIAvailable()) {
    return gerarTemplateFallback(input)
  }

  // Buscar regras do convênio relevantes
  const regras = await db
    .select({ descricao: convenioRegrasAprendidas.descricao, tipoRegra: convenioRegrasAprendidas.tipoRegra })
    .from(convenioRegrasAprendidas)
    .where(
      and(
        eq(convenioRegrasAprendidas.convenioId, input.convenioId),
        eq(convenioRegrasAprendidas.tenantId, input.tenantId),
        eq(convenioRegrasAprendidas.ativa, true),
        gte(convenioRegrasAprendidas.confianca, 0.5)
      )
    )
    .limit(10)

  // Buscar glosas similares aceitas
  let glosasAceitas: string[] = []
  try {
    const embedding = await generateEmbedding(input.motivoGlosa)
    if (embedding) {
      const similares = await db.execute(sql`
        SELECT texto_glosa, contexto
        FROM glosa_embeddings
        WHERE tenant_id = ${input.tenantId}
          AND convenio_id = ${input.convenioId}
          AND 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.7
        ORDER BY 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) DESC
        LIMIT 3
      `)
      glosasAceitas = (similares as unknown as { texto_glosa: string }[]).map((r) => r.texto_glosa)
    }
  } catch {
    // pgvector not available
  }

  const procs = input.procedimentos.map((p) => `${p.codigo} - ${p.descricao} (R$ ${p.valor.toFixed(2)})`).join('\n')

  try {
    const response = await openai!.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em faturamento de saúde suplementar brasileiro.
Gere um recurso de glosa formal e técnico para contestar a negativa da operadora.

O recurso deve:
1. Ser formal e profissional
2. Citar regulamentações relevantes (RN ANS, Lei dos Planos de Saúde 9.656/98)
3. Fundamentar com evidências clínicas quando aplicável
4. Ser convincente mas objetivo

Retorne JSON: { "argumentacao": "texto completo do recurso", "fundamentacao": ["item1", "item2"], "probabilidadeAceite": 0-100 }`
        },
        {
          role: 'user',
          content: `RECURSO DE GLOSA

Convênio: ${input.convenioNome}
Paciente: ${input.pacienteNome}
Motivo da glosa: ${input.motivoGlosa}
${input.codigoGlosa ? `Código da glosa: ${input.codigoGlosa}` : ''}
Diagnóstico CID-10: ${input.cid10 ?? 'Não informado'}

Procedimentos glosados:
${procs}

${input.observacoesMedicas ? `Observações médicas: ${input.observacoesMedicas}` : ''}

${regras.length > 0 ? `Regras conhecidas deste convênio:\n${regras.map((r) => `- [${r.tipoRegra}] ${r.descricao}`).join('\n')}` : ''}

${glosasAceitas.length > 0 ? `Glosas anteriores similares:\n${glosasAceitas.map((g) => `- ${g.slice(0, 150)}`).join('\n')}` : ''}`
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return gerarTemplateFallback(input)

    const parsed = JSON.parse(content)
    return {
      argumentacao: parsed.argumentacao ?? '',
      fundamentacao: parsed.fundamentacao ?? [],
      probabilidadeAceite: parsed.probabilidadeAceite ?? 50,
      fonte: 'ai',
    }
  } catch {
    return gerarTemplateFallback(input)
  }
}
