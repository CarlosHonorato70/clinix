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
  '/api/tiss/mock/', // Mock SOAP endpoint (server-to-server internal call)
  '/_next',
  '/favicon',
]

const PUBLIC_EXACT = ['/termos', '/privacidade', '/status']

function isPublic(pathname: string) {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p))
}

// M7: Limite de body para mutações API (POST/PUT/PATCH).
// 2 MB é suficiente para qualquer payload JSON legítimo da app
// (prontuários com PDF já sobem via rota separada, não JSON).
// Bloquear cedo evita consumo de memória/banda em ataques de DoS.
const MAX_BODY_BYTES = 2 * 1024 * 1024

// B2: Origens permitidas para CORS explícito. A API é same-origin
// only — listamos apenas nossos domínios e qualquer outra origem
// recebe 403 em preflight. SameSite=Lax já bloqueia a maior parte
// dos ataques CSRF de navegador, mas CORS explícito bloqueia
// requisições fetch() de outras origens em clientes modernos.
const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://clinixproia.com.br',
    'https://app.clinixproia.com.br',
    'https://www.clinixproia.com.br',
  ].filter(Boolean) as string[]
)

function corsHeaders(origin: string | null): HeadersInit {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    }
  }
  return {}
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // B2: CORS preflight — só responde OK para origens explicitamente
  // permitidas. Qualquer outra origem cai num 403 natural pelo browser.
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const headers = corsHeaders(origin)
    return new Response(null, {
      status: Object.keys(headers).length > 0 ? 204 : 403,
      headers,
    })
  }

  // M7: reject API mutations exceeding body limit before touching auth/DB
  if (
    pathname.startsWith('/api/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')
  ) {
    const len = request.headers.get('content-length')
    if (len && parseInt(len, 10) > MAX_BODY_BYTES) {
      return Response.json(
        { error: `Payload muito grande (máx ${MAX_BODY_BYTES} bytes)` },
        { status: 413 }
      )
    }
  }

  const token = request.cookies.get('clinix-access-token')?.value

  // If logged in and visiting login/signup, redirect to dashboard
  if (token && (pathname === '/login' || pathname === '/signup')) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      await jwtVerify(token, secret)
      return NextResponse.redirect(new URL('/agenda', request.url))
    } catch {
      // Token invalid, let them proceed to login
    }
  }

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

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

    // Block suspended/cancelled tenants (redirect pages, 402 for API)
    const tenantStatus = payload.tenantStatus as string | undefined
    if (tenantStatus === 'suspended' || tenantStatus === 'cancelled') {
      if (pathname.startsWith('/api/')) {
        return Response.json(
          { error: 'Assinatura suspensa. Atualize seu plano para continuar.' },
          { status: 402 }
        )
      }
      if (!pathname.startsWith('/configuracoes')) {
        return NextResponse.redirect(new URL('/configuracoes', request.url))
      }
    }

    // Authenticated user on landing page → redirect to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/agenda', request.url))
    }

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
    response.cookies.delete('clinix-access-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)'],
}
