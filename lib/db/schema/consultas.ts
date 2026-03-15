import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { agendamentos } from './agendamentos'
import { pacientes } from './pacientes'
import { usuarios } from './usuarios'

export const consultas = pgTable('consultas', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  agendamentoId: uuid('agendamento_id').references(() => agendamentos.id),
  pacienteId: uuid('paciente_id').references(() => pacientes.id).notNull(),
  medicoId: uuid('medico_id').references(() => usuarios.id).notNull(),
  dataAtendimento: timestamp('data_atendimento', { withTimezone: true }).defaultNow().notNull(),
  anamnese: text('anamnese'),
  exameFisico: text('exame_fisico'),
  hipoteseDiagnostica: jsonb('hipotese_diagnostica'), // { cid10: [], descricao: '' }
  conduta: text('conduta'),
  prescricao: jsonb('prescricao'),
  iaExtraido: jsonb('ia_extraido'), // GPT-4o extraction result
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('consultas_paciente_idx').on(table.pacienteId),
  index('consultas_medico_idx').on(table.medicoId),
])
