import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { pacientes } from './pacientes'

export const lgpdConsent = pgTable('lgpd_consent', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  pacienteId: uuid('paciente_id').references(() => pacientes.id).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(),
  // 'dados_pessoais' | 'comunicacao_whatsapp' | 'compartilhamento_convenio' | 'tratamento_ia'
  aceito: boolean('aceito').notNull(),
  ipOrigem: varchar('ip_origem', { length: 45 }),
  versaoTermo: varchar('versao_termo', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
})
