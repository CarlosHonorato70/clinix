import { db } from '@/lib/db'
import { usuarios, tenants } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS, isAccountLocked, recordLoginFailure, clearLoginFailures } from '@/lib/security/rate-limit'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { loginSchema } from '@/lib/validation/schemas'
import { writeAuditLog } from '@/lib/audit/logger'

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(`login:${ip}`, RATE_LIMITS.login)
    if (!rl.allowed) return rateLimitResponse(rl)

    const result = await validateBody(req, loginSchema)
    if (isValidationError(result)) return result
    const { email, password } = result

    // Account lockout check
    const locked = await isAccountLocked(email)
    if (locked) {
      return Response.json(
        { error: 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.' },
        { status: 429 }
      )
    }

    const [user] = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, email), eq(usuarios.ativo, true)))
      .limit(1)

    if (!user) {
      await recordLoginFailure(email)
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.senhaHash)
    if (!valid) {
      const { locked: nowLocked } = await recordLoginFailure(email)
      if (nowLocked) {
        return Response.json(
          { error: 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.' },
          { status: 429 }
        )
      }
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Successful login — clear failure counter
    await clearLoginFailures(email)

    // Fetch tenant status for JWT payload
    const [tenant] = await db.select({ status: tenants.status }).from(tenants).where(eq(tenants.id, user.tenantId)).limit(1)

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      tenantStatus: tenant?.status || 'unknown',
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
