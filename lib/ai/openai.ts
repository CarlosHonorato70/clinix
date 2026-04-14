import OpenAI from 'openai'
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'

const apiKey = process.env.OPENAI_API_KEY

export const openai = apiKey && apiKey !== 'sk-placeholder'
  ? new OpenAI({ apiKey })
  : null

export function isAIAvailable(): boolean {
  return openai !== null
}

/**
 * Privacy-safe chat completion wrapper.
 *
 * - Sets `store: false` to prevent OpenAI from storing the request/response
 *   in their dashboard for 30 days (default behavior).
 * - Data sent via API is NOT used for training per OpenAI policy since
 *   March 2023. See: https://openai.com/policies/api-data-usage-policies
 *
 * Use this wrapper instead of calling openai.chat.completions.create directly.
 */
export async function safeChatCompletion(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'store' | 'stream'>
) {
  if (!openai) {
    throw new Error('OpenAI not configured')
  }
  return openai.chat.completions.create({
    ...params,
    store: false,
  })
}
