import { withAuth } from '@/lib/auth/middleware'
import { findAgentResponse } from '@/lib/data'
import { validateBody, isValidationError } from '@/lib/validation/validate'
import { agenteChatSchema } from '@/lib/validation/schemas'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rate-limit'

export const POST = withAuth(async (req, ctx) => {
  // Rate limit agent chat per tenant
  const rl = await checkRateLimit(`agent:${ctx.tenantId}`, RATE_LIMITS.agentChat)
  if (!rl.allowed) return rateLimitResponse(rl)

  const result = await validateBody(req, agenteChatSchema)
  if (isValidationError(result)) return result
  const { message } = result

  // For now, use the keyword-based fallback
  // TODO: Replace with lib/ai/agent-chat.ts when OpenAI is configured
  const response = findAgentResponse(message)

  return Response.json({
    response,
    source: 'keyword_fallback',
  })
})
