import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { convenioRegrasAprendidas } from './convenio-regras'
import { usuarios } from './usuarios'

export const agentFeedback = pgTable('agent_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  regraId: uuid('regra_id').references(() => convenioRegrasAprendidas.id).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id).notNull(),
  acao: varchar('acao', { length: 20 }).notNull(), // confirmar | rejeitar
  comentario: text('comentario'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
