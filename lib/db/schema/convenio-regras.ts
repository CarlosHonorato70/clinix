import { pgTable, uuid, varchar, text, real, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { convenios } from './convenios'

export const convenioRegrasAprendidas = pgTable('convenio_regras_aprendidas', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  convenioId: uuid('convenio_id').references(() => convenios.id).notNull(),
  tussCodigo: varchar('tuss_codigo', { length: 20 }),
  cidCodigo: varchar('cid_codigo', { length: 10 }),
  tipoRegra: varchar('tipo_regra', { length: 50 }).notNull(),
  descricao: text('descricao').notNull(),
  valorParametro: jsonb('valor_parametro'),
  confianca: real('confianca').default(0.5).notNull(),
  confirmacoes: integer('confirmacoes').default(0).notNull(),
  rejeicoes: integer('rejeicoes').default(0).notNull(),
  confirmadaPorHumano: boolean('confirmada_por_humano').default(false).notNull(),
  origem: varchar('origem', { length: 30 }).notNull(), // glosa_xml | manual_pdf | feedback_faturista | inferencia_ia
  ativa: boolean('ativa').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('regras_convenio_ativa_idx').on(table.convenioId, table.ativa, table.confianca),
])
