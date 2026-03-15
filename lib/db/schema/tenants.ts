import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 200 }).notNull(),
  subdominio: varchar('subdominio', { length: 100 }).unique().notNull(),
  plano: varchar('plano', { length: 30 }).default('trial').notNull(),
  // SaaS fields
  status: varchar('status', { length: 30 }).default('trial').notNull(),
  // 'trial' | 'active' | 'suspended' | 'cancelled'
  billingCustomerId: varchar('billing_customer_id', { length: 100 }),
  billingSubscriptionId: varchar('billing_subscription_id', { length: 100 }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
