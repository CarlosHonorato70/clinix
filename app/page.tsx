'use client'

import Link from 'next/link'

/* ─── Icon Components ─── */
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

/* ─── Plan Data ─── */
const plans = [
  {
    id: 'basic',
    nome: 'Basic',
    preco: 197,
    destaque: false,
    features: [
      'Até 5 usuários',
      'Até 500 pacientes',
      '100 auditorias IA/mês',
      'Agenda inteligente',
      'Prontuário eletrônico',
      'Faturamento TISS',
      'Relatórios financeiros',
      'Suporte por email',
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 497,
    destaque: true,
    features: [
      'Até 15 usuários',
      'Pacientes ilimitados',
      'Auditorias IA ilimitadas',
      'Tudo do Basic',
      'Regras personalizadas',
      'Exportação LGPD',
      'Suporte prioritário',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: -1,
    destaque: false,
    features: [
      'Usuários ilimitados',
      'Pacientes ilimitados',
      'Auditorias IA ilimitadas',
      'API REST completa',
      'SLA dedicado',
      'Suporte dedicado',
      'Integração customizada',
    ],
  },
]

const features = [
  {
    titulo: 'Agenda Inteligente',
    descricao: 'Gerencie agendamentos com visualização por dia, semana ou mês. Bloqueio automático de horários e controle de status.',
    icone: '📅',
  },
  {
    titulo: 'Prontuário Eletrônico',
    descricao: 'Registre consultas, evolução clínica e histórico do paciente de forma organizada e segura.',
    icone: '📋',
  },
  {
    titulo: 'Faturamento TISS',
    descricao: 'Gere guias TISS automaticamente, controle glosas e faça conciliação com operadoras de saúde.',
    icone: '💰',
  },
  {
    titulo: 'Agente IA de Convênios',
    descricao: 'IA especializada que analisa regras de convênios, identifica glosas e sugere correções automaticamente.',
    icone: '🤖',
  },
  {
    titulo: 'Relatórios Financeiros',
    descricao: 'Dashboard completo com métricas de faturamento, inadimplência, produtividade e tendências.',
    icone: '📊',
  },
  {
    titulo: 'Conformidade LGPD',
    descricao: 'Criptografia de dados sensíveis, consentimento rastreável, exportação e anonimização de dados.',
    icone: '🔒',
  },
]

const faqs = [
  {
    pergunta: 'Posso testar antes de contratar?',
    resposta: 'Sim! Oferecemos 14 dias de teste grátis com todas as funcionalidades, sem necessidade de cartão de crédito.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta: 'Utilizamos criptografia AES-256, autenticação JWT com cookies httpOnly, e estamos em total conformidade com a LGPD. Dados de pacientes são criptografados em repouso.',
  },
  {
    pergunta: 'Como funciona o suporte?',
    resposta: 'No plano Basic, suporte por email com resposta em até 24h. No Pro, suporte prioritário com chat. No Enterprise, suporte dedicado com SLA.',
  },
  {
    pergunta: 'Posso migrar meus dados de outro sistema?',
    resposta: 'Sim, oferecemos importação de dados via planilha para todos os planos. No Enterprise, fazemos a migração completa para você.',
  },
  {
    pergunta: 'O sistema gera guias TISS automaticamente?',
    resposta: 'Sim! O Clinix gera guias TISS de consulta, SP/SADT e internação automaticamente a partir dos dados do atendimento, com validação integrada.',
  },
  {
    pergunta: 'A IA substitui o trabalho do faturista?',
    resposta: 'Não. O agente IA auxilia na análise de regras de convênios e identificação de erros, mas todas as decisões finais são humanas. A IA é uma ferramenta de apoio.',
  },
]

/* ─── Landing Page ─── */
export default function LandingPage() {
  return (
    <div style={{ overflow: 'auto', height: '100vh' }}>
      {/* ─── Navbar ─── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px',
        background: 'rgba(15, 17, 23, 0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--purple)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff',
          }}>C</div>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Clinix</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" style={{
            padding: '8px 20px', borderRadius: 8,
            color: 'var(--text2)', textDecoration: 'none', fontSize: 14,
          }}>Entrar</Link>
          <Link href="/signup" style={{
            padding: '8px 20px', borderRadius: 8,
            background: 'var(--purple)', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
          }}>Começar grátis</Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{
        padding: '100px 40px 80px',
        textAlign: 'center', maxWidth: 800, margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 20,
          background: 'var(--purple-bg)', color: 'var(--purple)',
          fontSize: 13, fontWeight: 500, marginBottom: 24,
        }}>
          14 dias grátis — sem cartão de crédito
        </div>
        <h1 style={{
          fontSize: 48, fontWeight: 700, lineHeight: 1.15,
          marginBottom: 20,
          background: 'linear-gradient(135deg, #e8eaf0 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Gestão clínica inteligente com IA integrada
        </h1>
        <p style={{
          fontSize: 18, color: 'var(--text2)', lineHeight: 1.7,
          marginBottom: 40, maxWidth: 600, margin: '0 auto 40px',
        }}>
          Agenda, prontuário, faturamento TISS e auditoria com inteligência artificial.
          Tudo em um sistema seguro, conforme a LGPD, feito para clínicas brasileiras.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 10,
            background: 'var(--purple)', color: '#fff',
            textDecoration: 'none', fontSize: 16, fontWeight: 600,
            transition: 'transform 0.15s',
          }}>
            Começar teste grátis <IconArrowRight />
          </Link>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{
        padding: '80px 40px', maxWidth: 1100, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 12,
        }}>Tudo que sua clínica precisa</h2>
        <p style={{
          fontSize: 16, color: 'var(--text2)', textAlign: 'center',
          marginBottom: 60, maxWidth: 500, margin: '0 auto 60px',
        }}>
          Ferramentas integradas para gestão completa, do agendamento ao faturamento.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {features.map((f) => (
            <div key={f.titulo} style={{
              padding: 28, borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icone}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.titulo}</h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{f.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section style={{
        padding: '80px 40px', maxWidth: 1100, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 12,
        }}>Planos e preços</h2>
        <p style={{
          fontSize: 16, color: 'var(--text2)', textAlign: 'center',
          marginBottom: 60, maxWidth: 500, margin: '0 auto 60px',
        }}>
          Escolha o plano ideal para o tamanho da sua clínica. Mude a qualquer momento.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24, alignItems: 'start',
        }}>
          {plans.map((p) => (
            <div key={p.id} style={{
              padding: 32, borderRadius: 14,
              background: p.destaque ? 'var(--bg3)' : 'var(--bg2)',
              border: p.destaque ? '2px solid var(--purple)' : '1px solid var(--border)',
              position: 'relative',
            }}>
              {p.destaque && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  padding: '4px 16px', borderRadius: 12,
                  background: 'var(--purple)', color: '#fff',
                  fontSize: 12, fontWeight: 600,
                }}>Mais popular</div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{p.nome}</h3>
              <div style={{ marginBottom: 24 }}>
                {p.preco === -1 ? (
                  <span style={{ fontSize: 28, fontWeight: 700 }}>Sob consulta</span>
                ) : (
                  <>
                    <span style={{ fontSize: 36, fontWeight: 700 }}>R${p.preco}</span>
                    <span style={{ fontSize: 14, color: 'var(--text2)' }}>/mês</span>
                  </>
                )}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28 }}>
                {p.features.map((feat) => (
                  <li key={feat} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0', fontSize: 14, color: 'var(--text2)',
                  }}>
                    <span style={{ color: 'var(--green)' }}><IconCheck /></span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center',
                padding: '12px 0', borderRadius: 8,
                background: p.destaque ? 'var(--purple)' : 'transparent',
                border: p.destaque ? 'none' : '1px solid var(--border2)',
                color: p.destaque ? '#fff' : 'var(--text)',
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
              }}>
                {p.preco === -1 ? 'Falar com vendas' : 'Começar teste grátis'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{
        padding: '80px 40px', maxWidth: 700, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 48,
        }}>Perguntas frequentes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq) => (
            <details key={faq.pergunta} style={{
              padding: '20px 24px', borderRadius: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <summary style={{
                fontSize: 15, fontWeight: 500, cursor: 'pointer',
                listStyle: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                {faq.pergunta}
                <span style={{ fontSize: 18, color: 'var(--text3)', marginLeft: 16 }}>+</span>
              </summary>
              <p style={{
                fontSize: 14, color: 'var(--text2)', lineHeight: 1.7,
                marginTop: 12,
              }}>{faq.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section style={{
        padding: '80px 40px', textAlign: 'center',
        maxWidth: 600, margin: '0 auto',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
          Pronto para modernizar sua clínica?
        </h2>
        <p style={{
          fontSize: 16, color: 'var(--text2)', marginBottom: 32, lineHeight: 1.7,
        }}>
          Comece seu teste grátis de 14 dias. Sem compromisso, sem cartão de crédito.
        </p>
        <Link href="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 32px', borderRadius: 10,
          background: 'var(--purple)', color: '#fff',
          textDecoration: 'none', fontSize: 16, fontWeight: 600,
        }}>
          Criar conta grátis <IconArrowRight />
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        padding: '32px 40px',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--purple)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12, color: '#fff',
          }}>C</div>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            Clinix &copy; {new Date().getFullYear()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/termos" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>Termos de uso</Link>
          <Link href="/privacidade" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>Privacidade</Link>
        </div>
      </footer>
    </div>
  )
}
