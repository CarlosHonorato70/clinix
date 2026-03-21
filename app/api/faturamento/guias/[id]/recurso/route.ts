import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { guiasTiss, recursosGlosa, convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { gerarArgumentacaoRecurso } from '@/lib/ai/glosa-recurso'

export const GET = withAuth(async (req, user) => {
  const id = req.url.split('/guias/')[1]?.split('/recurso')[0]
  if (!id) return Response.json({ error: 'ID da guia não informado' }, { status: 400 })

  const [recurso] = await db
    .select()
    .from(recursosGlosa)
    .where(and(eq(recursosGlosa.guiaId, id), eq(recursosGlosa.tenantId, user.tenantId)))
    .limit(1)

  if (!recurso) {
    return Response.json({ error: 'Recurso não encontrado' }, { status: 404 })
  }

  return Response.json(recurso)
}, ['admin', 'faturista'])

export const POST = withAuth(async (req, user) => {
  const id = req.url.split('/guias/')[1]?.split('/recurso')[0]
  if (!id) return Response.json({ error: 'ID da guia não informado' }, { status: 400 })

  const body = await req.json()
  const { motivoGlosa, codigoGlosa } = body

  if (!motivoGlosa) {
    return Response.json({ error: 'motivoGlosa é obrigatório' }, { status: 400 })
  }

  const [guia] = await db
    .select()
    .from(guiasTiss)
    .where(and(eq(guiasTiss.id, id), eq(guiasTiss.tenantId, user.tenantId)))
    .limit(1)

  if (!guia) {
    return Response.json({ error: 'Guia não encontrada' }, { status: 404 })
  }

  const [convenio] = guia.convenioId
    ? await db.select().from(convenios).where(eq(convenios.id, guia.convenioId)).limit(1)
    : [null]

  const iaResult = await gerarArgumentacaoRecurso({
    motivoGlosa,
    codigoGlosa,
    pacienteNome: 'Paciente',
    convenioNome: convenio?.nome ?? 'Convênio',
    convenioId: guia.convenioId,
    tenantId: user.tenantId,
    procedimentos: [{ codigo: guia.numeroGuia ?? '', descricao: 'Procedimento', valor: parseFloat(guia.valorFaturado ?? '0') }],
    cid10: undefined,
  })

  const [recurso] = await db
    .insert(recursosGlosa)
    .values({
      tenantId: user.tenantId,
      guiaId: id,
      motivoGlosa,
      codigoGlosa: codigoGlosa ?? null,
      valorGlosado: guia.valorFaturado,
      argumentacao: iaResult.argumentacao,
      iaArgumentacao: iaResult.argumentacao,
      fundamentacao: JSON.stringify(iaResult.fundamentacao),
      status: 'rascunho',
    })
    .returning()

  await db
    .update(guiasTiss)
    .set({ status: 'recurso' })
    .where(eq(guiasTiss.id, id))

  return Response.json({
    recurso,
    ia: {
      probabilidadeAceite: iaResult.probabilidadeAceite,
      fonte: iaResult.fonte,
    },
  }, { status: 201 })
}, ['admin', 'faturista'])
