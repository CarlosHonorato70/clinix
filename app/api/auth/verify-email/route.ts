import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface VerifyPayload {
  userId: string
  email: string
  type: string
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 })
    }

    let payload: VerifyPayload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as VerifyPayload
    } catch {
      return Response.json({ error: 'Token expirado ou inválido' }, { status: 401 })
    }

    if (payload.type !== 'email-verify') {
      return Response.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Mark email as verified
    await db
      .update(usuarios)
      .set({ emailVerificado: true })
      .where(eq(usuarios.id, payload.userId))

    return Response.json({ message: 'Email verificado com sucesso' })
  } catch {
    return Response.json({ error: 'Erro ao verificar email' }, { status: 500 })
  }
}
