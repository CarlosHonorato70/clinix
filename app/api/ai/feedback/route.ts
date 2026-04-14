/**
 * Clinix — Endpoint de feedback humano para inferências de IA
 * Camada 7 da defesa anti-alucinação.
 *
 * Usado quando o usuário revisa uma extração/resposta da IA e clica
 * em Confirmar ou Rejeitar.
 */

import { withAuth } from '@/lib/auth/middleware'
import { recordHumanReview } from '@/lib/ai/telemetry'

export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => null)
  if (!body || !body.inferenceId || typeof body.accepted !== 'boolean') {
    return Response.json(
      { error: 'Payload inválido. Esperado: { inferenceId, accepted, comment? }' },
      { status: 400 }
    )
  }

  await recordHumanReview(body.inferenceId, body.accepted, body.comment)

  return Response.json({ ok: true })
})
