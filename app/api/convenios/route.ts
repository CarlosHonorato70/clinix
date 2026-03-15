import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (_req, ctx) => {
  const list = await db
    .select()
    .from(convenios)
    .where(
      and(
        eq(convenios.tenantId, ctx.tenantId),
        eq(convenios.ativo, true),
      )
    )

  return Response.json({ convenios: list })
})
