import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { guiaUpdateSchema } from '@/lib/validation/schemas'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [guia] = await db
    .select()
    .from(guiasTiss)
    .where(and(eq(guiasTiss.id, id), eq(guiasTiss.tenantId, ctx.tenantId)))
    .limit(1)

  if (!guia) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ guia })
}, ['admin', 'faturista'])

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const result = await validateBody(req, guiaUpdateSchema)
  if (isValidationError(result)) return result

  const [updated] = await db
    .update(guiasTiss)
    .set(result)
    .where(and(eq(guiasTiss.id, id), eq(guiasTiss.tenantId, ctx.tenantId)))
    .returning()

  if (!updated) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ guia: updated })
}, ['admin', 'faturista'])
