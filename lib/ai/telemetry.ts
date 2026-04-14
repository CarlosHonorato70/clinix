/**
 * Clinix — Telemetria de IA para detecção de alucinações
 *
 * Camada 7 da defesa. Registra toda inferência de IA para:
 * - Calcular taxa de rejeição humana
 * - Identificar features com alta taxa de erro
 * - Pausar features automaticamente se taxa de erro > threshold
 * - Compliance LGPD (transparência sobre decisões automatizadas)
 */

import crypto from 'crypto'
import { db } from '@/lib/db'
import { aiInferenceLog } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export type AiFeature = 'tuss_extraction' | 'agent_chat' | 'glosa_recurso'

export interface LogInferenceParams {
  tenantId: string | null
  feature: AiFeature
  model: string
  input: string
  outputSummary?: string
  confidence?: number
  durationMs: number
  tokensInput?: number
  tokensOutput?: number
  validationErrors?: string[]
}

/**
 * Registra uma inferência de IA no banco. Não bloqueia o caller em caso de erro.
 */
export async function logInference(params: LogInferenceParams): Promise<string | null> {
  try {
    const inputHash = crypto.createHash('sha256').update(params.input).digest('hex')

    const [inserted] = await db
      .insert(aiInferenceLog)
      .values({
        tenantId: params.tenantId,
        feature: params.feature,
        model: params.model,
        inputHash,
        outputSummary: params.outputSummary?.slice(0, 500) ?? null,
        confidence: params.confidence ?? null,
        durationMs: params.durationMs,
        tokensInput: params.tokensInput ?? null,
        tokensOutput: params.tokensOutput ?? null,
        validationErrors: params.validationErrors ?? null,
        hasErrors: (params.validationErrors?.length ?? 0) > 0,
      })
      .returning({ id: aiInferenceLog.id })

    return inserted?.id ?? null
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), feature: params.feature },
      '[AI Telemetry] Failed to log inference'
    )
    return null
  }
}

/**
 * Registra o feedback humano (aceito/rejeitado) para uma inferência anterior.
 */
export async function recordHumanReview(
  inferenceId: string,
  accepted: boolean,
  comment?: string
): Promise<void> {
  try {
    await db
      .update(aiInferenceLog)
      .set({
        humanReviewed: true,
        humanAccepted: accepted,
        humanComment: comment ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(aiInferenceLog.id, inferenceId))
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), inferenceId },
      '[AI Telemetry] Failed to record human review'
    )
  }
}

/**
 * Calcula métricas de qualidade da IA para uma feature.
 * Usado pelo endpoint de monitoramento e pelo circuit breaker.
 */
export async function getFeatureMetrics(
  feature: AiFeature,
  sinceHours = 24
): Promise<{
  totalInferences: number
  errorRate: number
  rejectionRate: number
  avgConfidence: number
  avgDurationMs: number
}> {
  const since = new Date()
  since.setHours(since.getHours() - sinceHours)

  const [metrics] = await db
    .select({
      total: sql<number>`count(*)::int`,
      errors: sql<number>`count(case when ${aiInferenceLog.hasErrors} = true then 1 end)::int`,
      rejected: sql<number>`count(case when ${aiInferenceLog.humanAccepted} = false then 1 end)::int`,
      reviewed: sql<number>`count(case when ${aiInferenceLog.humanReviewed} = true then 1 end)::int`,
      avgConfidence: sql<number>`coalesce(avg(${aiInferenceLog.confidence}), 0)::real`,
      avgDuration: sql<number>`coalesce(avg(${aiInferenceLog.durationMs}), 0)::int`,
    })
    .from(aiInferenceLog)
    .where(
      and(
        eq(aiInferenceLog.feature, feature),
        gte(aiInferenceLog.createdAt, since),
      )
    )

  const total = metrics?.total ?? 0
  const errorRate = total > 0 ? (metrics.errors / total) : 0
  const rejectionRate = metrics?.reviewed > 0 ? (metrics.rejected / metrics.reviewed) : 0

  return {
    totalInferences: total,
    errorRate,
    rejectionRate,
    avgConfidence: metrics?.avgConfidence ?? 0,
    avgDurationMs: metrics?.avgDuration ?? 0,
  }
}

/**
 * Circuit breaker: verifica se a feature deve ser pausada.
 * Returns true if the feature should be disabled due to high error/rejection rate.
 */
export async function shouldPauseFeature(feature: AiFeature): Promise<boolean> {
  const metrics = await getFeatureMetrics(feature, 1) // última hora

  // Precisa de pelo menos 10 inferências para avaliar
  if (metrics.totalInferences < 10) return false

  // Pausa se taxa de rejeição humana > 50% OU taxa de erros estruturais > 30%
  if (metrics.rejectionRate > 0.5) {
    logger.warn({ feature, metrics }, '[AI Telemetry] Feature should be paused (high rejection rate)')
    return true
  }
  if (metrics.errorRate > 0.3) {
    logger.warn({ feature, metrics }, '[AI Telemetry] Feature should be paused (high error rate)')
    return true
  }

  return false
}
