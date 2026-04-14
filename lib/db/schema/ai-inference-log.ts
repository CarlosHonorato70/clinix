import { pgTable, uuid, varchar, text, real, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Log de todas as inferências de IA para telemetria e detecção de alucinações.
 * Camada 7 da defesa anti-alucinação.
 */
export const aiInferenceLog = pgTable('ai_inference_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // Tipo de inferência
  feature: varchar('feature', { length: 50 }).notNull(),
  // tuss_extraction | agent_chat | glosa_recurso

  model: varchar('model', { length: 50 }).notNull(), // gpt-4o
  inputHash: varchar('input_hash', { length: 64 }).notNull(), // SHA-256 para privacidade

  // Resultado
  outputSummary: text('output_summary'), // resumo do output (sem PII)
  confidence: real('confidence'), // 0-1 (se disponível)
  durationMs: integer('duration_ms').notNull(),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),

  // Validação
  validationErrors: jsonb('validation_errors'), // array de erros encontrados
  hasErrors: boolean('has_errors').default(false).notNull(),

  // Feedback humano
  humanReviewed: boolean('human_reviewed').default(false).notNull(),
  humanAccepted: boolean('human_accepted'), // null = não revisado ainda
  humanComment: text('human_comment'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
})
