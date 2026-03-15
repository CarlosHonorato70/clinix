import { pgTable, uuid, varchar, text, jsonb, timestamp, bigserial } from 'drizzle-orm/pg-core'

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  usuarioId: uuid('usuario_id'),
  acao: varchar('acao', { length: 50 }).notNull(),
  entidade: varchar('entidade', { length: 50 }).notNull(),
  entidadeId: uuid('entidade_id'),
  dadosAntes: jsonb('dados_antes'),
  dadosDepois: jsonb('dados_depois'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
