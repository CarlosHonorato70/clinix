import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { pacientes, consultas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/audit/logger'

// LGPD Data Erasure — Right to Be Forgotten
// Anonymizes patient data instead of deleting (CFM Resolution 1821/2007: 20-year retention)
export const POST = withAuth(async (req, ctx) => {
  const { pacienteId, motivo } = await req.json()

  if (!pacienteId || !motivo) {
    return Response.json({ error: 'pacienteId e motivo são obrigatórios' }, { status: 400 })
  }

  // Verify patient exists in this tenant
  const [paciente] = await db
    .select()
    .from(pacientes)
    .where(and(eq(pacientes.id, pacienteId), eq(pacientes.tenantId, ctx.tenantId)))
    .limit(1)

  if (!paciente) {
    return Response.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // Anonymize patient record
  await db.update(pacientes)
    .set({
      nome: 'Paciente Anonimizado',
      cpf: null,
      telefone: null,
      email: null,
      alergias: null,
      ativo: false,
    })
    .where(eq(pacientes.id, pacienteId))

  // Anonymize consultation details (keep structure for medical record retention)
  await db.update(consultas)
    .set({
      anamnese: '[Dados anonimizados por solicitação LGPD]',
      exameFisico: '[Dados anonimizados por solicitação LGPD]',
      conduta: '[Dados anonimizados por solicitação LGPD]',
      prescricao: null,
    })
    .where(and(eq(consultas.pacienteId, pacienteId), eq(consultas.tenantId, ctx.tenantId)))

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'erasure',
    entidade: 'pacientes',
    entidadeId: pacienteId,
    dadosAntes: { nome: paciente.nome },
    dadosDepois: { motivo, anonimizado: true },
    ip: ctx.ip,
  })

  return Response.json({
    ok: true,
    mensagem: 'Dados do paciente anonimizados conforme LGPD. Registros médicos mantidos por obrigação legal (CFM 1821/2007).',
  })
}, ['admin'])
