import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rate-limit'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { loginSchema } from '@/lib/validation/schemas'
import { writeAuditLog } from '@/lib/audit/logger'

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.login)
    if (!rl.allowed) return rateLimitResponse(rl)

    const result = await validateBody(req, loginSchema)
    if (isValidationError(result)) return result
    const { email, password } = result

    const [user] = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, email), eq(usuarios.ativo, true)))
      .limit(1)

    if (!user) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.senhaHash)
    if (!valid) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    const response = Response.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        crm: user.crm,
        especialidade: user.especialidade,
        corAgenda: user.corAgenda,
      },
    })

    // Audit log
    writeAuditLog({
      tenantId: user.tenantId,
      usuarioId: user.id,
      acao: 'login',
      entidade: 'usuarios',
      entidadeId: user.id,
      ip,
    })

    return setAuthCookies(response, accessToken, refreshToken)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
