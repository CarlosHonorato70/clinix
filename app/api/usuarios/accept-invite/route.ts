import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'

interface InvitePayload {
  tenantId: string
  email: string
  role: string
  nome: string
  type: string
}

export async function POST(req: Request) {
  try {
    const { token, senha } = await req.json()

    if (!token || !senha) {
      return Response.json({ error: 'Token e senha são obrigatórios' }, { status: 400 })
    }

    if (senha.length < 8) {
      return Response.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    // Verify invite token
    let payload: InvitePayload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as InvitePayload
    } catch {
      return Response.json({ error: 'Convite expirado ou inválido' }, { status: 401 })
    }

    if (payload.type !== 'invite') {
      return Response.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Check if email is already registered
    const [existing] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, payload.email)).limit(1)
    if (existing) {
      return Response.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    // Create user
    const senhaHash = await hashPassword(senha)
    const [user] = await db.insert(usuarios).values({
      tenantId: payload.tenantId,
      nome: payload.nome,
      email: payload.email,
      senhaHash,
      role: payload.role,
    }).returning()

    // Auto-login
    const tokenPayload = {
      userId: user.id,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    }

    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    const response = Response.json({
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    }, { status: 201 })

    return setAuthCookies(response, accessToken, refreshToken)
  } catch {
    return Response.json({ error: 'Erro ao aceitar convite' }, { status: 500 })
  }
}
