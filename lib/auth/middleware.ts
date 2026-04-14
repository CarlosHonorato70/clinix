import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { isTokenBlacklisted } from '@/lib/auth/token-blacklist'

export interface AuthContext {
  userId: string
  tenantId: string
  role: string
  email: string
  ip: string
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext,
) => Promise<Response>

// Cache tenant status for 60s to avoid DB hit on every request
const tenantStatusCache = new Map<string, { status: string; expiresAt: number }>()

/**
 * Invalida o cache de status do tenant. Usado pelo webhook Asaas
 * quando o status muda (active → suspended/cancelled) para que o
 * withAuth não continue autorizando requests por até 60s com base
 * em status stale.
 */
export function invalidateTenantStatusCache(tenantId?: string) {
  if (tenantId) tenantStatusCache.delete(tenantId)
  else tenantStatusCache.clear()
}

async function getTenantStatus(tenantId: string): Promise<string> {
  const cached = tenantStatusCache.get(tenantId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status
  }

  const [tenant] = await db
    .select({ status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  const status = tenant?.status || 'unknown'
  tenantStatusCache.set(tenantId, { status, expiresAt: Date.now() + 60_000 })
  return status
}

/**
 * API route wrapper that reads user context from edge middleware headers.
 * The edge middleware (middleware.ts) validates the JWT and injects these headers.
 * Also checks tenant billing status — suspended tenants get 402 Payment Required.
 */
export function withAuth(handler: AuthenticatedHandler, allowedRoles?: string[]) {
  return async (req: NextRequest) => {
    const userId = req.headers.get('x-user-id')
    const tenantId = req.headers.get('x-tenant-id')
    const role = req.headers.get('x-user-role')
    const email = req.headers.get('x-user-email')

    if (!userId || !tenantId || !role || !email) {
      return Response.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    // Crítico 1: verificar se access token foi revogado (logout)
    const accessToken = req.cookies.get('clinix-access-token')?.value
    if (accessToken && await isTokenBlacklisted(accessToken)) {
      return Response.json({ error: 'Sessão encerrada. Faça login novamente.' }, { status: 401 })
    }

    // Crítico 2: CSRF protection via Origin/Referer check para mutations
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.get('origin')
      const referer = req.headers.get('referer')
      const host = req.headers.get('host')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

      const allowedOrigins = [
        appUrl,
        `https://${host}`,
        `http://${host}`,
        'https://clinixproia.com.br',
        'https://app.clinixproia.com.br',
      ].filter(Boolean)

      const source = origin || referer || ''
      const isAllowed = source === '' || allowedOrigins.some((allowed) => source.startsWith(allowed))

      if (!isAllowed) {
        return Response.json(
          { error: 'Origem não autorizada (CSRF)' },
          { status: 403 }
        )
      }
    }

    if (allowedRoles && !allowedRoles.includes(role) && role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Check tenant billing status
    const status = await getTenantStatus(tenantId)
    if (status === 'suspended') {
      return Response.json(
        { error: 'Assinatura suspensa. Regularize seu pagamento para continuar.' },
        { status: 402 }
      )
    }
    if (status === 'cancelled') {
      return Response.json(
        { error: 'Assinatura cancelada. Entre em contato para reativar.' },
        { status: 402 }
      )
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    return handler(req, { userId, tenantId, role, email, ip })
  }
}
