import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { sendPasswordResetEmail } from '@/lib/email/resend'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Rate limit: same as login (5 req/15min per IP)
  const rl = await checkRateLimit(`forgot:${ip}`, RATE_LIMITS.login)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { email } = (await req.json()) as { email: string }

  if (!email) {
    return Response.json({ error: 'Email obrigatório' }, { status: 400 })
  }

  // Always return success to prevent email enumeration
  const successResponse = Response.json({
    message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
  })

  try {
    const [user] = await db
      .select({ id: usuarios.id, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.email, email.toLowerCase()))
      .limit(1)

    if (!user) return successResponse

    // Generate reset token (1h expiry)
    // Crítico 3: uses separate secret + strict audience/issuer validation
    // to prevent reuse of regular access tokens as password reset tokens.
    const resetSecretRaw = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET!
    const secret = new TextEncoder().encode(resetSecretRaw)
    const resetToken = await new SignJWT({ userId: user.id, type: 'password-reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('clinix:auth')
      .setAudience('clinix:password-reset')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)

    await sendPasswordResetEmail(user.email, resetToken)
  } catch (error) {
    // Log but don't expose error to user
    console.error('Forgot password error:', error)
  }

  return successResponse
}
