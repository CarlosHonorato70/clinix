import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { agendamentos } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { agendamentoUpdateSchema } from '@/lib/validation/schemas'

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

  const result = await validateBody(req, agendamentoUpdateSchema)
  if (isValidationError(result)) return result

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dataHora, ...rest } = result
  const updateData: Record<string, unknown> = { ...rest }
  if (dataHora) updateData.dataHora = new Date(dataHora)

  const [updated] = await db
    .update(agendamentos)
    .set(updateData as typeof agendamentos.$inferInsert)
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
