import { pgTable, uuid, varchar, text, numeric, jsonb, timestamp, date, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { consultas } from './consultas'
import { convenios } from './convenios'

export const guiasTiss = pgTable('guias_tiss', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  consultaId: uuid('consulta_id').references(() => consultas.id),
  convenioId: uuid('convenio_id').references(() => convenios.id).notNull(),
  numeroGuia: varchar('numero_guia', { length: 20 }).unique(),
  xmlEnviado: text('xml_enviado'),
  xmlRetorno: text('xml_retorno'),
  status: varchar('status', { length: 30 }).default('pendente_auditoria').notNull(),
  valorFaturado: numeric('valor_faturado', { precision: 10, scale: 2 }),
  valorPago: numeric('valor_pago', { precision: 10, scale: 2 }),
  glosMotivo: text('glosa_motivo'),
  auditoriaIa: jsonb('auditoria_ia'), // { aprovado, alertas[], sugestoes[], extracao }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('guias_tiss_tenant_status_idx').on(table.tenantId, table.status),
])

export const tuss = pgTable('tuss', {
  codigo: varchar('codigo', { length: 10 }).primaryKey(),
  descricao: text('descricao').notNull(),
  categoria: varchar('categoria', { length: 100 }),
  vigenciaInicio: date('vigencia_inicio'),
  vigenciaFim: date('vigencia_fim'),
})
