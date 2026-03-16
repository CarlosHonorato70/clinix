import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios, tenants } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'
import { writeAuditLog } from '@/lib/audit/logger'
import { getPlan } from '@/lib/billing/plans'

export const GET = withAuth(async (_req, ctx) => {
  const results = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      role: usuarios.role,
      crm: usuarios.crm,
      especialidade: usuarios.especialidade,
      corAgenda: usuarios.corAgenda,
      ativo: usuarios.ativo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(eq(usuarios.tenantId, ctx.tenantId))
    .orderBy(usuarios.nome)

  return Response.json({ usuarios: results })
}, ['admin'])

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { nome, email, senha, role, crm, especialidade, corAgenda } = body as {
    nome: string
    email: string
    senha: string
    role: string
    crm?: string
    especialidade?: string
    corAgenda?: string
  }

  if (!nome || !email || !senha || !role) {
    return Response.json({ error: 'Campos obrigatórios: nome, email, senha, role' }, { status: 400 })
  }

  const validRoles = ['admin', 'medico', 'faturista', 'recepcionista']
  if (!validRoles.includes(role)) {
    return Response.json({ error: 'Role inválido' }, { status: 400 })
  }

  // Check plan user limit
  const [tenant] = await db.select({ plano: tenants.plano }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1)
  const plan = getPlan(tenant?.plano || 'trial')
  if (plan) {
    const [{ total }] = await db.select({ total: count() }).from(usuarios).where(and(eq(usuarios.tenantId, ctx.tenantId), eq(usuarios.ativo, true)))
    if (plan.limites.usuarios !== -1 && total >= plan.limites.usuarios) {
      return Response.json({ error: `Limite de ${plan.limites.usuarios} usuários atingido. Faça upgrade do plano.` }, { status: 403 })
    }
  }

  // Check email uniqueness
  const [existing] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)).limit(1)
  if (existing) {
    return Response.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  const senhaHash = await hashPassword(senha)
  const [created] = await db.insert(usuarios).values({
    tenantId: ctx.tenantId,
    nome,
    email,
    senhaHash,
    role,
    crm: crm || null,
    especialidade: especialidade || null,
    corAgenda: corAgenda || null,
  }).returning({
    id: usuarios.id,
    nome: usuarios.nome,
    email: usuarios.email,
    role: usuarios.role,
  })

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'usuarios',
    entidadeId: created.id,
    ip: ctx.ip,
  })

  return Response.json({ usuario: created }, { status: 201 })
}, ['admin'])
