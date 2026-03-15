import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

export const openai = apiKey && apiKey !== 'sk-placeholder'
  ? new OpenAI({ apiKey })
  : null

export function isAIAvailable(): boolean {
  return openai !== null
}
