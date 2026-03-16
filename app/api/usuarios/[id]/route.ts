import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

export const PUT = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()!

  const body = await req.json()
  const { nome, role, crm, especialidade, corAgenda, ativo } = body as {
    nome?: string
    role?: string
    crm?: string
    especialidade?: string
    corAgenda?: string
    ativo?: boolean
  }

  // Verify user belongs to tenant
  const [user] = await db
    .select({ id: usuarios.id, tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.tenantId, ctx.tenantId)))
    .limit(1)

  if (!user) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Prevent admin from deactivating themselves
  if (id === ctx.userId && ativo === false) {
    return Response.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (nome !== undefined) updates.nome = nome
  if (role !== undefined) {
    const validRoles = ['admin', 'medico', 'faturista', 'recepcionista']
    if (!validRoles.includes(role)) {
      return Response.json({ error: 'Role inválido' }, { status: 400 })
    }
    updates.role = role
  }
  if (crm !== undefined) updates.crm = crm
  if (especialidade !== undefined) updates.especialidade = especialidade
  if (corAgenda !== undefined) updates.corAgenda = corAgenda
  if (ativo !== undefined) updates.ativo = ativo

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const [updated] = await db
    .update(usuarios)
    .set(updates)
    .where(eq(usuarios.id, id))
    .returning({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      role: usuarios.role,
      ativo: usuarios.ativo,
    })

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'update',
    entidade: 'usuarios',
    entidadeId: id,
    ip: ctx.ip,
  })

  return Response.json({ usuario: updated })
}, ['admin'])

export const DELETE = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop()!

  if (id === ctx.userId) {
    return Response.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
  }

  const [user] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.tenantId, ctx.tenantId)))
    .limit(1)

  if (!user) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Soft delete — just deactivate
  await db.update(usuarios).set({ ativo: false }).where(eq(usuarios.id, id))

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'delete',
    entidade: 'usuarios',
    entidadeId: id,
    ip: ctx.ip,
  })

  return Response.json({ ok: true })
}, ['admin'])
