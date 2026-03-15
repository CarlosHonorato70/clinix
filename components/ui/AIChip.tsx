'use client'

interface AIChipProps {
  label?: string
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export default function AIChip({
  label = 'IA',
  size = 'md',
  className,
  style,
}: AIChipProps) {
  const isSmall = size === 'sm'

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 3 : 5,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: isSmall ? '2px 8px' : '3px 10px',
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.25))',
        border: '1px solid rgba(139,92,246,0.35)',
        color: '#c4b5fd',
        fontFamily: 'var(--font)',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {/* Spark icon */}
      <svg
        width={isSmall ? 9 : 11}
        height={isSmall ? 9 : 11}
        viewBox="0 0 12 12"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M6 1l1.2 3.8L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2z"
          fill="url(#ai-chip-grad)"
        />
        <defs>
          <linearGradient id="ai-chip-grad" x1="0" y1="0" x2="12" y2="12">
            <stop stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#93bbfc" />
          </linearGradient>
        </defs>
      </svg>
      {label}
    </span>
  )
}
