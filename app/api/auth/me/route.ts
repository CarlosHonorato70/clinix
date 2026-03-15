import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const [user] = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      role: usuarios.role,
      crm: usuarios.crm,
      especialidade: usuarios.especialidade,
      corAgenda: usuarios.corAgenda,
    })
    .from(usuarios)
    .where(eq(usuarios.id, ctx.userId))
    .limit(1)

  if (!user) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return Response.json({ user })
})
