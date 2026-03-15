import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'

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
 * Silently swallows errors to avoid breaking the primary operation.
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
    .catch(() => {
      // Silently fail — audit logging must never break the main flow
    })
}
