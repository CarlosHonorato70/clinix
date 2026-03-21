/**
 * MedFlow — Catálogo de Operadoras de Saúde Brasileiras
 *
 * Catálogo pré-configurado com endpoints TISS conhecidos,
 * instruções de credenciamento e dados de contato.
 *
 * Fontes:
 * - ANS (gov.br/ans)
 * - Portais TISS das operadoras
 * - Documentação pública de Web Services
 */

export interface OperadoraCatalogo {
  /** Nome da operadora */
  nome: string
  /** Registro ANS (6 dígitos) */
  codigoAns: string
  /** URL do Web Service TISS (quando pública) */
  wsdlUrl?: string
  /** URL do portal do prestador */
  portalPrestador: string
  /** Instruções para obter credenciais WS */
  instrucoes: string
  /** Telefone de suporte ao prestador */
  telefone?: string
  /** Email do coordenador TISS */
  emailTiss?: string
  /** Observações sobre a integração */
  observacoes?: string
  /** Logo/cor para UI */
  cor: string
  /** Se tem integração WS confirmada */
  wsDisponivel: boolean
}

/**
 * Catálogo das principais operadoras do Brasil.
 *
 * IMPORTANTE: As URLs de Web Service TISS são fornecidas pela operadora
 * após credenciamento do prestador. Os endpoints listados aqui são
 * baseados em documentação pública e podem variar por região.
 */
export const OPERADORAS_CATALOGO: OperadoraCatalogo[] = [
  // ─── Hapvida / NotreDame Intermédica ─────────────────────────────
  {
    nome: 'Hapvida',
    codigoAns: '368253',
    wsdlUrl: 'http://www.hapvida.com.br/pls/webhap/tissws.TissNet',
    portalPrestador: 'https://www.hapvida.com.br/pls/webhap/tiss.TissNet',
    instrucoes: 'Acesse o Portal TISS da Hapvida para download do TissNet e manual de integração. O endpoint Web Service é público.',
    telefone: '0800 280 9130',
    cor: '#00a651',
    wsDisponivel: true,
    observacoes: 'Usa software TissNet da ANS. Endpoint WS público disponível.',
  },
  {
    nome: 'NotreDame Intermédica',
    codigoAns: '359017',
    portalPrestador: 'https://www.gndi.com.br/web/prestador',
    instrucoes: 'Após credenciamento, solicite acesso ao Web Service TISS pelo portal do prestador ou ligue para o suporte.',
    telefone: '0800 015 3855',
    cor: '#003d7a',
    wsDisponivel: true,
  },

  // ─── Amil (UnitedHealth) ─────────────────────────────────────────
  {
    nome: 'Amil',
    codigoAns: '326305',
    portalPrestador: 'https://credenciado.amil.com.br/',
    instrucoes: 'Acesse o Portal do Credenciado Amil. O manual do Web Service está em: amil.com.br/amilportal/upload/tiss/Amil_Manual_Webservice.pdf. O Portal de APIs do Grupo Amil está em api-portal-dev.servicos.grupoamil.com.br.',
    telefone: '3004 2206',
    cor: '#e31937',
    wsDisponivel: true,
    observacoes: 'Suporta envio via WebService e upload XML no portal.',
  },

  // ─── Bradesco Saúde ──────────────────────────────────────────────
  {
    nome: 'Bradesco Saúde',
    codigoAns: '005711',
    portalPrestador: 'https://wwws.bradescosaude.com.br/PCBS-GerenciadorPortal/td/loginReferenciado.do',
    instrucoes: 'Cadastre-se no Portal do Referenciado Bradesco Saúde. O endpoint WSDL é fornecido após o primeiro acesso. Consulte também o Portal de APIs: bradescoseguros.com.br/clientes/portal-apis.',
    telefone: '0800 727 9966',
    cor: '#cc092f',
    wsDisponivel: true,
    observacoes: 'Portal de APIs em desenvolvimento. Aceita upload XML e WebService.',
  },

  // ─── SulAmérica ─────────────────────────────────────────────────
  {
    nome: 'SulAmérica Saúde',
    codigoAns: '006246',
    portalPrestador: 'https://portal.sulamericaseguros.com.br/',
    instrucoes: 'Acesse o Portal Saúde Online como Prestador Referenciado. O envio eletrônico de solicitações TISS é feito exclusivamente pela Internet via portal. Solicite as credenciais WS pelo suporte técnico.',
    telefone: '4004 2700',
    cor: '#003399',
    wsDisponivel: true,
    observacoes: 'Adequada à RN190/ANS. Portal corporativo TISS disponível.',
  },

  // ─── Unimed (Nacional) ──────────────────────────────────────────
  {
    nome: 'Unimed Nacional (CNU)',
    codigoAns: '339679',
    portalPrestador: 'https://www1.centralnacionalunimed.com.br/psp/menu.jsf',
    instrucoes: 'O sistema WSD-TISS da Unimed facilita a troca de informações TISS entre a rede Unimed e prestadores. Cada Unimed regional tem seu próprio endpoint. Contate o Coordenador TISS da Unimed da sua região para obter a URL do Web Service.',
    telefone: '0800 722 4030',
    cor: '#00995d',
    wsDisponivel: true,
    observacoes: 'IMPORTANTE: Cada Unimed singular (regional) possui endpoint próprio. A CNU centraliza o intercâmbio entre Unimeds.',
  },
  {
    nome: 'Seguros Unimed',
    codigoAns: '000701',
    portalPrestador: 'https://www.segurosunimed.com.br/login-prestador',
    instrucoes: 'Acesse o portal do prestador Seguros Unimed. Solicite credenciais WS pelo suporte técnico.',
    telefone: '0800 722 4030',
    cor: '#00995d',
    wsDisponivel: true,
  },

  // ─── Outros grandes players ──────────────────────────────────────
  {
    nome: 'Prevent Senior',
    codigoAns: '407429',
    portalPrestador: 'https://www.preventsenior.com.br/',
    instrucoes: 'Contate o setor de credenciamento para acesso ao portal do prestador e endpoints TISS.',
    telefone: '0800 770 4004',
    cor: '#1b4f72',
    wsDisponivel: false,
  },
  {
    nome: 'Porto Seguro Saúde',
    codigoAns: '359661',
    portalPrestador: 'https://www.portoseguro.com.br/saude/prestadores',
    instrucoes: 'Acesse o portal do prestador Porto Seguro Saúde. Endpoint WSDL fornecido após credenciamento.',
    telefone: '0800 727 2449',
    cor: '#004a93',
    wsDisponivel: true,
  },
  {
    nome: 'Cassi',
    codigoAns: '346659',
    portalPrestador: 'https://www.cassi.com.br/prestadores',
    instrucoes: 'Acesse o portal de prestadores Cassi. Integração TISS via portal ou WebService.',
    telefone: '0800 729 0009',
    cor: '#005baa',
    wsDisponivel: true,
  },
  {
    nome: 'Saúde Caixa (Funcef)',
    codigoAns: '304701',
    portalPrestador: 'https://centralsaudecaixa.com.br/',
    instrucoes: 'A Central Saúde Caixa disponibiliza Web Services TISS. Consulte centralsaudecaixa.com.br/faq/webservice-disponiveis para lista de serviços disponíveis e documentação WSDL.',
    telefone: '0800 726 0505',
    cor: '#005ca9',
    wsDisponivel: true,
    observacoes: 'Documentação WS pública disponível no FAQ do portal.',
  },
  {
    nome: 'Care Plus',
    codigoAns: '399884',
    portalPrestador: 'https://www.careplus.com.br/prestadores',
    instrucoes: 'Contate o setor de credenciamento da Care Plus para acesso ao portal e endpoints TISS.',
    telefone: '0800 770 1550',
    cor: '#0e4f40',
    wsDisponivel: false,
  },
  {
    nome: 'Mediservice',
    codigoAns: '352501',
    portalPrestador: 'https://www.mediservice.com.br/',
    instrucoes: 'Acesse o portal do prestador Mediservice para obter endpoints TISS.',
    telefone: '0800 722 8855',
    cor: '#2e3192',
    wsDisponivel: true,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Buscar operadora por nome (fuzzy) */
export function buscarOperadora(nome: string): OperadoraCatalogo | undefined {
  const normalizado = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return OPERADORAS_CATALOGO.find((op) => {
    const opNome = op.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return opNome.includes(normalizado) || normalizado.includes(opNome.split(' ')[0])
  })
}

/** Buscar operadora por código ANS */
export function buscarOperadoraPorAns(codigoAns: string): OperadoraCatalogo | undefined {
  return OPERADORAS_CATALOGO.find((op) => op.codigoAns === codigoAns)
}

/** Listar todas as operadoras com WS disponível */
export function operadorasComWS(): OperadoraCatalogo[] {
  return OPERADORAS_CATALOGO.filter((op) => op.wsDisponivel)
}

/** Gerar instruções de configuração para uma operadora */
export function gerarInstrucoesConfig(operadora: OperadoraCatalogo): string {
  const linhas = [
    `📋 Configuração de integração TISS — ${operadora.nome}`,
    ``,
    `Código ANS: ${operadora.codigoAns}`,
    `Portal do Prestador: ${operadora.portalPrestador}`,
    operadora.telefone ? `Telefone: ${operadora.telefone}` : '',
    ``,
    `📝 Como obter o endpoint Web Service:`,
    operadora.instrucoes,
    ``,
    operadora.wsdlUrl ? `🔗 Endpoint pré-configurado: ${operadora.wsdlUrl}` : '⚠️ Endpoint não disponível publicamente — solicite ao suporte da operadora.',
    ``,
    operadora.observacoes ? `ℹ️ ${operadora.observacoes}` : '',
  ]

  return linhas.filter(Boolean).join('\n')
}
