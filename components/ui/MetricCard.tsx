'use client'

import { useState } from 'react'

type DeltaDirection = 'up' | 'down' | 'neutral'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: string
  deltaDirection?: DeltaDirection
  icon?: React.ReactNode
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

const deltaColorMap: Record<DeltaDirection, string> = {
  up: '#34d399',
  down: '#f87171',
  neutral: 'var(--text3)',
}

const deltaIconMap: Record<DeltaDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '—',
}

export default function MetricCard({
  label,
  value,
  delta,
  deltaDirection = 'neutral',
  icon,
  suffix,
  className,
  style,
}: MetricCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${hovered ? 'var(--border2)' : 'var(--border)'}`,
        borderRadius: 'var(--r)',
        padding: '16px 18px',
        transition: 'border-color 0.18s',
        cursor: 'default',
        ...style,
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              color: 'var(--text3)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 5,
          marginBottom: delta ? 8 : 0,
        }}
      >
        <span
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              fontWeight: 400,
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Delta */}
      {delta && (
        <div
          style={{
            fontSize: 11,
            color: deltaColorMap[deltaDirection],
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontWeight: 500,
          }}
        >
          <span>{deltaIconMap[deltaDirection]}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  )
}
