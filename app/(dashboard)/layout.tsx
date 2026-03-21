'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider, useAuth } from '@/lib/auth/auth-context'
import { useApi } from '@/lib/api/client'

// ─── Route metadata ───────────────────────────────────────────────────────────
const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Sábado, 14 de março de 2026 · Clínica São Lucas',
  },
  '/agenda': {
    title: 'Agenda',
    subtitle: '14 de março de 2026 · 18 agendamentos',
  },
  '/pacientes': {
    title: 'Pacientes',
    subtitle: '1.847 pacientes cadastrados',
  },
  '/prontuarios': {
    title: 'Prontuário Eletrônico',
    subtitle: 'João Carlos Ferreira · 62 anos · Unimed',
  },
  '/faturamento': {
    title: 'Faturamento TISS / IA',
    subtitle: '4 guias aguardam revisão',
  },
  '/financeiro': {
    title: 'Financeiro',
    subtitle: 'Março de 2026 · conciliação em dia',
  },
  '/agente': {
    title: 'Agente IA — Convênios',
    subtitle: '347 regras aprendidas · 12 convênios mapeados',
  },
  '/relatorios': {
    title: 'Relatórios',
    subtitle: 'Inteligência clínica e financeira',
  },
  '/configuracoes': {
    title: 'Configurações',
    subtitle: 'Gerenciar clínica, plano e usuários',
  },
}

// ─── Nav item types ───────────────────────────────────────────────────────────
type BadgeVariant = 'amber' | 'red' | 'blue' | 'purple' | 'none'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: { text: string; variant: BadgeVariant; pulse?: boolean }
}

interface NavSection {
  title: string
  items: NavItem[]
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
  </svg>
)

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="4" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
    <rect x="7" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
    <rect x="10" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
  </svg>
)

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M10.5 2.5a2.5 2.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M13 13a4 4 0 0 0-2.5-3.74" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const IconFileText = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2a1 1 0 0 1 1-1h5.586a1 1 0 0 1 .707.293l2.414 2.414A1 1 0 0 1 13 4.414V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const IconReceipt = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2v12l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M5 5.5h6M5 7.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="9" width="3" height="5" rx="1" fill="currentColor" opacity="0.6" />
    <rect x="6.5" y="6" width="3" height="8" rx="1" fill="currentColor" opacity="0.8" />
    <rect x="11" y="3" width="3" height="11" rx="1" fill="currentColor" />
  </svg>
)

const IconBrain = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2C5.8 2 4 3.8 4 6c0 .8.2 1.5.6 2.1C3.6 8.6 3 9.7 3 11c0 1.7 1.3 3 3 3h4c1.7 0 3-1.3 3-3 0-1.3-.6-2.4-1.6-2.9.4-.6.6-1.3.6-2.1 0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 6v3M6.5 7.5l1.5 1.5 1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const IconTrendingUp = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polyline points="1,12 5,8 8,10 13,4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="10,4 13,4 13,7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Nav sections config ──────────────────────────────────────────────────────
const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', href: '/', icon: <IconDashboard /> },
      {
        label: 'Agenda',
        href: '/agenda',
        icon: <IconCalendar />,
        badge: { text: '3', variant: 'amber' },
      },
      { label: 'Pacientes', href: '/pacientes', icon: <IconUsers /> },
      {
        label: 'Prontuários',
        href: '/prontuarios',
        icon: <IconFileText />,
        badge: { text: 'AI', variant: 'blue' },
      },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      {
        label: 'Faturamento TISS',
        href: '/faturamento',
        icon: <IconReceipt />,
        badge: { text: '4', variant: 'red' },
      },
      { label: 'Financeiro', href: '/financeiro', icon: <IconBarChart /> },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      {
        label: 'Agente IA',
        href: '/agente',
        icon: <IconBrain />,
        badge: { text: '●', variant: 'purple', pulse: true },
      },
      { label: 'Relatórios', href: '/relatorios', icon: <IconTrendingUp /> },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Configurações', href: '/configuracoes', icon: <IconSettings /> },
    ],
  },
]

// ─── Badge colors ─────────────────────────────────────────────────────────────
const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  amber: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  red: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  blue: { background: 'rgba(59,130,246,0.15)', color: '#93bbfc' },
  purple: { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  none: {},
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ pathname, isOpen, onClose }: { pathname: string; isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { data: regrasData } = useApi<{ regras: unknown[] }>('/agente/regras')
  const regrasCount = regrasData?.regras?.length ?? 0
  const userName = user?.nome ?? 'Usuário'
  const userRole = user?.role === 'admin' ? 'Administrador' : user?.role === 'medico' ? 'Médico' : user?.role === 'faturista' ? 'Faturista' : user?.role ?? 'Usuário'
  const userInitials = userName.split(' ').filter((w: string) => w.length > 1).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  return (
    <>
    {/* Mobile overlay */}
    {isOpen && (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 39, display: 'none',
        }}
        className="sidebar-overlay"
      />
    )}
    <aside
      style={{
        width: 'var(--sidebar-w)',
        minWidth: 'var(--sidebar-w)',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        overflowY: 'auto',
        transition: 'transform 0.25s ease',
      }}
      className={isOpen ? 'sidebar-open' : 'sidebar-closed'}
    >
      {/* Brand */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ⚕
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
              MedFlow
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--text3)',
                letterSpacing: '0.02em',
              }}
            >
              v2.0 · IA integrada
            </div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navSections.map((section) => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div
              style={{
                padding: '10px 16px 4px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text3)',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 16px',
                    margin: '1px 8px',
                    borderRadius: 7,
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#93bbfc' : 'var(--text2)',
                    background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background 0.15s, color 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text2)'
                    }
                  }}
                >
                  <span
                    style={{
                      color: isActive ? '#93bbfc' : 'var(--text3)',
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && item.badge.variant !== 'none' && (
                    <span
                      style={{
                        ...badgeStyles[item.badge.variant],
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 7px',
                        borderRadius: 20,
                        ...(item.badge.pulse
                          ? { animation: 'pulse 2s infinite' }
                          : {}),
                      }}
                    >
                      {item.badge.text}
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
        {/* Agent status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--green)',
              flexShrink: 0,
              animation: 'pulse 2s infinite',
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: 'var(--green)',
              fontFamily: 'var(--mono)',
              lineHeight: 1.3,
            }}
          >
            Agente ativo · {regrasCount} regras
          </span>
        </div>

        {/* User chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '6px 8px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              letterSpacing: '0.03em',
            }}
          >
            {userInitials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ pathname, onMenuClick }: { pathname: string; onMenuClick: () => void }) {
  const meta = routeMeta[pathname] ?? {
    title: 'MedFlow',
    subtitle: 'Sistema de Gestão Clínica',
  }

  return (
    <header
      style={{
        height: 'var(--header-h)',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="hamburger-btn"
        style={{
          display: 'none', width: 36, height: 36, borderRadius: 8,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: 18, cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        ☰
      </button>

      {/* Title block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meta.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text3)',
            fontFamily: 'var(--mono)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meta.subtitle}
        </div>
      </div>

      {/* Action buttons */}
      <div className="header-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {/* Ghost button */}
        <button
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'border-color 0.15s, color 0.15s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border2)'
            e.currentTarget.style.color = 'var(--text2)'
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Nova consulta
        </button>

        {/* Primary AI button */}
        <button
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'opacity 0.15s, transform 0.1s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.88'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          Faturar com IA
        </button>
      </div>
    </header>
  )
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <AuthProvider>
    <ToastProvider>
      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
          .sidebar-closed { transform: translateX(-100%); }
          .sidebar-open { transform: translateX(0); }
          .hamburger-btn { display: flex !important; }
          .main-content { margin-left: 0 !important; }
          .header-actions { display: none !important; }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--bg)',
        }}
      >
        <Sidebar pathname={pathname} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main area shifted by sidebar width */}
        <div
          className="main-content"
          style={{
            marginLeft: 'var(--sidebar-w)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            minWidth: 0,
          }}
        >
          <Header pathname={pathname} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
    </AuthProvider>
  )
}
