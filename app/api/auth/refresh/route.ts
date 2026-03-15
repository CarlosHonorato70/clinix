import { verifyRefreshToken, signAccessToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('medflow-refresh-token')?.value

    if (!refreshToken) {
      return Response.json({ error: 'Refresh token não encontrado' }, { status: 401 })
    }

    const payload = verifyRefreshToken(refreshToken)
    const accessToken = signAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append(
      'Set-Cookie',
      `medflow-access-token=${accessToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=900`
    )

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch {
    return Response.json({ error: 'Refresh token inválido' }, { status: 401 })
  }
}
