import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { isTokenBlacklisted, blacklistToken } from '@/lib/auth/token-blacklist'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rate-limit'

export async function POST(req: Request) {
  // High: rate limit per IP (10/min) to prevent token replay abuse
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`refresh:${ip}`, RATE_LIMITS.refresh)
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const cookieStore = await cookies()
    const oldRefreshToken = cookieStore.get('clinix-refresh-token')?.value

    if (!oldRefreshToken) {
      return Response.json({ error: 'Refresh token não encontrado' }, { status: 401 })
    }

    // Check if token was revoked (e.g. on logout)
    const blacklisted = await isTokenBlacklisted(oldRefreshToken)
    if (blacklisted) {
      return Response.json({ error: 'Sessão encerrada' }, { status: 401 })
    }

    const payload = verifyRefreshToken(oldRefreshToken)

    // Fetch fresh tenant status on refresh
    const [tenant] = await db
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, payload.tenantId))
      .limit(1)

    const tokenPayload = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      tenantStatus: tenant?.status || 'unknown',
    }

    // High: issue BOTH new access AND new refresh tokens (rotation)
    const newAccessToken = signAccessToken(tokenPayload)
    const newRefreshToken = signRefreshToken(tokenPayload)

    // Blacklist the old refresh token for its remaining lifetime
    // This prevents the old token from being used even though a new one was issued
    await blacklistToken(oldRefreshToken, 7 * 24 * 60 * 60)

    const isProduction = process.env.NODE_ENV === 'production'
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append(
      'Set-Cookie',
      `clinix-access-token=${newAccessToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=900`
    )
    headers.append(
      'Set-Cookie',
      `clinix-refresh-token=${newRefreshToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=604800`
    )

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch {
    return Response.json({ error: 'Refresh token inválido' }, { status: 401 })
  }
}
