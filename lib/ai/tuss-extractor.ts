import { openai, isAIAvailable, safeChatCompletion } from './openai'

export interface TussExtraction {
  cid10_principal: string
  cid10_secundarios: string[]
  procedimentos: { tuss: string; descricao: string; quantidade: number }[]
  tipo_consulta: string
  observacao_auditoria?: string
}

export async function extractTussCodes(
  anamnese: string,
  exameFisico: string,
  conduta: string,
): Promise<TussExtraction | null> {
  if (!isAIAvailable() || !openai) {
    return null // Fallback: return null when AI is unavailable
  }

  const response = await safeChatCompletion({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Você é um auditor médico especialista em codificação TUSS e CID-10 para faturamento de planos de saúde brasileiros.
Extraia dados de faturamento de forma conservadora. Não infira procedimentos não documentados.
Retorne JSON no formato:
{
  "cid10_principal": "string",
  "cid10_secundarios": ["string"],
  "procedimentos": [{ "tuss": "string", "descricao": "string", "quantidade": number }],
  "tipo_consulta": "primeira_consulta|retorno|urgencia",
  "observacao_auditoria": "string ou null"
}`,
      },
      {
        role: 'user',
        content: `Prontuário:\nAnamnese: ${anamnese}\nExame Físico: ${exameFisico}\nConduta: ${conduta}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) return null

  return JSON.parse(content) as TussExtraction
}
