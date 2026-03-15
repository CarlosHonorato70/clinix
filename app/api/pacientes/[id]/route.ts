import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { pacientes, convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!

  const [patient] = await db
    .select({
      id: pacientes.id,
      nome: pacientes.nome,
      cpf: pacientes.cpf,
      dataNascimento: pacientes.dataNascimento,
      sexo: pacientes.sexo,
      telefone: pacientes.telefone,
      email: pacientes.email,
      alergias: pacientes.alergias,
      convenio: { id: convenios.id, nome: convenios.nome },
    })
    .from(pacientes)
    .leftJoin(convenios, eq(pacientes.convenioId, convenios.id))
    .where(and(eq(pacientes.id, id), eq(pacientes.tenantId, ctx.tenantId)))
    .limit(1)

  if (!patient) return Response.json({ error: 'Não encontrado' }, { status: 404 })

  return Response.json({
    paciente: {
      ...patient,
      cpf: patient.cpf ? `***.***.***-${patient.cpf.slice(-2)}` : null,
    },
  })
})

export const PUT = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').pop()!
  const body = await req.json()

  const [updated] = await db
    .update(pacientes)
    .set(body)
    .where(and(eq(pacientes.id, id), eq(pacientes.tenantId, ctx.tenantId)))
    .returning()

  if (!updated) return Response.json({ error: 'Não encontrado' }, { status: 404 })
  return Response.json({ paciente: updated })
}, ['admin', 'medico', 'recepcionista'])
