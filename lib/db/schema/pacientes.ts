import { pgTable, uuid, varchar, text, date, char, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { usuarios } from './usuarios'
import { convenios } from './convenios'

export const pacientes = pgTable('pacientes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  medicoResponsavelId: uuid('medico_responsavel_id').references(() => usuarios.id),
  nome: varchar('nome', { length: 200 }).notNull(),
  cpf: text('cpf'), // encrypted → ciphertext é ~60+ chars, não cabe em varchar(14)
  dataNascimento: date('data_nascimento'),
  sexo: char('sexo', { length: 1 }),
  telefone: text('telefone'), // encrypted → idem
  email: text('email'), // encrypted → idem
  convenioId: uuid('convenio_id').references(() => convenios.id),
  numeroCarteirinha: varchar('numero_carteirinha', { length: 50 }),
  alergias: text('alergias'),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('pacientes_tenant_nome_idx').on(table.tenantId, table.nome),
])
