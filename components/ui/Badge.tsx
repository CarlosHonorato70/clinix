'use client'

export type BadgeColor =
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'purple'
  | 'teal'
  | 'default'

interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  pulse?: boolean
  className?: string
  style?: React.CSSProperties
}

const colorMap: Record<BadgeColor, React.CSSProperties> = {
  green: {
    background: 'rgba(16,185,129,0.12)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
  },
  amber: {
    background: 'rgba(245,158,11,0.12)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  red: {
    background: 'rgba(239,68,68,0.12)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  blue: {
    background: 'rgba(59,130,246,0.12)',
    color: '#93bbfc',
    border: '1px solid rgba(59,130,246,0.2)',
  },
  purple: {
    background: 'rgba(139,92,246,0.12)',
    color: '#c4b5fd',
    border: '1px solid rgba(139,92,246,0.2)',
  },
  teal: {
    background: 'rgba(20,184,166,0.12)',
    color: '#2dd4bf',
    border: '1px solid rgba(20,184,166,0.2)',
  },
  default: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text2)',
    border: '1px solid var(--border)',
  },
}

export default function Badge({
  children,
  color = 'default',
  pulse = false,
  className,
  style,
}: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1,
        padding: '3px 8px',
        borderRadius: 20,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font)',
        ...(pulse ? { animation: 'pulse 2s infinite' } : {}),
        ...colorMap[color],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
