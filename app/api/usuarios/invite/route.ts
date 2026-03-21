import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios, tenants } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getPlan } from '@/lib/billing/plans'
import { sendInviteEmail } from '@/lib/email/resend'
import { writeAuditLog } from '@/lib/audit/logger'
import jwt from 'jsonwebtoken'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { email, role, nome } = body as { email: string; role: string; nome: string }

  if (!email || !role || !nome) {
    return Response.json({ error: 'email, role e nome são obrigatórios' }, { status: 400 })
  }

  const validRoles = ['admin', 'medico', 'faturista', 'recepcionista']
  if (!validRoles.includes(role)) {
    return Response.json({ error: 'Role inválido' }, { status: 400 })
  }

  // Check plan user limit
  const [tenant] = await db.select({ plano: tenants.plano, nome: tenants.nome }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1)
  const plan = getPlan(tenant?.plano || 'trial')
  if (plan) {
    const [{ total }] = await db.select({ total: count() }).from(usuarios).where(and(eq(usuarios.tenantId, ctx.tenantId), eq(usuarios.ativo, true)))
    if (plan.limites.usuarios !== -1 && total >= plan.limites.usuarios) {
      return Response.json({ error: `Limite de ${plan.limites.usuarios} usuários atingido.` }, { status: 403 })
    }
  }

  // Check email uniqueness
  const [existing] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)).limit(1)
  if (existing) {
    return Response.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  // Create invite token (24h TTL)
  const inviteToken = jwt.sign(
    { tenantId: ctx.tenantId, email, role, nome, type: 'invite' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  )

  // Get inviter name
  const [inviter] = await db.select({ nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, ctx.userId)).limit(1)

  // Send invite email (fire-and-forget with error handling)
  sendInviteEmail(email, inviter?.nome ?? 'Admin', tenant?.nome ?? 'Clinix', inviteToken).catch(() => {})

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'invite',
    dadosDepois: { email, role, nome },
    ip: ctx.ip,
  })

  return Response.json({ message: 'Convite enviado com sucesso' }, { status: 201 })
}, ['admin'])
