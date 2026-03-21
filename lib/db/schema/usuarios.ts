import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  nome: varchar('nome', { length: 200 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  senhaHash: text('senha_hash').notNull(),
  role: varchar('role', { length: 30 }).notNull(), // admin | medico | faturista | recepcionista
  crm: varchar('crm', { length: 30 }),
  especialidade: varchar('especialidade', { length: 100 }),
  corAgenda: varchar('cor_agenda', { length: 7 }),
  emailVerificado: boolean('email_verificado').default(false).notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('usuarios_tenant_email_idx').on(table.tenantId, table.email),
])
