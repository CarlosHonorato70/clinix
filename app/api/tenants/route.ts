import { db } from '@/lib/db'
import { tenants, usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rate-limit'
import { sendWelcomeEmail } from '@/lib/email/resend'

export async function POST(req: Request) {
  try {
    // Rate limit signups
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(`signup:${ip}`, { max: 3, windowSec: 3600 })
    if (!rl.allowed) return rateLimitResponse(rl)

    const { nomeClinica, subdominio, nomeAdmin, email, senha } = await req.json()

    if (!nomeClinica || !subdominio || !nomeAdmin || !email || !senha) {
      return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (senha.length < 8) {
      return Response.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    // Check subdomain uniqueness
    const [existing] = await db.select().from(tenants).where(eq(tenants.subdominio, subdominio)).limit(1)
    if (existing) {
      return Response.json({ error: 'Subdomínio já está em uso' }, { status: 409 })
    }

    // Check email uniqueness
    const [existingUser] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
    if (existingUser) {
      return Response.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    // Create tenant with 14-day trial
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    const [tenant] = await db.insert(tenants).values({
      nome: nomeClinica,
      subdominio,
      plano: 'trial',
      status: 'trial',
      trialEndsAt: trialEnd,
    }).returning()

    // Create admin user
    const senhaHash = await hashPassword(senha)
    const [user] = await db.insert(usuarios).values({
      tenantId: tenant.id,
      nome: nomeAdmin,
      email,
      senhaHash,
      role: 'admin',
    }).returning()

    // Auto-login
    const payload = {
      userId: user.id,
      tenantId: tenant.id,
      role: 'admin',
      email: user.email,
      tenantStatus: 'trial',
    }

    // Fire-and-forget welcome email
    sendWelcomeEmail(email, nomeClinica, nomeAdmin).catch(() => {})

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    const response = Response.json({
      tenant: { id: tenant.id, nome: tenant.nome, subdominio: tenant.subdominio },
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    }, { status: 201 })

    return setAuthCookies(response, accessToken, refreshToken)
  } catch {
    return Response.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
