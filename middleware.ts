import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PREFIX = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/billing/webhook',
  '/api/tenants',
  '/api/health',
  '/_next',
  '/favicon',
]

const PUBLIC_EXACT = ['/', '/termos', '/privacidade']

function isPublic(pathname: string) {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('medflow-access-token')?.value

  if (!token) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Token não fornecido' }, { status: 401 })
    }
    // Pages → redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)

    // Inject user context as headers for downstream API routes
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-tenant-id', payload.tenantId as string)
    response.headers.set('x-user-role', payload.role as string)
    response.headers.set('x-user-email', payload.email as string)
    return response
  } catch {
    // Token expired or invalid
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }
    // Clear invalid cookie and redirect
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('medflow-access-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
