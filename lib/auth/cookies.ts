const isProduction = process.env.NODE_ENV === 'production'

export function setAuthCookies(response: Response, accessToken: string, refreshToken: string): Response {
  const headers = new Headers(response.headers)

  headers.append(
    'Set-Cookie',
    `clinix-access-token=${accessToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=900`
  )

  headers.append(
    'Set-Cookie',
    `clinix-refresh-token=${refreshToken}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/api/auth/refresh; Max-Age=604800`
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function clearAuthCookies(): Response {
  const headers = new Headers()

  headers.append(
    'Set-Cookie',
    `clinix-access-token=; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`
  )

  headers.append(
    'Set-Cookie',
    `clinix-refresh-token=; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/api/auth/refresh; Max-Age=0`
  )

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  })
}
