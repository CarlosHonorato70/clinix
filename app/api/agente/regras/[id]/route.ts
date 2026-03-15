import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!
  const body = await req.json()

  const [updated] = await db
    .update(convenioRegrasAprendidas)
    .set({ ...body, updatedAt: new Date() })
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
