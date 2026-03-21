import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { consultas, pacientes, usuarios } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { consultaCreateSchema } from '@/lib/validation/schemas'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const pacienteId = url.searchParams.get('paciente_id')
  const medicoId = url.searchParams.get('medico_id')

  const conditions = [eq(consultas.tenantId, ctx.tenantId)]

  if (ctx.role === 'medico') {
    conditions.push(eq(consultas.medicoId, ctx.userId))
  } else if (medicoId) {
    conditions.push(eq(consultas.medicoId, medicoId))
  }

  if (pacienteId) {
    conditions.push(eq(consultas.pacienteId, pacienteId))
  }

  const results = await db
    .select({
      id: consultas.id,
      dataAtendimento: consultas.dataAtendimento,
      anamnese: consultas.anamnese,
      exameFisico: consultas.exameFisico,
      hipoteseDiagnostica: consultas.hipoteseDiagnostica,
      conduta: consultas.conduta,
      prescricao: consultas.prescricao,
      iaExtraido: consultas.iaExtraido,
      paciente: {
        id: pacientes.id,
        nome: pacientes.nome,
      },
      medico: {
        id: usuarios.id,
        nome: usuarios.nome,
      },
    })
    .from(consultas)
    .leftJoin(pacientes, eq(consultas.pacienteId, pacientes.id))
    .leftJoin(usuarios, eq(consultas.medicoId, usuarios.id))
    .where(and(...conditions))
    .orderBy(desc(consultas.dataAtendimento))
    .limit(20)

  return Response.json({ consultas: results })
}, ['admin', 'medico'])

export const POST = withAuth(async (req, ctx) => {
  const result = await validateBody(req, consultaCreateSchema)
  if (isValidationError(result)) return result

  const { pacienteId, agendamentoId, anamnese, exameFisico, hipoteseDiagnostica, conduta, prescricao } = result

  const [created] = await db.insert(consultas).values({
    tenantId: ctx.tenantId,
    medicoId: ctx.userId,
    pacienteId,
    agendamentoId,
    anamnese,
    exameFisico,
    hipoteseDiagnostica,
    conduta,
    prescricao,
  }).returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'consultas',
    entidadeId: created.id,
    dadosDepois: { pacienteId },
    ip: ctx.ip,
  })

  return Response.json({ consulta: created }, { status: 201 })
}, ['admin', 'medico'])
