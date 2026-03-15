import { openai, isAIAvailable } from './openai'

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!isAIAvailable() || !openai) return null

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  return response.data[0]?.embedding ?? null
}
