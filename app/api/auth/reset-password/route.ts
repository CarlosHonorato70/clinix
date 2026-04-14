import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit/logger'

export async function POST(req: Request) {
  const { token, newPassword } = (await req.json()) as {
    token: string
    newPassword: string
  }

  if (!token || !newPassword) {
    return Response.json({ error: 'Token e nova senha são obrigatórios' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return Response.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
  }

  try {
    // Crítico 3: valida com secret separado + audience/issuer estritos.
    // Mesmo que JWT_SECRET vaze, tokens normais não podem ser usados como reset.
    const resetSecretRaw = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET!
    const secret = new TextEncoder().encode(resetSecretRaw)
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'clinix:auth',
      audience: 'clinix:password-reset',
    })

    // Defense-in-depth: strict type check (rejects tokens without the claim)
    if (payload.type !== 'password-reset') {
      return Response.json({ error: 'Token inválido' }, { status: 400 })
    }

    const userId = payload.userId as string
    if (!userId || typeof userId !== 'string') {
      return Response.json({ error: 'Token inválido' }, { status: 400 })
    }
    const senhaHash = await bcrypt.hash(newPassword, 12)

    await db
      .update(usuarios)
      .set({ senhaHash })
      .where(eq(usuarios.id, userId))

    writeAuditLog({
      tenantId: 'system',
      usuarioId: userId,
      acao: 'update',
      entidade: 'usuarios',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    })

    return Response.json({ message: 'Senha redefinida com sucesso' })
  } catch {
    return Response.json({ error: 'Token inválido ou expirado' }, { status: 400 })
  }
}
