'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'warning' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  /** true once the dismiss animation starts */
  leaving?: boolean
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return ctx
}

// ─── Config per type ──────────────────────────────────────────────────────────

const typeConfig: Record<
  ToastType,
  { icon: string; borderColor: string; iconColor: string }
> = {
  success: {
    icon: '✓',
    borderColor: 'rgba(16,185,129,0.3)',
    iconColor: '#34d399',
  },
  warning: {
    icon: '⚠',
    borderColor: 'rgba(245,158,11,0.3)',
    iconColor: '#fbbf24',
  },
  error: {
    icon: '✗',
    borderColor: 'rgba(239,68,68,0.3)',
    iconColor: '#f87171',
  },
  info: {
    icon: 'ℹ',
    borderColor: 'rgba(59,130,246,0.3)',
    iconColor: '#93bbfc',
  },
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

const DISMISS_DURATION = 3500
const LEAVE_ANIMATION_MS = 260

interface SingleToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

function SingleToast({ toast, onDismiss }: SingleToastProps) {
  const cfg = typeConfig[toast.type]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 14px',
        background: 'var(--bg3)',
        border: `1px solid ${cfg.borderColor}`,
        borderRadius: 'var(--r)',
        minWidth: 260,
        maxWidth: 360,
        boxSizing: 'border-box',
        animation: toast.leaving
          ? 'toastLeave 0.26s ease forwards'
          : 'slideUp 0.22s ease, fadeIn 0.22s ease',
        pointerEvents: 'auto',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: cfg.iconColor,
          flexShrink: 0,
          marginTop: 1,
          lineHeight: 1,
        }}
      >
        {cfg.icon}
      </span>

      {/* Message */}
      <span
        style={{
          fontSize: 13,
          color: 'var(--text)',
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {toast.message}
      </span>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text3)',
          fontSize: 14,
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text3)'
        }}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    // Mark as leaving to trigger out-animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, LEAVE_ANIMATION_MS)
  }, [])

  const notify = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${++counterRef.current}`
      setToasts((prev) => [...prev, { id, message, type }])

      setTimeout(() => {
        dismiss(id)
      }, DISMISS_DURATION)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}

      {/* Toast portal container */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <style>{`
          @keyframes toastLeave {
            from { opacity: 1; transform: translateX(0); }
            to   { opacity: 0; transform: translateX(16px); }
          }
        `}</style>

        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
