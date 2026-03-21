import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { regraUpdateSchema } from '@/lib/validation/schemas'

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const result = await validateBody(req, regraUpdateSchema)
  if (isValidationError(result)) return result

  const [updated] = await db
    .update(convenioRegrasAprendidas)
    .set({ ...result, updatedAt: new Date() })
    .where(
      and(
        eq(convenioRegrasAprendidas.id, id),
        eq(convenioRegrasAprendidas.tenantId, ctx.tenantId),
      )
    )
    .returning()

  if (!updated) return Response.json({ error: 'Regra não encontrada' }, { status: 404 })
  return Response.json({ regra: updated })
}, ['admin', 'faturista'])
