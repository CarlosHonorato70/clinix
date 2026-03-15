import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { agendamentos } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [appt] = await db
    .select()
    .from(agendamentos)
    .where(and(eq(agendamentos.id, id), eq(agendamentos.tenantId, ctx.tenantId)))
    .limit(1)

  if (!appt) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ agendamento: appt })
}, ['admin', 'medico', 'recepcionista'])

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!
  const body = await req.json()

  const [updated] = await db
    .update(agendamentos)
    .set(body)
    .where(and(eq(agendamentos.id, id), eq(agendamentos.tenantId, ctx.tenantId)))
    .returning()

  if (!updated) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ agendamento: updated })
}, ['admin', 'medico', 'recepcionista'])

export const DELETE = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [cancelled] = await db
    .update(agendamentos)
    .set({ status: 'cancelado' })
    .where(and(eq(agendamentos.id, id), eq(agendamentos.tenantId, ctx.tenantId)))
    .returning()

  if (!cancelled) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ agendamento: cancelled })
}, ['admin', 'medico', 'recepcionista'])
