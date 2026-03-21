import { pgTable, uuid, text, varchar, numeric, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { convenios } from './convenios'

export const lotesFaturamento = pgTable('lotes_faturamento', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  convenioId: uuid('convenio_id').notNull().references(() => convenios.id),

  // Lote info
  competencia: varchar('competencia', { length: 7 }).notNull(), // "2026-03"
  quantidadeGuias: integer('quantidade_guias').notNull().default(0),
  valorTotal: numeric('valor_total', { precision: 12, scale: 2 }),

  // XML
  xmlLote: text('xml_lote'),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('rascunho'),
  // rascunho | enviado | processado | com_glosas
  protocoloOperadora: varchar('protocolo_operadora', { length: 50 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  enviadoAt: timestamp('enviado_at'),
})
