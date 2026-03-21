import { openai, isAIAvailable } from './openai'
import { findAgentResponse } from '@/lib/data'
import { db } from '@/lib/db'
import { convenioRegrasAprendidas } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'

export async function processAgentMessage(
  message: string,
  tenantId: string,
): Promise<{ response: string; source: 'ai' | 'keyword_fallback' }> {
  if (!isAIAvailable() || !openai) {
    return { response: findAgentResponse(message), source: 'keyword_fallback' }
  }

  // Fetch active rules for context
  const rules = await db
    .select({
      descricao: convenioRegrasAprendidas.descricao,
      confianca: convenioRegrasAprendidas.confianca,
      tipoRegra: convenioRegrasAprendidas.tipoRegra,
    })
    .from(convenioRegrasAprendidas)
    .where(
      and(
        eq(convenioRegrasAprendidas.tenantId, tenantId),
        eq(convenioRegrasAprendidas.ativa, true),
        gte(convenioRegrasAprendidas.confianca, 0.7),
      )
    )
    .limit(20)

  const rulesContext = rules.length > 0
    ? `\n\nRegras aprendidas:\n${rules.map((r) => `- [${r.tipoRegra}] ${r.descricao} (confiança: ${Math.round(r.confianca * 100)}%)`).join('\n')}`
    : ''

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `Você é o Agente IA do Clinix, sistema de gestão clínica. Ajude com análise de glosas, faturamento TISS, agenda médica, pacientes de risco e relatórios financeiros. Responda em português brasileiro de forma profissional e concisa.${rulesContext}`,
        },
        { role: 'user', content: message },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { response: findAgentResponse(message), source: 'keyword_fallback' }
    }

    return { response: content, source: 'ai' }
  } catch {
    return { response: findAgentResponse(message), source: 'keyword_fallback' }
  }
}
