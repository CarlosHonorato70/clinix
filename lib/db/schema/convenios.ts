import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const convenios = pgTable('convenios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  nome: varchar('nome', { length: 200 }).notNull(),
  codigoAns: varchar('codigo_ans', { length: 10 }),
  ativo: boolean('ativo').default(true).notNull(),

  // ── Gateway TISS — endpoints Web Service da operadora ──────────────
  /** URL base do Web Service TISS (ex: https://tiss.unimed.coop.br/ws) */
  wsdlUrl: text('wsdl_url'),
  /** Código do prestador na operadora */
  codigoPrestador: varchar('codigo_prestador', { length: 20 }),
  /** Login de acesso ao portal/WS da operadora */
  wsLogin: varchar('ws_login', { length: 100 }),
  /** Senha de acesso (criptografada) */
  wsSenha: varchar('ws_senha', { length: 255 }),
  /** Configurações extras por operadora (JSON) */
  wsConfig: jsonb('ws_config'),
  // wsConfig: { autorizacaoUrl, elegibilidadeUrl, recursoGlosaUrl, tabelaPreco, prazoEnvioDias }

  /** Se integração automática está habilitada */
  integracaoAtiva: boolean('integracao_ativa').default(false).notNull(),
  /** Última vez que a integração foi testada com sucesso */
  integracaoTesteAt: timestamp('integracao_teste_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
