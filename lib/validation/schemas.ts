import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

// ─── Pacientes ───────────────────────────────────────────────────────────
export const pacienteCreateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(200),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional(),
  dataNascimento: z.string().optional(),
  sexo: z.enum(['M', 'F', 'O']).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  convenioId: z.string().uuid().optional().nullable(),
  carteirinha: z.string().max(50).optional(),
  alergias: z.string().max(1000).optional(),
  medicoResponsavelId: z.string().uuid().optional().nullable(),
})

export const pacienteUpdateSchema = pacienteCreateSchema.partial()

// ─── Agendamentos ────────────────────────────────────────────────────────
export const agendamentoCreateSchema = z.object({
  medicoId: z.string().uuid('ID do médico inválido'),
  pacienteId: z.string().uuid('ID do paciente inválido'),
  dataHora: z.string().min(1, 'Data/hora obrigatória'),
  duracaoMin: z.number().int().min(5).max(480).optional().default(30),
  tipo: z.enum(['primeira_consulta', 'retorno', 'urgencia', 'procedimento', 'exame']).optional().default('retorno'),
  status: z.enum(['agendado', 'confirmado', 'cancelado', 'atendido', 'falta']).optional().default('agendado'),
  observacoes: z.string().max(500).optional(),
})

export const agendamentoUpdateSchema = agendamentoCreateSchema.partial()

// ─── Prontuários (Consultas) ─────────────────────────────────────────────
export const consultaCreateSchema = z.object({
  agendamentoId: z.string().uuid().optional(),
  pacienteId: z.string().uuid('ID do paciente obrigatório'),
  medicoId: z.string().uuid().optional(),
  anamnese: z.string().max(10000).optional(),
  exameFisico: z.string().max(10000).optional(),
  hipoteseDiagnostica: z.string().max(5000).optional(),
  conduta: z.string().max(10000).optional(),
  prescricao: z.string().max(5000).optional(),
  cid: z.string().max(20).optional(),
})

export const consultaUpdateSchema = consultaCreateSchema.partial()

// ─── Guias TISS ──────────────────────────────────────────────────────────
export const guiaCreateSchema = z.object({
  pacienteId: z.string().uuid(),
  convenioId: z.string().uuid(),
  consultaId: z.string().uuid().optional(),
  tipo: z.enum(['consulta', 'sp_sadt', 'internacao']).optional().default('sp_sadt'),
  procedimentos: z.array(z.object({
    codigoTuss: z.string(),
    descricao: z.string().optional(),
    quantidade: z.number().int().min(1).optional().default(1),
    valorUnitario: z.string().optional(),
  })).min(1, 'Pelo menos 1 procedimento'),
})

export const guiaUpdateSchema = z.object({
  status: z.enum(['rascunho', 'pendente', 'enviada', 'autorizada', 'negada', 'glosada']).optional(),
  observacoes: z.string().max(1000).optional(),
})

// ─── Agente IA ───────────────────────────────────────────────────────────
export const agenteChatSchema = z.object({
  message: z.string().min(1, 'Mensagem obrigatória').max(5000),
})

export const agenteFeedbackSchema = z.object({
  regraId: z.string().uuid(),
  acao: z.enum(['confirmar', 'rejeitar']),
  comentario: z.string().max(500).optional(),
})

export const regraUpdateSchema = z.object({
  confirmada: z.boolean().optional(),
  ativa: z.boolean().optional(),
})
