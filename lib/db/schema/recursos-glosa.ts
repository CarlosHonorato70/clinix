import { pgTable, uuid, text, varchar, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { guiasTiss } from './guias-tiss'

export const recursosGlosa = pgTable('recursos_glosa', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  guiaId: uuid('guia_id').notNull().references(() => guiasTiss.id),

  // Glosa info
  motivoGlosa: text('motivo_glosa').notNull(),
  codigoGlosa: varchar('codigo_glosa', { length: 10 }),
  valorGlosado: numeric('valor_glosado', { precision: 10, scale: 2 }),

  // Recurso
  argumentacao: text('argumentacao'), // texto editado pelo faturista
  iaArgumentacao: text('ia_argumentacao'), // sugestão gerada pela IA
  fundamentacao: text('fundamentacao'), // JSON array de fundamentos

  // Resultado
  status: varchar('status', { length: 20 }).notNull().default('rascunho'),
  // rascunho | enviado | aceito | parcialmente_aceito | negado
  valorRecuperado: numeric('valor_recuperado', { precision: 10, scale: 2 }),
  respostaOperadora: text('resposta_operadora'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  enviadoAt: timestamp('enviado_at'),
  resolvidoAt: timestamp('resolvido_at'),
})
