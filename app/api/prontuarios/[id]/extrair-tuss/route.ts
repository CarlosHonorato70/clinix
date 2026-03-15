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

  const extraction = await extractTussCodes(
    consulta.anamnese || '',
    consulta.exameFisico || '',
    consulta.conduta || '',
  )

  if (!extraction) {
    // Return simulated extraction when AI is not available
    const simulated = {
      cid10_principal: 'I20',
      cid10_secundarios: ['I10'],
      procedimentos: [
        { tuss: '10101012', descricao: 'Consulta em consultório (clínica médica)', quantidade: 1 },
        { tuss: '40304361', descricao: 'Eletrocardiograma com esforço', quantidade: 1 },
        { tuss: '40302558', descricao: 'Troponina I (quantitativa)', quantidade: 1 },
      ],
      tipo_consulta: 'retorno',
      observacao_auditoria: 'Extração simulada — configure OPENAI_API_KEY para extração real',
    }

    await db
      .update(consultas)
      .set({ iaExtraido: simulated })
      .where(eq(consultas.id, id))

    return Response.json({ extraction: simulated, source: 'simulated' })
  }

  await db
    .update(consultas)
    .set({ iaExtraido: extraction })
    .where(eq(consultas.id, id))

  return Response.json({ extraction, source: 'gpt-4o' })
}, ['admin', 'medico'])
