import { pgTable, uuid, varchar, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { usuarios } from './usuarios'
import { pacientes } from './pacientes'
import { convenios } from './convenios'

export const agendamentos = pgTable('agendamentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  medicoId: uuid('medico_id').references(() => usuarios.id).notNull(),
  pacienteId: uuid('paciente_id').references(() => pacientes.id).notNull(),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
  duracaoMin: integer('duracao_min').default(30).notNull(),
  tipo: varchar('tipo', { length: 30 }).notNull(), // primeira_consulta | retorno | urgencia
  status: varchar('status', { length: 30 }).default('agendado').notNull(), // agendado | confirmado | atendido | cancelado | noshow
  riscoNoshow: real('risco_noshow').default(0),
  convenioId: uuid('convenio_id').references(() => convenios.id),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('agendamentos_medico_data_idx').on(table.tenantId, table.medicoId, table.dataHora),
  index('agendamentos_paciente_idx').on(table.pacienteId),
])
