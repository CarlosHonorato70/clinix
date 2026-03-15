import Link from 'next/link'

export const metadata = { title: 'Política de Privacidade — MedFlow' }

const s = {
  page: { overflow: 'auto' as const, height: '100vh', padding: '40px' },
  nav: {
    display: 'flex' as const, alignItems: 'center' as const, gap: 10,
    marginBottom: 48,
  },
  logo: {
    width: 28, height: 28, borderRadius: 7,
    background: '#8b5cf6', display: 'flex' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    fontWeight: 700 as const, fontSize: 14, color: '#fff',
  },
  content: { maxWidth: 720, margin: '0 auto' as const },
  h1: { fontSize: 28, fontWeight: 700 as const, marginBottom: 8 },
  updated: { fontSize: 13, color: 'var(--text3)', marginBottom: 40 },
  h2: { fontSize: 18, fontWeight: 600 as const, marginTop: 32, marginBottom: 12 },
  p: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 },
  ul: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16, paddingLeft: 20 },
}

export default function PrivacidadePage() {
  return (
    <div style={s.page}>
      <div style={s.content}>
        <div style={s.nav}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={s.logo}>M</div>
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>MedFlow</span>
          </Link>
        </div>

        <h1 style={s.h1}>Política de Privacidade</h1>
        <p style={s.updated}>Última atualização: março de 2026</p>

        <p style={s.p}>Esta Política de Privacidade descreve como o MedFlow coleta, utiliza, armazena e protege os dados pessoais dos usuários e pacientes, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>

        <h2 style={s.h2}>1. Controlador e Operador de Dados</h2>
        <p style={s.p}>A clínica (tenant) é a Controladora dos dados de seus pacientes. O MedFlow atua como Operador, processando os dados conforme as instruções do Controlador e em conformidade com a LGPD.</p>

        <h2 style={s.h2}>2. Dados Coletados</h2>
        <p style={s.p}>Coletamos os seguintes tipos de dados:</p>
        <ul style={s.ul}>
          <li>Dados cadastrais da clínica: nome, CNPJ, endereço, contato</li>
          <li>Dados dos profissionais: nome, email, CRM/CRO, função</li>
          <li>Dados dos pacientes: nome, CPF, data de nascimento, contato, dados clínicos</li>
          <li>Dados de uso: logs de acesso, ações realizadas, endereço IP</li>
        </ul>

        <h2 style={s.h2}>3. Finalidade do Tratamento</h2>
        <p style={s.p}>Os dados são tratados para: prestação do serviço de gestão clínica; agendamento e controle de consultas; gestão de prontuários eletrônicos; faturamento e envio de guias TISS; análise por inteligência artificial para auditoria de convênios; cumprimento de obrigações legais e regulatórias.</p>

        <h2 style={s.h2}>4. Base Legal</h2>
        <p style={s.p}>O tratamento de dados é realizado com base nas seguintes hipóteses legais da LGPD: execução de contrato (Art. 7º, V); consentimento do titular (Art. 7º, I); cumprimento de obrigação legal (Art. 7º, II); tutela da saúde (Art. 7º, VIII).</p>

        <h2 style={s.h2}>5. Segurança dos Dados</h2>
        <p style={s.p}>Implementamos medidas técnicas e organizacionais para proteger os dados pessoais:</p>
        <ul style={s.ul}>
          <li>Criptografia AES-256-GCM para dados sensíveis (CPF, telefone, email de pacientes)</li>
          <li>Autenticação JWT com cookies httpOnly e Secure</li>
          <li>Isolamento de dados por tenant (multi-tenancy)</li>
          <li>Audit log de todas as operações com dados pessoais</li>
          <li>Backup diário com retenção de 30 dias</li>
          <li>HTTPS obrigatório com HSTS</li>
        </ul>

        <h2 style={s.h2}>6. Compartilhamento de Dados</h2>
        <p style={s.p}>Os dados não são vendidos ou compartilhados com terceiros para fins de marketing. O compartilhamento ocorre apenas com: operadoras de planos de saúde (envio de guias TISS, quando iniciado pela clínica); provedores de infraestrutura (servidores, banco de dados) sob contrato de confidencialidade; autoridades competentes, quando exigido por lei.</p>

        <h2 style={s.h2}>7. Retenção de Dados</h2>
        <p style={s.p}>Dados clínicos são mantidos por no mínimo 20 anos conforme exigência do Conselho Federal de Medicina (Resolução CFM nº 1.821/2007). Dados financeiros são mantidos por 5 anos conforme legislação tributária. Logs de auditoria são mantidos por 5 anos.</p>

        <h2 style={s.h2}>8. Direitos do Titular</h2>
        <p style={s.p}>Conforme a LGPD, o titular dos dados tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização ou bloqueio de dados desnecessários; portabilidade dos dados (exportação); revogação do consentimento.</p>
        <p style={s.p}>O exercício desses direitos pode ser realizado diretamente pelo sistema (menu LGPD) ou por contato com o DPO da clínica.</p>

        <h2 style={s.h2}>9. Inteligência Artificial</h2>
        <p style={s.p}>O MedFlow utiliza IA para análise de regras de convênios e auditoria. Os dados enviados à IA são processados de forma segura e não são utilizados para treinamento de modelos. As decisões automatizadas são sempre revisáveis por humanos.</p>

        <h2 style={s.h2}>10. Contato</h2>
        <p style={s.p}>Para questões sobre esta política ou exercício de direitos como titular de dados, entre em contato pelo email de suporte disponível no painel do sistema.</p>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <Link href="/" style={{ fontSize: 14, color: 'var(--purple)', textDecoration: 'none' }}>
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
