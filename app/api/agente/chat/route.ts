import { withAuth } from '@/lib/auth/middleware'
import { processAgentMessage } from '@/lib/ai/agent-chat'
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

  // Uses GPT-4o if OPENAI_API_KEY is configured, otherwise falls back to keywords
  const { response, source } = await processAgentMessage(message, ctx.tenantId)

  return Response.json({ response, source })
})
