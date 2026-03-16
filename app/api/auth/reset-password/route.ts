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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)

    if (payload.type !== 'password-reset') {
      return Response.json({ error: 'Token inválido' }, { status: 400 })
    }

    const userId = payload.userId as string
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
