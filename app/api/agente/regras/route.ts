import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas, convenios } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const convenioId = url.searchParams.get('convenio_id')

  const conditions = [eq(convenioRegrasAprendidas.tenantId, ctx.tenantId)]
  if (convenioId) conditions.push(eq(convenioRegrasAprendidas.convenioId, convenioId))

  const results = await db
    .select({
      id: convenioRegrasAprendidas.id,
      tipoRegra: convenioRegrasAprendidas.tipoRegra,
      descricao: convenioRegrasAprendidas.descricao,
      confianca: convenioRegrasAprendidas.confianca,
      confirmacoes: convenioRegrasAprendidas.confirmacoes,
      rejeicoes: convenioRegrasAprendidas.rejeicoes,
      confirmadaPorHumano: convenioRegrasAprendidas.confirmadaPorHumano,
      origem: convenioRegrasAprendidas.origem,
      ativa: convenioRegrasAprendidas.ativa,
      tussCodigo: convenioRegrasAprendidas.tussCodigo,
      cidCodigo: convenioRegrasAprendidas.cidCodigo,
      convenio: {
        id: convenios.id,
        nome: convenios.nome,
      },
    })
    .from(convenioRegrasAprendidas)
    .leftJoin(convenios, eq(convenioRegrasAprendidas.convenioId, convenios.id))
    .where(and(...conditions))
    .orderBy(desc(convenioRegrasAprendidas.confianca))

  return Response.json({ regras: results })
}, ['admin', 'faturista'])
