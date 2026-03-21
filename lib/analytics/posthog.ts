import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function initPostHog(): void {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    loaded: () => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug()
      }
    },
  })

  initialized = true
}

// ─── Typed events ──────────────────────────────────────────────────────────

type EventMap = {
  // Auth
  signup_completed: { plan?: string }
  login: { method: 'credentials' }
  logout: Record<string, never>

  // Patients
  patient_created: { convenio?: string }
  patient_searched: { query: string; results: number }

  // Billing
  guide_sent: { convenio?: string; value?: number }
  guide_reviewed: { status: string }

  // AI
  ai_extraction_used: { procedures: number; cids: number }
  ai_agent_chat: { message_length: number }

  // Onboarding
  onboarding_step_completed: { step: number; step_name: string }
  onboarding_completed: Record<string, never>

  // Navigation
  page_viewed: { path: string }
}

export function trackEvent<K extends keyof EventMap>(
  event: K,
  properties?: EventMap[K]
): void {
  if (!initialized || !POSTHOG_KEY) return
  posthog.capture(event, properties)
}

export function identifyUser(user: {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  plan?: string
}): void {
  if (!initialized || !POSTHOG_KEY) return

  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    role: user.role,
    tenant_id: user.tenantId,
    plan: user.plan,
  })
}

export function resetUser(): void {
  if (!initialized || !POSTHOG_KEY) return
  posthog.reset()
}

export { posthog }
