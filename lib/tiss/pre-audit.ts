/**
 * MedFlow — Motor de Pré-Auditoria IA
 *
 * Analisa guias contra regras aprendidas do convênio, tabela TUSS,
 * e histórico de glosas antes do envio à operadora.
 */

import { db } from '@/lib/db'
import { tuss, convenioRegrasAprendidas, glosaEmbeddings } from '@/lib/db/schema'
import { eq, and, gte, isNull, or, sql } from 'drizzle-orm'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { validarGuia, type ValidationResult } from './xml-validator'
import type { DadosGuia, Beneficiario, Prestador } from './xml-builder'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditAlert {
  tipo: 'regra_convenio' | 'tuss_invalido' | 'duplicidade' | 'glosa_similar' | 'validacao'
  severidade: 'bloqueio' | 'alerta' | 'info'
  mensagem: string
  detalhe?: string
  confianca?: number
  codigoGlosa?: string
}

export interface AuditResult {
  aprovado: boolean
  alertas: AuditAlert[]
  bloqueios: AuditAlert[]
  sugestoes: string[]
  validacaoXML: ValidationResult
  score: number // 0-100 — probabilidade de aprovação
}

// ─── Check TUSS validity ─────────────────────────────────────────────────────

async function checkTussValidity(codigosTuss: string[]): Promise<AuditAlert[]> {
  const alerts: AuditAlert[] = []

  for (const codigo of codigosTuss) {
    const [found] = await db
      .select()
      .from(tuss)
      .where(eq(tuss.codigo, codigo))
      .limit(1)

    if (!found) {
      alerts.push({
        tipo: 'tuss_invalido',
        severidade: 'bloqueio',
        mensagem: `Código TUSS ${codigo} não encontrado na tabela`,
        codigoGlosa: '1010',
      })
    } else if (found.vigenciaFim && new Date(found.vigenciaFim) < new Date()) {
      alerts.push({
        tipo: 'tuss_invalido',
        severidade: 'bloqueio',
        mensagem: `Código TUSS ${codigo} fora de vigência (expirou em ${found.vigenciaFim})`,
        codigoGlosa: '1010',
      })
    }
  }

  return alerts
}

// ─── Check convenio rules ────────────────────────────────────────────────────

async function checkConvenioRules(
  convenioId: string,
  tenantId: string,
  codigosTuss: string[],
  cid10: string | undefined
): Promise<AuditAlert[]> {
  const alerts: AuditAlert[] = []

  // Fetch active rules with confidence >= 0.7
  const regras = await db
    .select()
    .from(convenioRegrasAprendidas)
    .where(
      and(
        eq(convenioRegrasAprendidas.convenioId, convenioId),
        eq(convenioRegrasAprendidas.tenantId, tenantId),
        eq(convenioRegrasAprendidas.ativa, true),
        gte(convenioRegrasAprendidas.confianca, 0.7)
      )
    )

  for (const regra of regras) {
    // Check TUSS-specific rules
    if (regra.tussCodigo && codigosTuss.includes(regra.tussCodigo)) {
      alerts.push({
        tipo: 'regra_convenio',
        severidade: regra.confianca >= 0.9 ? 'bloqueio' : 'alerta',
        mensagem: regra.descricao,
        detalhe: `Regra aprendida para TUSS ${regra.tussCodigo} — ${regra.tipoRegra}`,
        confianca: regra.confianca,
      })
    }

    // Check CID-specific rules
    if (regra.cidCodigo && cid10 && cid10.startsWith(regra.cidCodigo)) {
      alerts.push({
        tipo: 'regra_convenio',
        severidade: 'alerta',
        mensagem: regra.descricao,
        detalhe: `Regra aprendida para CID ${regra.cidCodigo}`,
        confianca: regra.confianca,
      })
    }
  }

  return alerts
}

// ─── Check similar glosas (semantic search) ──────────────────────────────────

async function checkSimilarGlosas(
  tenantId: string,
  convenioId: string,
  descricaoProcedimentos: string
): Promise<AuditAlert[]> {
  const alerts: AuditAlert[] = []

  const embedding = await generateEmbedding(descricaoProcedimentos)
  if (!embedding) return alerts

  // Cosine similarity search via pgvector
  try {
    const similares = await db.execute(sql`
      SELECT texto_glosa, contexto,
             1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM glosa_embeddings
      WHERE tenant_id = ${tenantId}
        AND (convenio_id = ${convenioId} OR convenio_id IS NULL)
        AND 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.75
      ORDER BY similarity DESC
      LIMIT 3
    `)

    for (const row of similares as unknown as { texto_glosa: string; similarity: number }[]) {
      const r = row
      alerts.push({
        tipo: 'glosa_similar',
        severidade: 'alerta',
        mensagem: `Glosa anterior similar encontrada (${Math.round(r.similarity * 100)}% similaridade)`,
        detalhe: r.texto_glosa?.slice(0, 200),
        confianca: r.similarity,
      })
    }
  } catch {
    // pgvector not available or no embeddings yet — silently skip
  }

  return alerts
}

// ─── Motor principal de pré-auditoria ────────────────────────────────────────

export async function preAuditGuia(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario,
  convenioId: string,
  tenantId: string
): Promise<AuditResult> {
  // 1. Validação estrutural
  const validacaoXML = validarGuia(guia, prestador, beneficiario)

  // 2. Checagens assíncronas em paralelo
  const codigosTuss = guia.procedimentos.map((p) => p.codigoTuss)
  const descricao = guia.procedimentos.map((p) => `${p.codigoTuss} ${p.descricao}`).join('; ')

  const [tussAlerts, ruleAlerts, glosaAlerts] = await Promise.all([
    checkTussValidity(codigosTuss),
    checkConvenioRules(convenioId, tenantId, codigosTuss, guia.cid10Principal),
    checkSimilarGlosas(tenantId, convenioId, descricao),
  ])

  // 3. Combinar todos os alertas
  const allAlerts: AuditAlert[] = [
    ...tussAlerts,
    ...ruleAlerts,
    ...glosaAlerts,
    // Add XML validation issues as alerts
    ...validacaoXML.erros.map((e) => ({
      tipo: 'validacao' as const,
      severidade: 'bloqueio' as const,
      mensagem: e.mensagem,
      detalhe: e.campo,
      codigoGlosa: e.codigoGlosa,
    })),
    ...validacaoXML.avisos.map((a) => ({
      tipo: 'validacao' as const,
      severidade: 'alerta' as const,
      mensagem: a.mensagem,
      detalhe: a.campo,
      codigoGlosa: a.codigoGlosa,
    })),
  ]

  const bloqueios = allAlerts.filter((a) => a.severidade === 'bloqueio')
  const alertas = allAlerts.filter((a) => a.severidade !== 'bloqueio')

  // 4. Score: 100 base, -30 per block, -10 per alert, -5 per glosa similar
  let score = 100
  score -= bloqueios.length * 30
  score -= alertas.filter((a) => a.severidade === 'alerta').length * 10
  score -= glosaAlerts.length * 5
  score = Math.max(0, Math.min(100, score))

  // 5. Sugestões
  const sugestoes: string[] = []
  if (bloqueios.some((b) => b.codigoGlosa === '1010')) {
    sugestoes.push('Verifique os códigos TUSS na tabela atualizada da ANS.')
  }
  if (bloqueios.some((b) => b.codigoGlosa === '1818')) {
    sugestoes.push('Obtenha autorização prévia antes do envio.')
  }
  if (alertas.some((a) => a.codigoGlosa === '1018')) {
    sugestoes.push('Envie a guia o mais rápido possível para evitar glosa por prazo.')
  }
  if (glosaAlerts.length > 0) {
    sugestoes.push('Revise procedimentos com histórico de glosa neste convênio.')
  }
  if (alertas.some((a) => a.codigoGlosa === '1020')) {
    sugestoes.push('Verifique possível duplicidade de cobrança.')
  }

  return {
    aprovado: bloqueios.length === 0,
    alertas,
    bloqueios,
    sugestoes,
    validacaoXML,
    score,
  }
}
