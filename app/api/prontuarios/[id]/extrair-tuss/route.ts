import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { consultas } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { extractTussCodes } from '@/lib/ai/tuss-extractor'

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const id = req.nextUrl.pathname.split('/').at(-2) // /prontuarios/[id]/extrair-tuss

  if (!id) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  const [consulta] = await db
    .select()
    .from(consultas)
    .where(and(eq(consultas.id, id), eq(consultas.tenantId, ctx.tenantId)))
    .limit(1)

  if (!consulta) {
    return Response.json({ error: 'Consulta não encontrada' }, { status: 404 })
  }

  const result = await extractTussCodes(
    consulta.anamnese || '',
    consulta.exameFisico || '',
    consulta.conduta || '',
    ctx.tenantId,
  )

  if (result.source === 'paused') {
    return Response.json(
      {
        error: 'Extração IA temporariamente pausada',
        reason: 'Taxa de rejeição/erros alta. Entre em contato com o suporte ou faça extração manual.',
      },
      { status: 503 }
    )
  }

  if (result.source === 'unavailable') {
    return Response.json(
      {
        error: 'Extração IA indisponível',
        reason: 'Serviço OpenAI não configurado ou indisponível. Use extração manual.',
      },
      { status: 503 }
    )
  }

  // Save extraction result (only if validation says it's usable)
  await db
    .update(consultas)
    .set({
      iaExtraido: {
        ...result.raw,
        _validation: result.validation,
        _inferenceId: result.inferenceId,
      },
    })
    .where(eq(consultas.id, id))

  return Response.json({
    extraction: result.raw,
    validation: result.validation,
    inferenceId: result.inferenceId,
    source: result.source,
    requiresReview: result.validation.requiresReview,
  })
}, ['admin', 'medico'])
