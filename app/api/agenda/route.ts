import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { agendamentos, pacientes, convenios, usuarios } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { parseDateRange } from '@/lib/api/helpers'
import { writeAuditLog } from '@/lib/audit/logger'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const medicoId = url.searchParams.get('medico_id')
  const { startDate, endDate } = parseDateRange(url.searchParams)

  const conditions = [eq(agendamentos.tenantId, ctx.tenantId)]

  // Medicos can only see their own agenda
  if (ctx.role === 'medico') {
    conditions.push(eq(agendamentos.medicoId, ctx.userId))
  } else if (medicoId) {
    conditions.push(eq(agendamentos.medicoId, medicoId))
  }

  if (startDate) conditions.push(gte(agendamentos.dataHora, startDate))
  if (endDate) conditions.push(lte(agendamentos.dataHora, endDate))

  const results = await db
    .select({
      id: agendamentos.id,
      dataHora: agendamentos.dataHora,
      duracaoMin: agendamentos.duracaoMin,
      tipo: agendamentos.tipo,
      status: agendamentos.status,
      riscoNoshow: agendamentos.riscoNoshow,
      observacoes: agendamentos.observacoes,
      paciente: {
        id: pacientes.id,
        nome: pacientes.nome,
      },
      medico: {
        id: usuarios.id,
        nome: usuarios.nome,
        corAgenda: usuarios.corAgenda,
      },
      convenio: {
        id: convenios.id,
        nome: convenios.nome,
      },
    })
    .from(agendamentos)
    .leftJoin(pacientes, eq(agendamentos.pacienteId, pacientes.id))
    .leftJoin(usuarios, eq(agendamentos.medicoId, usuarios.id))
    .leftJoin(convenios, eq(agendamentos.convenioId, convenios.id))
    .where(and(...conditions))
    .orderBy(agendamentos.dataHora)

  return Response.json({ agendamentos: results })
}, ['admin', 'medico', 'recepcionista'])

export const POST = withAuth(async (req, ctx) => {
  const { validateBody, isValidationError } = await import('@/lib/validation/validate')
  const { agendamentoCreateSchema } = await import('@/lib/validation/schemas')
  const result = await validateBody(req, agendamentoCreateSchema)
  if (isValidationError(result)) return result
  const { medicoId, pacienteId, dataHora, tipo, observacoes } = result
  const convenioId = undefined // resolved from patient if needed

  // M5: valida que o médico pertence ao tenant E ainda está ativo.
  // Sem esse check, um recepcionista poderia marcar consulta com
  // médico desligado — a agenda continuaria populando com um
  // profissional que não atende mais.
  const [medico] = await db
    .select({ id: usuarios.id, ativo: usuarios.ativo, role: usuarios.role })
    .from(usuarios)
    .where(and(eq(usuarios.id, medicoId), eq(usuarios.tenantId, ctx.tenantId)))
    .limit(1)

  if (!medico) {
    return Response.json({ error: 'Médico não encontrado' }, { status: 404 })
  }
  if (!medico.ativo) {
    return Response.json({ error: 'Médico desativado — não aceita novos agendamentos' }, { status: 400 })
  }
  if (medico.role !== 'medico' && medico.role !== 'admin') {
    return Response.json({ error: 'Usuário informado não é um médico' }, { status: 400 })
  }

  const [created] = await db.insert(agendamentos).values({
    tenantId: ctx.tenantId,
    medicoId,
    pacienteId,
    dataHora: new Date(dataHora),
    tipo,
    convenioId,
    observacoes,
  }).returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'agendamentos',
    entidadeId: created.id,
    ip: ctx.ip,
  })

  return Response.json({ agendamento: created }, { status: 201 })
}, ['admin', 'medico', 'recepcionista'])
