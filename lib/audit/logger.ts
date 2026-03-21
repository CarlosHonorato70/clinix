import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { logger } from '@/lib/logging/logger'

interface AuditParams {
  tenantId: string
  usuarioId: string | null
  acao: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'erasure'
  entidade: string
  entidadeId?: string | null
  dadosAntes?: unknown
  dadosDepois?: unknown
  ip: string
}

/**
 * Writes an audit log entry. Fire-and-forget — never blocks the caller.
 * Logs errors instead of silently swallowing them.
 */
export function writeAuditLog(params: AuditParams): void {
  db.insert(auditLog)
    .values({
      tenantId: params.tenantId,
      usuarioId: params.usuarioId,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      dadosAntes: params.dadosAntes ?? null,
      dadosDepois: params.dadosDepois ?? null,
      ip: params.ip,
    })
    .catch((err) => {
      logger.error(
        {
          err: err instanceof Error ? err.message : String(err),
          audit: {
            acao: params.acao,
            entidade: params.entidade,
            entidadeId: params.entidadeId,
            tenantId: params.tenantId,
          },
        },
        'Failed to write audit log entry'
      )
    })
}
