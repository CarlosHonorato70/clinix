import Link from 'next/link'

export const metadata = { title: 'Termos de Uso — Clinix' }

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
}

export default function TermosPage() {
  return (
    <div style={s.page}>
      <div style={s.content}>
        <div style={s.nav}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={s.logo}>M</div>
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Clinix</span>
          </Link>
        </div>

        <h1 style={s.h1}>Termos de Uso</h1>
        <p style={s.updated}>Última atualização: março de 2026</p>

        <h2 style={s.h2}>1. Aceitação dos Termos</h2>
        <p style={s.p}>Ao acessar e utilizar o Clinix, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar o serviço.</p>

        <h2 style={s.h2}>2. Descrição do Serviço</h2>
        <p style={s.p}>O Clinix é uma plataforma SaaS (Software as a Service) de gestão clínica que oferece funcionalidades de agendamento, prontuário eletrônico, faturamento TISS e ferramentas de inteligência artificial para auxílio na gestão de convênios médicos.</p>

        <h2 style={s.h2}>3. Conta e Responsabilidades</h2>
        <p style={s.p}>Você é responsável por manter a confidencialidade das credenciais de acesso à sua conta. Todas as atividades realizadas sob sua conta são de sua responsabilidade. Notifique-nos imediatamente sobre qualquer uso não autorizado.</p>

        <h2 style={s.h2}>4. Uso Aceitável</h2>
        <p style={s.p}>O serviço deve ser utilizado exclusivamente para fins legítimos de gestão clínica médica. É proibido utilizar o sistema para armazenar dados que não sejam relacionados à atividade médica, ou de maneira que viole leis ou regulamentações aplicáveis.</p>

        <h2 style={s.h2}>5. Dados e Privacidade</h2>
        <p style={s.p}>O tratamento de dados pessoais é regido pela nossa Política de Privacidade. Os dados inseridos no sistema pertencem ao cliente (clínica/tenant). O Clinix atua como operador de dados conforme a LGPD.</p>

        <h2 style={s.h2}>6. Inteligência Artificial</h2>
        <p style={s.p}>As funcionalidades de IA são ferramentas de apoio e não substituem o julgamento profissional médico. As sugestões geradas pela IA devem ser validadas por profissionais qualificados antes de qualquer decisão clínica ou administrativa.</p>

        <h2 style={s.h2}>7. Disponibilidade e SLA</h2>
        <p style={s.p}>Nos esforçamos para manter disponibilidade de 99,5% nos planos Basic e Pro. Planos Enterprise possuem SLA dedicado conforme contrato. Manutenções programadas serão comunicadas com antecedência mínima de 48 horas.</p>

        <h2 style={s.h2}>8. Pagamento e Cancelamento</h2>
        <p style={s.p}>As assinaturas são mensais e renovadas automaticamente. O cancelamento pode ser feito a qualquer momento e terá efeito ao final do período já pago. Não há reembolso proporcional para períodos parciais.</p>

        <h2 style={s.h2}>9. Limitação de Responsabilidade</h2>
        <p style={s.p}>O Clinix não se responsabiliza por decisões clínicas, médicas ou financeiras tomadas com base em informações do sistema. O uso do serviço é por conta e risco do usuário, respeitadas as garantias legais aplicáveis.</p>

        <h2 style={s.h2}>10. Alterações nos Termos</h2>
        <p style={s.p}>Podemos atualizar estes termos periodicamente. Alterações significativas serão notificadas por email com antecedência de 30 dias. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.</p>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <Link href="/" style={{ fontSize: 14, color: 'var(--purple)', textDecoration: 'none' }}>
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
