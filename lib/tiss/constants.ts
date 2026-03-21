/**
 * Clinix — Constantes do Padrão TISS v4.02 (ANS)
 * Ref: https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss
 */

// ─── Versão do padrão ────────────────────────────────────────────────────────
export const TISS_VERSION = '4.02.00'
export const TISS_NAMESPACE = 'http://www.ans.gov.br/padroes/tiss/schemas'

// ─── Tipos de guia ──────────────────────────────────────────────────────────
export type TipoGuia = 'consulta' | 'sp_sadt' | 'internacao' | 'honorarios'

export const TIPO_GUIA_LABELS: Record<TipoGuia, string> = {
  consulta: 'Guia de Consulta',
  sp_sadt: 'Guia SP/SADT',
  internacao: 'Guia de Resumo de Internação',
  honorarios: 'Guia de Honorários',
}

// ─── Tipo de atendimento (TISS domínio) ──────────────────────────────────────
export const TIPO_ATENDIMENTO = {
  '01': 'Remoção',
  '02': 'Outras despesas',
  '03': 'Consulta',
  '04': 'Exame',
  '05': 'Tratamento odontológico',
  '06': 'Terapias',
  '07': 'Internação',
  '08': 'Quimioterapia',
  '09': 'Radioterapia',
  '10': 'TRS - Terapia Renal Substitutiva',
  '11': 'Pronto socorro',
  '12': 'Internação domiciliar',
  '13': 'SADT internado',
  '14': 'Parto',
} as const

// ─── Caráter do atendimento ──────────────────────────────────────────────────
export const CARATER_ATENDIMENTO = {
  '1': 'Eletivo',
  '2': 'Urgência/Emergência',
} as const

// ─── Tipo de consulta ────────────────────────────────────────────────────────
export const TIPO_CONSULTA = {
  '1': 'Primeira consulta',
  '2': 'Retorno',
  '3': 'Pré-natal',
  '4': 'Por encaminhamento',
} as const

// ─── Indicador de acidente ───────────────────────────────────────────────────
export const INDICADOR_ACIDENTE = {
  '0': 'Não',
  '1': 'Trabalho',
  '2': 'Trânsito',
  '9': 'Outros',
} as const

// ─── Tipo de internação ──────────────────────────────────────────────────────
export const TIPO_INTERNACAO = {
  '1': 'Clínica',
  '2': 'Cirúrgica',
  '3': 'Obstétrica',
  '4': 'Pediátrica',
  '5': 'Psiquiátrica',
} as const

// ─── Regime de internação ────────────────────────────────────────────────────
export const REGIME_INTERNACAO = {
  '1': 'Hospitalar',
  '2': 'Hospital dia',
  '3': 'Domiciliar',
} as const

// ─── Status da guia (workflow interno) ───────────────────────────────────────
export const STATUS_GUIA = {
  rascunho: 'Rascunho',
  pendente_auditoria: 'Em Auditoria IA',
  pendente_revisao: 'Pendente Revisão',
  pendente_envio: 'Pronta para Envio',
  enviado: 'Enviada',
  processado: 'Processada',
  pago: 'Paga',
  glosado: 'Glosada',
  recurso: 'Em Recurso',
} as const

// ─── CBO por especialidade médica ────────────────────────────────────────────
export const CBO_ESPECIALIDADE: Record<string, { codigo: string; descricao: string }> = {
  clinica_geral: { codigo: '225125', descricao: 'Médico clínico' },
  cardiologia: { codigo: '225110', descricao: 'Médico cardiologista' },
  dermatologia: { codigo: '225115', descricao: 'Médico dermatologista' },
  endocrinologia: { codigo: '225120', descricao: 'Médico endocrinologista' },
  gastroenterologia: { codigo: '225130', descricao: 'Médico gastroenterologista' },
  ginecologia: { codigo: '225135', descricao: 'Médico ginecologista e obstetra' },
  neurologia: { codigo: '225145', descricao: 'Médico neurologista' },
  oftalmologia: { codigo: '225150', descricao: 'Médico oftalmologista' },
  ortopedia: { codigo: '225155', descricao: 'Médico ortopedista e traumatologista' },
  otorrinolaringologia: { codigo: '225160', descricao: 'Médico otorrinolaringologista' },
  pediatria: { codigo: '225170', descricao: 'Médico pediatra' },
  psiquiatria: { codigo: '225175', descricao: 'Médico psiquiatra' },
  urologia: { codigo: '225195', descricao: 'Médico urologista' },
  cirurgia_geral: { codigo: '225215', descricao: 'Médico cirurgião geral' },
  anestesiologia: { codigo: '225105', descricao: 'Médico anestesiologista' },
}

// ─── Tabelas de procedimentos ────────────────────────────────────────────────
export const TABELA_PROCEDIMENTO = {
  '22': 'Tabela TUSS - Terminologia Unificada da Saúde Suplementar',
  '00': 'Tabela própria das operadoras',
  '90': 'Tabela CBHPM (AMB)',
  '98': 'Tabela Brasíndice (medicamentos)',
  '19': 'Tabela Simpro (materiais/OPME)',
} as const

// ─── Tipo de tabela de procedimento padrão ───────────────────────────────────
export const TABELA_TUSS = '22'

// ─── Motivos de glosa comuns (ANS) ───────────────────────────────────────────
export const MOTIVOS_GLOSA: Record<string, string> = {
  '1001': 'Procedimento não coberto pelo plano',
  '1002': 'Beneficiário não elegível na data do atendimento',
  '1003': 'Carteirinha vencida ou inválida',
  '1010': 'Código de procedimento inválido',
  '1012': 'CID-10 incompatível com o procedimento',
  '1015': 'Autorização prévia não obtida',
  '1018': 'Prazo de envio da guia excedido',
  '1020': 'Duplicidade de cobrança',
  '1025': 'Valor cobrado acima do contratado',
  '1030': 'Documentação incompleta',
  '1035': 'Prontuário médico não apresentado',
  '1040': 'Laudo ou relatório médico ausente',
  '1045': 'Quantidade excede o autorizado',
  '1050': 'Procedimento não autorizado',
  '1055': 'CBO do executante incompatível',
  '1060': 'Data de execução anterior à autorização',
  '1818': 'Procedimento realizado sem autorização prévia',
}

// ─── Validação de formatos ───────────────────────────────────────────────────
export const REGEX = {
  TUSS: /^\d{8}$/, // 8 dígitos numéricos
  CID10: /^[A-Z]\d{2}(\.\d{1,2})?$/, // Ex: I20, I20.0, F32.1
  CBO: /^\d{6}$/, // 6 dígitos numéricos
  CARTEIRINHA: /^\d{4,20}$/, // 4-20 dígitos
  ANS_REGISTRO: /^\d{6}$/, // Registro ANS 6 dígitos
  GUIA_NUMERO: /^[\w-]{1,20}$/, // Alfanumérico com hifens
  CNPJ: /^\d{14}$/, // 14 dígitos
  CNES: /^\d{7}$/, // 7 dígitos
}
