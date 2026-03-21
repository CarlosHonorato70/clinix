import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '@/lib/auth/password'

/**
 * POST /api/auth/verify-session
 *
 * Verifica a senha do usuário para desbloquear sessão inativa.
 * Não gera novo token — apenas confirma identidade.
 * Usado pelo SessionTimeoutProvider (SBIS NGS1.02.21).
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: 'Senha obrigatória' }, { status: 400 })
  }

  const [usuario] = await db
    .select({ senhaHash: usuarios.senhaHash })
    .from(usuarios)
    .where(eq(usuarios.id, user.userId))
    .limit(1)

  if (!usuario) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const valid = await verifyPassword(password, usuario.senhaHash)
  if (!valid) {
    return Response.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  return Response.json({ ok: true })
})
