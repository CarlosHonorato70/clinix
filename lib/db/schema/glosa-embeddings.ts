import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { convenios } from './convenios'
import { guiasTiss } from './guias-tiss'

// Note: pgvector extension must be enabled: CREATE EXTENSION IF NOT EXISTS vector;
// The vector column type is not natively supported by drizzle-orm,
// so we use a custom column with sql template.
export const glosaEmbeddings = pgTable('glosa_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  convenioId: uuid('convenio_id').references(() => convenios.id),
  guiaId: uuid('guia_id').references(() => guiasTiss.id),
  textoGlosa: text('texto_glosa').notNull(),
  contexto: jsonb('contexto'), // { tuss[], cid10, tipo_consulta, valor_glosado }
  // embedding stored as vector(1536) — managed via raw SQL for pgvector
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
