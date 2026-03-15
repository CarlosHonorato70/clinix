import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { lgpdConsent } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const pacienteId = url.searchParams.get('paciente_id')

  if (!pacienteId) {
    return Response.json({ error: 'paciente_id obrigatório' }, { status: 400 })
  }

  const consents = await db
    .select()
    .from(lgpdConsent)
    .where(and(
      eq(lgpdConsent.tenantId, ctx.tenantId),
      eq(lgpdConsent.pacienteId, pacienteId),
    ))
    .orderBy(lgpdConsent.createdAt)

  return Response.json({ consents })
}, ['admin'])

export const POST = withAuth(async (req, ctx) => {
  const { pacienteId, tipo, aceito, versaoTermo } = await req.json()

  if (!pacienteId || !tipo || aceito === undefined || !versaoTermo) {
    return Response.json({ error: 'Campos obrigatórios: pacienteId, tipo, aceito, versaoTermo' }, { status: 400 })
  }

  const [created] = await db.insert(lgpdConsent).values({
    tenantId: ctx.tenantId,
    pacienteId,
    tipo,
    aceito,
    versaoTermo,
    ipOrigem: ctx.ip,
  }).returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'lgpd_consent',
    entidadeId: created.id,
    dadosDepois: { pacienteId, tipo, aceito, versaoTermo },
    ip: ctx.ip,
  })

  return Response.json({ consent: created }, { status: 201 })
}, ['admin'])
