import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { consultas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [record] = await db
    .select()
    .from(consultas)
    .where(and(eq(consultas.id, id), eq(consultas.tenantId, ctx.tenantId)))
    .limit(1)

  if (!record) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ consulta: record })
}, ['admin', 'medico'])

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!
  const body = await req.json()

  const [updated] = await db
    .update(consultas)
    .set(body)
    .where(and(eq(consultas.id, id), eq(consultas.tenantId, ctx.tenantId)))
    .returning()

  if (!updated) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ consulta: updated })
}, ['admin', 'medico'])
