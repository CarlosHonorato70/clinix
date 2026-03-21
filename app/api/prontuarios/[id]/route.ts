import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { consultas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { consultaUpdateSchema } from '@/lib/validation/schemas'

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

  const result = await validateBody(req, consultaUpdateSchema)
  if (isValidationError(result)) return result

  const [updated] = await db
    .update(consultas)
    .set(result)
    .where(and(eq(consultas.id, id), eq(consultas.tenantId, ctx.tenantId)))
    .returning()

  if (!updated) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ consulta: updated })
}, ['admin', 'medico'])
