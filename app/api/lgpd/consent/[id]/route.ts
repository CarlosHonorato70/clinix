import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { lgpdConsent } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

// Revoke consent (sets revokedAt, does NOT delete)
export const DELETE = withAuth(async (_req, ctx) => {
  const id = _req.url.split('/').pop()!

  const [existing] = await db
    .select()
    .from(lgpdConsent)
    .where(and(eq(lgpdConsent.id, id), eq(lgpdConsent.tenantId, ctx.tenantId)))
    .limit(1)

  if (!existing) {
    return Response.json({ error: 'Consentimento não encontrado' }, { status: 404 })
  }

  const [updated] = await db
    .update(lgpdConsent)
    .set({ revokedAt: new Date() })
    .where(eq(lgpdConsent.id, id))
    .returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'update',
    entidade: 'lgpd_consent',
    entidadeId: id,
    dadosAntes: { revokedAt: null },
    dadosDepois: { revokedAt: updated.revokedAt },
    ip: ctx.ip,
  })

  return Response.json({ consent: updated })
}, ['admin'])
