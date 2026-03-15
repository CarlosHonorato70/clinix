import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const convenios = pgTable('convenios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  nome: varchar('nome', { length: 200 }).notNull(),
  codigoAns: varchar('codigo_ans', { length: 10 }),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
