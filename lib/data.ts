// ─────────────────────────────────────────────────────────────────────────────
// Clinix – Central seed data file
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  spec: string;
  crm: string;
  color: string;
  bg: string;
  today: number;
  week: number;
  risk: number;
  occ: string;
}

/** [dayIndex, time, patient, convenio, isRisk] */
export type AppointmentTuple = [number, string, string, string, boolean];

export interface PatientRecord {
  name: string;
  age: number;
  conv: string;
  lastVisit: string;
  next: string;
  risk: boolean;
}

export interface PatientTableRow {
  name: string;
  age: number;
  sex: 'M' | 'F';
  cpf: string;
  convenio: string;
  lastVisit: string;
  prontuario: 'Completo' | 'Pendente' | 'Incompleto';
  badgeColor: 'green' | 'amber' | 'red';
}

export interface GuiaTiss {
  paciente: string;
  sub: string;
  convenio: string;
  convBadge: string;
  procedimentos: string;
  valor: string;
  statusIA: string;
  statusBadge: 'green' | 'amber' | 'red';
  auditoria: string;
  auditoriaColor: 'green' | 'amber' | 'red';
  acao: 'Enviar' | 'Revisar' | 'Corrigir';
  highlight?: 'amber' | 'red';
}

export interface ConciliacaoItem {
  convenio: string;
  badge: string;
  guias: number;
  enviado: string;
  recebido: string;
  glosa: string;
  status: string;
  statusBadge: 'green' | 'amber' | 'red' | 'blue';
  diff?: string;
  diffColor?: 'red' | 'amber' | 'green';
}

export interface ConvenioProfile {
  name: string;
  badge: string;
  risco: 'Alto' | 'Médio' | 'Baixo';
  riscoBadge: 'red' | 'amber' | 'green';
  glosa: string;
  prazo: string;
  obs: string;
}

export interface AgentResponse {
  keywords: string[];
  response: string;
}

export interface NavItem {
  icon: string;
  label: string;
  badge?: string | number;
  route: string;
}

// ─── 1. DOCTORS ──────────────────────────────────────────────────────────────

export const DOCTORS: Doctor[] = [
  {
    id: 'cm',
    name: 'Dr. Carlos Mendes',
    initials: 'CM',
    spec: 'Clínica Médica',
    crm: 'CRM-SP 48291',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.18)',
    today: 5,
    week: 18,
    risk: 2,
    occ: '78%',
  },
  {
    id: 'af',
    name: 'Dra. Ana Figueiredo',
    initials: 'AF',
    spec: 'Cardiologia',
    crm: 'CRM-SP 61047',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.18)',
    today: 4,
    week: 14,
    risk: 1,
    occ: '65%',
  },
  {
    id: 'rb',
    name: 'Dr. Ricardo Braga',
    initials: 'RB',
    spec: 'Ortopedia',
    crm: 'CRM-SP 33814',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.18)',
    today: 6,
    week: 20,
    risk: 0,
    occ: '88%',
  },
  {
    id: 'lp',
    name: 'Dra. Larissa Porto',
    initials: 'LP',
    spec: 'Pediatria',
    crm: 'CRM-SP 55932',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.18)',
    today: 3,
    week: 11,
    risk: 1,
    occ: '55%',
  },
];

// ─── 2. APPOINTMENTS_SEED ────────────────────────────────────────────────────

export const APPOINTMENTS_SEED: Record<string, AppointmentTuple[]> = {
  cm: [
    [0, '08:00', 'Antônio Neves', 'Unimed', false],
    [0, '09:00', 'Fernanda Cruz', 'SulAmérica', true],
    [1, '08:30', 'Beatriz Lima', 'Amil', false],
    [1, '10:00', 'Mariana Vaz', 'Unimed', false],
    [2, '09:30', 'Helena Costa', 'Amil', false],
    [3, '08:00', 'Daniela Faria', 'Particular', false],
    [3, '09:00', 'Igor Pinto', 'Unimed', true],
    [3, '10:00', 'Natália Braga', 'Amil', false],
    [4, '15:00', 'Roberto Campos', 'Particular', true],
    [4, '15:45', 'Fernanda Torres', 'Amil', false],
    [4, '16:30', 'Maria Aparecida', 'Amil', false],
    [4, '17:00', 'Clara Oliveira', 'Unimed', false],
  ],
  af: [
    [0, '09:00', 'Eduardo Matos', 'Unimed', false],
    [1, '10:30', 'Luciana Pimentel', 'Unimed', false],
    [3, '11:00', 'Miguel Santos', 'Bradesco', false],
    [4, '08:00', 'Eduardo Matos', 'Unimed', false],
    [4, '09:00', 'Fernanda Cruz', 'SulAmérica', true],
    [4, '14:30', 'Luciana Pimentel', 'Unimed', false],
  ],
  rb: [
    [0, '08:00', 'Lucas Alves', 'Particular', false],
    [1, '09:00', 'Gabriel Rios', 'Hapvida', false],
    [1, '11:00', 'Pedro Rocha', 'SulAmérica', false],
    [2, '10:00', 'Carlos Souza', 'Bradesco', false],
    [3, '14:00', 'Natália Braga', 'Amil', false],
    [4, '10:00', 'Pedro Rocha', 'SulAmérica', false],
    [4, '11:00', 'Gabriel Rios', 'Hapvida', false],
    [4, '14:00', 'Lucas Alves', 'Particular', false],
    [4, '15:30', 'Mariana Vaz', 'Unimed', false],
    [4, '16:00', 'Natália Braga', 'Amil', false],
  ],
  lp: [
    [0, '08:00', 'Ana Costa', 'Bradesco', false],
    [2, '09:30', 'Julia Lemos', 'Bradesco', false],
    [3, '10:00', 'Ana Costa', 'Bradesco', false],
    [4, '09:30', 'Ana Paula Costa', 'Bradesco', false],
    [4, '11:30', 'Julia Lemos', 'Bradesco', false],
  ],
};

// ─── 3. DOCTOR_PATIENTS ──────────────────────────────────────────────────────

export const DOCTOR_PATIENTS: Record<string, PatientRecord[]> = {
  cm: [
    { name: 'João Carlos Ferreira', age: 62, conv: 'Unimed', lastVisit: '12 mar', next: 'Hoje 15:00', risk: false },
    { name: 'Maria Aparecida Silva', age: 45, conv: 'Amil', lastVisit: '10 mar', next: 'Hoje 16:30', risk: false },
    { name: 'Roberto Campos', age: 51, conv: 'Particular', lastVisit: '28 fev', next: 'Hoje 15:45', risk: true },
    { name: 'Fernanda Torres Melo', age: 28, conv: 'Amil', lastVisit: '08 mar', next: '17 mar', risk: false },
    { name: 'Clara Oliveira', age: 34, conv: 'Unimed', lastVisit: '01 mar', next: 'Hoje 17:00', risk: false },
    { name: 'Antônio Neves', age: 58, conv: 'Unimed', lastVisit: '10 mar', next: '21 mar', risk: false },
    { name: 'Helena Costa', age: 42, conv: 'Amil', lastVisit: '12 mar', next: '26 mar', risk: false },
    { name: 'Igor Pinto', age: 39, conv: 'Unimed', lastVisit: '13 mar', next: '27 mar', risk: true },
  ],
  af: [
    { name: 'Eduardo Matos', age: 67, conv: 'Unimed', lastVisit: '14 mar', next: 'Hoje 08:00', risk: false },
    { name: 'Luciana Pimentel', age: 55, conv: 'Unimed', lastVisit: '07 mar', next: 'Hoje 14:30', risk: false },
    { name: 'Fernanda Cruz', age: 61, conv: 'SulAmérica', lastVisit: '05 mar', next: 'Hoje 09:00', risk: true },
    { name: 'Beatriz Lima', age: 49, conv: 'Amil', lastVisit: '11 mar', next: '18 mar', risk: false },
    { name: 'Miguel Santos', age: 72, conv: 'Bradesco', lastVisit: '13 mar', next: '21 mar', risk: false },
  ],
  rb: [
    { name: 'Pedro Henrique Rocha', age: 38, conv: 'SulAmérica', lastVisit: '14 mar', next: 'Hoje 10:00', risk: false },
    { name: 'Gabriel Rios', age: 29, conv: 'Hapvida', lastVisit: '11 mar', next: 'Hoje 11:00', risk: false },
    { name: 'Lucas Alves', age: 44, conv: 'Particular', lastVisit: '10 mar', next: 'Hoje 14:00', risk: false },
    { name: 'Mariana Vaz', age: 36, conv: 'Unimed', lastVisit: '11 mar', next: 'Hoje 15:30', risk: false },
    { name: 'Natália Braga', age: 27, conv: 'Amil', lastVisit: '13 mar', next: 'Hoje 16:00', risk: false },
    { name: 'Carlos Souza', age: 53, conv: 'Bradesco', lastVisit: '12 mar', next: '18 mar', risk: false },
  ],
  lp: [
    { name: 'Ana Paula Costa', age: 31, conv: 'Bradesco', lastVisit: '14 mar', next: 'Hoje 09:30', risk: false },
    { name: 'Julia Lemos', age: 28, conv: 'Bradesco', lastVisit: '13 mar', next: 'Hoje 11:30', risk: false },
    { name: 'Daniela Faria', age: 35, conv: 'Particular', lastVisit: '10 mar', next: '19 mar', risk: true },
  ],
};

// ─── 4. PATIENTS_TABLE ───────────────────────────────────────────────────────

export const PATIENTS_TABLE: PatientTableRow[] = [
  {
    name: 'Maria Aparecida Silva',
    age: 45,
    sex: 'F',
    cpf: '***.***.***-12',
    convenio: 'Amil Gold',
    lastVisit: '10 mar 2026',
    prontuario: 'Completo',
    badgeColor: 'green',
  },
  {
    name: 'João Carlos Ferreira',
    age: 62,
    sex: 'M',
    cpf: '***.***.***-45',
    convenio: 'Unimed Flex',
    lastVisit: '12 mar 2026',
    prontuario: 'Pendente',
    badgeColor: 'amber',
  },
  {
    name: 'Ana Paula Costa',
    age: 31,
    sex: 'F',
    cpf: '***.***.***-78',
    convenio: 'Bradesco Top',
    lastVisit: '14 mar 2026',
    prontuario: 'Completo',
    badgeColor: 'green',
  },
  {
    name: 'Pedro Henrique Rocha',
    age: 38,
    sex: 'M',
    cpf: '***.***.***-33',
    convenio: 'SulAmérica',
    lastVisit: '14 mar 2026',
    prontuario: 'Incompleto',
    badgeColor: 'red',
  },
  {
    name: 'Fernanda Torres Melo',
    age: 28,
    sex: 'F',
    cpf: '***.***.***-91',
    convenio: 'Amil Standard',
    lastVisit: '08 mar 2026',
    prontuario: 'Completo',
    badgeColor: 'green',
  },
];

// ─── 5. GUIAS_TISS ───────────────────────────────────────────────────────────

export const GUIAS_TISS: GuiaTiss[] = [
  {
    paciente: 'Maria Aparecida Silva',
    sub: '10101012 · 1 proc.',
    convenio: 'Amil Gold',
    convBadge: 'teal',
    procedimentos: '10101012',
    valor: 'R$ 420,00',
    statusIA: '✓ Validado',
    statusBadge: 'green',
    auditoria: 'Sem alertas',
    auditoriaColor: 'green',
    acao: 'Enviar',
  },
  {
    paciente: 'João Carlos Ferreira',
    sub: '3 procedimentos',
    convenio: 'Unimed Flex',
    convBadge: 'amber',
    procedimentos: '40304361, 40302558',
    valor: 'R$ 2.100,00',
    statusIA: '⚠ Alerta',
    statusBadge: 'amber',
    auditoria: 'Autorização prévia',
    auditoriaColor: 'amber',
    acao: 'Revisar',
    highlight: 'amber',
  },
  {
    paciente: 'Ana Paula Costa',
    sub: 'Consulta pediátrica',
    convenio: 'Bradesco Top',
    convBadge: 'purple',
    procedimentos: '10101012',
    valor: 'R$ 180,00',
    statusIA: '✓ Validado',
    statusBadge: 'green',
    auditoria: 'Sem alertas',
    auditoriaColor: 'green',
    acao: 'Enviar',
  },
  {
    paciente: 'Pedro Henrique Rocha',
    sub: 'Procedimento cirúrgico',
    convenio: 'SulAmérica',
    convBadge: 'blue',
    procedimentos: '30715017',
    valor: 'R$ 890,00',
    statusIA: '✗ Bloqueado',
    statusBadge: 'red',
    auditoria: 'Autorizaç. ausente',
    auditoriaColor: 'red',
    acao: 'Corrigir',
    highlight: 'red',
  },
  {
    paciente: 'Fernanda Torres Melo',
    sub: 'Retorno + exame',
    convenio: 'Amil Standard',
    convBadge: 'teal',
    procedimentos: '10101012, 40304590',
    valor: 'R$ 380,00',
    statusIA: '✓ Validado',
    statusBadge: 'green',
    auditoria: 'Sem alertas',
    auditoriaColor: 'green',
    acao: 'Enviar',
  },
];

// ─── 6. CONCILIACAO ──────────────────────────────────────────────────────────

export const CONCILIACAO: ConciliacaoItem[] = [
  {
    convenio: 'Amil',
    badge: 'teal',
    guias: 47,
    enviado: 'R$ 18.420,00',
    recebido: 'R$ 17.980,00',
    glosa: 'R$ 440,00',
    status: 'Conciliado',
    statusBadge: 'green',
    diff: '-R$ 440,00',
    diffColor: 'red',
  },
  {
    convenio: 'Unimed',
    badge: 'amber',
    guias: 38,
    enviado: 'R$ 31.200,00',
    recebido: 'R$ 28.650,00',
    glosa: 'R$ 2.550,00',
    status: 'Divergência',
    statusBadge: 'amber',
    diff: '-R$ 2.550,00',
    diffColor: 'red',
  },
  {
    convenio: 'Bradesco',
    badge: 'purple',
    guias: 22,
    enviado: 'R$ 9.870,00',
    recebido: 'R$ 9.870,00',
    glosa: 'R$ 0,00',
    status: 'Conciliado',
    statusBadge: 'green',
    diff: 'R$ 0,00',
    diffColor: 'green',
  },
  {
    convenio: 'SulAmérica',
    badge: 'blue',
    guias: 15,
    enviado: 'R$ 12.340,00',
    recebido: 'R$ 0,00',
    glosa: '-',
    status: 'Aguardando',
    statusBadge: 'blue',
  },
  {
    convenio: 'Hapvida',
    badge: 'green',
    guias: 9,
    enviado: 'R$ 4.100,00',
    recebido: 'R$ 3.950,00',
    glosa: 'R$ 150,00',
    status: 'Divergência',
    statusBadge: 'amber',
    diff: '-R$ 150,00',
    diffColor: 'red',
  },
];

// ─── 7. CONVENIO_PROFILES ────────────────────────────────────────────────────

export const CONVENIO_PROFILES: ConvenioProfile[] = [
  {
    name: 'Unimed',
    badge: 'amber',
    risco: 'Alto',
    riscoBadge: 'red',
    glosa: '8,2%',
    prazo: '30 dias',
    obs: 'Exige autorização prévia para procedimentos acima de R$ 500',
  },
  {
    name: 'Amil',
    badge: 'teal',
    risco: 'Médio',
    riscoBadge: 'amber',
    glosa: '2,4%',
    prazo: '45 dias',
    obs: 'Alta taxa de glosa em retornos sem intervalo mínimo de 7 dias',
  },
  {
    name: 'Bradesco',
    badge: 'purple',
    risco: 'Baixo',
    riscoBadge: 'green',
    glosa: '0,9%',
    prazo: '20 dias',
    obs: 'Pagamento pontual; auditoria aleatória em 5% das guias',
  },
  {
    name: 'SulAmérica',
    badge: 'blue',
    risco: 'Médio',
    riscoBadge: 'amber',
    glosa: '4,1%',
    prazo: '35 dias',
    obs: 'Procedimentos cirúrgicos requerem laudos detalhados',
  },
  {
    name: 'Hapvida',
    badge: 'green',
    risco: 'Baixo',
    riscoBadge: 'green',
    glosa: '1,8%',
    prazo: '25 dias',
    obs: 'Rede restrita; verificar credenciamento antes de atender',
  },
  {
    name: 'Particular',
    badge: 'zinc',
    risco: 'Baixo',
    riscoBadge: 'green',
    glosa: '0,0%',
    prazo: 'Imediato',
    obs: 'Pagamento direto; emitir recibo detalhado ao paciente',
  },
];

// ─── 8. AGENT_RESPONSES ──────────────────────────────────────────────────────

export const AGENT_RESPONSES: AgentResponse[] = [
  {
    keywords: ['glosa', 'glosado', 'glosada', 'glosas'],
    response:
      'Analisando o histórico de glosas da clínica: a Unimed representa 68% das glosas recentes (R$ 2.550 em março), principalmente por falta de autorização prévia. A Amil responde por 17% (R$ 440), com foco em retornos sem intervalo mínimo. Recomendo revisar as 3 guias Unimed pendentes antes do envio desta semana. Deseja que eu gere um relatório detalhado por convênio?',
  },
  {
    keywords: ['faturamento', 'faturar', 'receita', 'financeiro'],
    response:
      'Resumo financeiro de março/2026: Total faturado R$ 75.930,00 · Total recebido até hoje R$ 60.450,00 · Em aberto R$ 15.480,00 · Glosas R$ 3.140,00 (4,1%). A SulAmérica ainda não processou 15 guias (R$ 12.340). O prazo de pagamento vence em 5 dias. Devo enviar um alerta automático para o setor financeiro?',
  },
  {
    keywords: ['agenda', 'agendamento', 'consulta', 'horário', 'disponível'],
    response:
      'Visão geral da agenda desta semana: Dr. Carlos Mendes — 18 consultas (78% de ocupação) · Dra. Ana Figueiredo — 14 consultas (65%) · Dr. Ricardo Braga — 20 consultas (88%, quase lotado) · Dra. Larissa Porto — 11 consultas (55%, há slots disponíveis). Para hoje à tarde ainda existem 3 horários livres. Deseja que eu sugira redistribuição de pacientes?',
  },
  {
    keywords: ['risco', 'alto risco', 'paciente risco', 'alerta'],
    response:
      'Pacientes em monitoramento de risco esta semana: Roberto Campos (51a, Particular) — histórico cardiovascular, consulta hoje 15:45 com Dr. Carlos Mendes · Fernanda Cruz (61a, SulAmérica) — pós-operatório, consulta hoje 09:00 com Dra. Ana Figueiredo · Igor Pinto (39a, Unimed) — hipertensão descompensada, próxima consulta 27/mar. Deseja ver o prontuário completo de algum deles?',
  },
  {
    keywords: ['tiss', 'guia', 'xml', 'ans', 'envio'],
    response:
      'Status das guias TISS: 3 guias prontas para envio (✓ Validado) · 1 guia aguardando revisão — João Carlos Ferreira (Unimed, autorização prévia pendente) · 1 guia bloqueada — Pedro Henrique Rocha (SulAmérica, autorização ausente). Posso gerar o XML TISS 3.05 para as guias validadas agora. Confirma o envio em lote?',
  },
  {
    keywords: ['paciente', 'prontuário', 'prontuario', 'histórico', 'historico'],
    response:
      'Há 5 pacientes com prontuário ativo nesta semana. João Carlos Ferreira (62a) está com prontuário pendente de atualização — última consulta 12/mar. Pedro Henrique Rocha (38a) tem prontuário incompleto — faltam resultados de exame. Deseja que eu liste os campos faltantes ou abra o prontuário de um paciente específico?',
  },
  {
    keywords: ['convenio', 'convênio', 'operadora', 'plano'],
    response:
      'Perfil de risco dos convênios ativos: Unimed — risco ALTO (8,2% de glosa, exige autorização prévia > R$ 500) · Amil — risco MÉDIO (2,4% de glosa, atenção a retornos) · SulAmérica — risco MÉDIO (4,1%, laudos cirúrgicos obrigatórios) · Bradesco e Hapvida — risco BAIXO. Recomendação: auditar guias Unimed antes do envio. Deseja detalhes de algum convênio?',
  },
  {
    keywords: ['relatório', 'relatorio', 'resumo', 'dashboard'],
    response:
      'Posso gerar os seguintes relatórios: (1) Produtividade médica por período · (2) Glosas por convênio e motivo · (3) Ocupação de agenda por médico · (4) Conciliação financeira mensal · (5) Pacientes de alto risco. Qual deles deseja exportar? Formatos disponíveis: PDF, Excel, CSV.',
  },
  {
    keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'],
    response:
      'Olá! Sou o Agente IA do Clinix. Posso ajudar com análise de glosas, faturamento TISS, agenda médica, pacientes de risco e relatórios financeiros. O que você precisa hoje?',
  },
  {
    keywords: ['obrigado', 'obrigada', 'valeu', 'thanks'],
    response:
      'Disponha! Estou sempre aqui para ajudar com a gestão da clínica. Se precisar de mais análises ou relatórios, é só chamar.',
  },
];

// ─── 9. findAgentResponse ─────────────────────────────────────────────────────

export function findAgentResponse(input: string): string {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const entry of AGENT_RESPONSES) {
    const matched = entry.keywords.some((kw) => {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(kwNorm);
    });
    if (matched) return entry.response;
  }

  return 'Não encontrei uma resposta específica para essa pergunta. Posso ajudar com glosas, faturamento, agenda, pacientes de risco, guias TISS ou relatórios financeiros. Como posso te ajudar?';
}

// ─── 10. NAV_ITEMS ────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { icon: 'LayoutDashboard', label: 'Dashboard', route: '/' },
  { icon: 'CalendarDays', label: 'Agenda', route: '/agenda' },
  { icon: 'Users', label: 'Pacientes', route: '/pacientes' },
  { icon: 'FileText', label: 'Faturamento', route: '/faturamento', badge: 2 },
  { icon: 'DollarSign', label: 'Financeiro', route: '/financeiro' },
  { icon: 'Bot', label: 'Agente IA', route: '/agente', badge: 'Novo' },
];
