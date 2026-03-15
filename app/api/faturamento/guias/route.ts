import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, convenios, consultas, pacientes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const convenioId = url.searchParams.get('convenio_id')

  const conditions = [eq(guiasTiss.tenantId, ctx.tenantId)]
  if (status) conditions.push(eq(guiasTiss.status, status))
  if (convenioId) conditions.push(eq(guiasTiss.convenioId, convenioId))

  const results = await db
    .select({
      id: guiasTiss.id,
      numeroGuia: guiasTiss.numeroGuia,
      status: guiasTiss.status,
      valorFaturado: guiasTiss.valorFaturado,
      valorPago: guiasTiss.valorPago,
      glosMotivo: guiasTiss.glosMotivo,
      auditoriaIa: guiasTiss.auditoriaIa,
      createdAt: guiasTiss.createdAt,
      convenio: {
        id: convenios.id,
        nome: convenios.nome,
      },
      paciente: {
        id: pacientes.id,
        nome: pacientes.nome,
      },
    })
    .from(guiasTiss)
    .leftJoin(convenios, eq(guiasTiss.convenioId, convenios.id))
    .leftJoin(consultas, eq(guiasTiss.consultaId, consultas.id))
    .leftJoin(pacientes, eq(consultas.pacienteId, pacientes.id))
    .where(and(...conditions))
    .orderBy(guiasTiss.createdAt)

  return Response.json({ guias: results })
}, ['admin', 'faturista'])

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { consultaId, convenioId, valorFaturado } = body

  if (!convenioId) {
    return Response.json({ error: 'convenioId é obrigatório' }, { status: 400 })
  }

  // Generate guide number
  const numero = `TISS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  const [created] = await db.insert(guiasTiss).values({
    tenantId: ctx.tenantId,
    consultaId,
    convenioId,
    numeroGuia: numero,
    valorFaturado,
    status: 'pendente_auditoria',
  }).returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'guias_tiss',
    entidadeId: created.id,
    dadosDepois: { convenioId, valorFaturado, numero },
    ip: ctx.ip,
  })

  return Response.json({ guia: created }, { status: 201 })
}, ['admin', 'faturista'])
