/**
 * In-memory sliding window rate limiter.
 * In production with multiple instances, replace with Redis via ioredis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  max: number
  /** Window size in seconds */
  windowSec: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 })
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowSec * 1000 }
  }

  entry.count++

  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: 'Muitas requisições. Tente novamente em breve.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
      },
    }
  )
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  login: { max: 5, windowSec: 900 },        // 5 per 15 min
  refresh: { max: 10, windowSec: 60 },       // 10 per minute
  agentChat: { max: 10, windowSec: 60 },     // 10 per minute
  api: { max: 60, windowSec: 60 },           // 60 per minute
} as const
