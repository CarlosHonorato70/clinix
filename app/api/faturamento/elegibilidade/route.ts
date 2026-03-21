import { withAuth } from '@/lib/auth/middleware'
import { verificarElegibilidade } from '@/lib/tiss/elegibilidade'
import { db } from '@/lib/db'
import { convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { carteirinha, convenioId } = body

  if (!carteirinha || !convenioId) {
    return Response.json({ error: 'carteirinha e convenioId são obrigatórios' }, { status: 400 })
  }

  const [convenio] = await db
    .select()
    .from(convenios)
    .where(and(eq(convenios.id, convenioId), eq(convenios.tenantId, user.tenantId)))
    .limit(1)

  if (!convenio) {
    return Response.json({ error: 'Convênio não encontrado' }, { status: 404 })
  }

  const resultado = await verificarElegibilidade({
    carteirinha,
    codigoAns: convenio.codigoAns ?? '',
    cnpjPrestador: '',
    dataAtendimento: new Date().toISOString().slice(0, 10),
    wsdlUrl: undefined,
  })

  return Response.json(resultado)
}, ['admin', 'faturista', 'recepcionista'])
