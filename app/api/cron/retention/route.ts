/**
 * Retention cron — purga dados antigos periodicamente.
 *
 * Cron externo (ou `docker exec clinix-app wget -qO- --header "x-cron-secret: ..." http://127.0.0.1:3000/api/cron/retention`)
 * deve chamar este endpoint diariamente.
 *
 * Retenção atual:
 * - ai_inference_log: 90 dias (M2). Logs de inferência IA servem para
 *   detecção de alucinação e auditoria de qualidade; depois de 90 dias
 *   o valor diminui e o custo de armazenamento cresce.
 *
 * Proteção: header x-cron-secret deve bater com CRON_SECRET.
 */

import { db } from '@/lib/db'
import { aiInferenceLog } from '@/lib/db/schema/ai-inference-log'
import { lt } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const result = await db
      .delete(aiInferenceLog)
      .where(lt(aiInferenceLog.createdAt, cutoff))
      .returning({ id: aiInferenceLog.id })

    const deleted = result.length
    logger.info({ deleted, cutoff: cutoff.toISOString() }, '[Cron] AI log retention purge')

    return Response.json({ ok: true, deleted, cutoff: cutoff.toISOString() })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      '[Cron] Retention purge failed'
    )
    return Response.json({ error: 'Retention purge failed' }, { status: 500 })
  }
}

export { POST as GET }
