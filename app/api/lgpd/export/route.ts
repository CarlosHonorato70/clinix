import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { pacientes, agendamentos, consultas, guiasTiss, lgpdConsent } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { decryptField } from '@/lib/security/encryption'
import { writeAuditLog } from '@/lib/audit/logger'

// LGPD Data Export — Right to Data Portability
export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const pacienteId = url.searchParams.get('paciente_id')

  if (!pacienteId) {
    return Response.json({ error: 'paciente_id obrigatório' }, { status: 400 })
  }

  // Fetch patient data
  const [paciente] = await db
    .select()
    .from(pacientes)
    .where(and(eq(pacientes.id, pacienteId), eq(pacientes.tenantId, ctx.tenantId)))
    .limit(1)

  if (!paciente) {
    return Response.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // Decrypt PII fields
  const dadosPaciente = {
    ...paciente,
    cpf: decryptField(paciente.cpf),
    telefone: decryptField(paciente.telefone),
    email: decryptField(paciente.email),
  }

  // Fetch related data
  const [appointments, consultations, guias, consents] = await Promise.all([
    db.select().from(agendamentos)
      .where(and(eq(agendamentos.pacienteId, pacienteId), eq(agendamentos.tenantId, ctx.tenantId))),
    db.select().from(consultas)
      .where(and(eq(consultas.pacienteId, pacienteId), eq(consultas.tenantId, ctx.tenantId))),
    db.select().from(guiasTiss)
      .where(eq(guiasTiss.tenantId, ctx.tenantId)),
    db.select().from(lgpdConsent)
      .where(and(eq(lgpdConsent.pacienteId, pacienteId), eq(lgpdConsent.tenantId, ctx.tenantId))),
  ])

  const exportData = {
    exportadoEm: new Date().toISOString(),
    exportadoPor: ctx.userId,
    paciente: dadosPaciente,
    agendamentos: appointments,
    consultas: consultations,
    guias,
    consentimentos: consents,
  }

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'export',
    entidade: 'pacientes',
    entidadeId: pacienteId,
    ip: ctx.ip,
  })

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lgpd-export-${pacienteId}.json"`,
    },
  })
}, ['admin'])
