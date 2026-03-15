import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const doctors = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      crm: usuarios.crm,
      especialidade: usuarios.especialidade,
      corAgenda: usuarios.corAgenda,
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.tenantId, ctx.tenantId),
        eq(usuarios.role, 'medico'),
        eq(usuarios.ativo, true),
      )
    )

  return Response.json({ doctors })
})
