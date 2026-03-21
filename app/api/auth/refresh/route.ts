import { verifyRefreshToken, signAccessToken } from '@/lib/auth/jwt'
import { isTokenBlacklisted } from '@/lib/auth/token-blacklist'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('clinix-refresh-token')?.value

    if (!refreshToken) {
      return Response.json({ error: 'Refresh token não encontrado' }, { status: 401 })
    }

    // Check if token was revoked (e.g. on logout)
    const blacklisted = await isTokenBlacklisted(refreshToken)
    if (blacklisted) {
      return Response.json({ error: 'Sessão encerrada' }, { status: 401 })
    }

    const payload = verifyRefreshToken(refreshToken)

    // Fetch fresh tenant status on refresh
    const [tenant] = await db.select({ status: tenants.status }).from(tenants).where(eq(tenants.id, payload.tenantId)).limit(1)

    const accessToken = signAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      tenantStatus: tenant?.status || 'unknown',
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append(
      'Set-Cookie',
      `clinix-access-token=${accessToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=900`
    )

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch {
    return Response.json({ error: 'Refresh token inválido' }, { status: 401 })
  }
}
