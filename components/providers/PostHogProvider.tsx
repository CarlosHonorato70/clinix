'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, trackEvent } from '@/lib/analytics/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize PostHog once
  useEffect(() => {
    initPostHog()
  }, [])

  // Track page views on route change
  useEffect(() => {
    trackEvent('page_viewed', { path: pathname })
  }, [pathname])

  return <>{children}</>
}
