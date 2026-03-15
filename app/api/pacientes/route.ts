import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { pacientes, convenios } from '@/lib/db/schema'
import { eq, and, ilike } from 'drizzle-orm'
import { parsePagination } from '@/lib/api/helpers'
import { encryptField, maskCpf } from '@/lib/security/encryption'
import { writeAuditLog } from '@/lib/audit/logger'

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url)
  const { limit, offset } = parsePagination(url.searchParams)
  const search = url.searchParams.get('q')
  const medicoId = url.searchParams.get('medico_id')

  const conditions = [
    eq(pacientes.tenantId, ctx.tenantId),
    eq(pacientes.ativo, true),
  ]

  if (search) {
    conditions.push(ilike(pacientes.nome, `%${search}%`))
  }

  if (ctx.role === 'medico') {
    conditions.push(eq(pacientes.medicoResponsavelId, ctx.userId))
  } else if (medicoId) {
    conditions.push(eq(pacientes.medicoResponsavelId, medicoId))
  }

  const results = await db
    .select({
      id: pacientes.id,
      nome: pacientes.nome,
      cpf: pacientes.cpf,
      dataNascimento: pacientes.dataNascimento,
      sexo: pacientes.sexo,
      email: pacientes.email,
      telefone: pacientes.telefone,
      convenio: {
        id: convenios.id,
        nome: convenios.nome,
      },
    })
    .from(pacientes)
    .leftJoin(convenios, eq(pacientes.convenioId, convenios.id))
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(pacientes.nome)

  // Mask CPF (decrypts if encrypted, then masks)
  const masked = results.map((p) => ({
    ...p,
    cpf: maskCpf(p.cpf),
  }))

  return Response.json({ pacientes: masked })
})

export const POST = withAuth(async (req, ctx) => {
  const { validateBody, isValidationError } = await import('@/lib/validation/validate')
  const { pacienteCreateSchema } = await import('@/lib/validation/schemas')
  const result = await validateBody(req, pacienteCreateSchema)
  if (isValidationError(result)) return result
  const { nome, cpf, dataNascimento, sexo, telefone, email, convenioId, carteirinha: numeroCarteirinha, alergias } = result

  const [created] = await db.insert(pacientes).values({
    tenantId: ctx.tenantId,
    nome,
    cpf: encryptField(cpf),
    dataNascimento,
    sexo,
    telefone: encryptField(telefone),
    email: encryptField(email),
    convenioId,
    numeroCarteirinha,
    alergias,
  }).returning()

  writeAuditLog({
    tenantId: ctx.tenantId,
    usuarioId: ctx.userId,
    acao: 'create',
    entidade: 'pacientes',
    entidadeId: created.id,
    dadosDepois: { nome, convenioId },
    ip: ctx.ip,
  })

  return Response.json({ paciente: created }, { status: 201 })
}, ['admin', 'medico', 'recepcionista'])
