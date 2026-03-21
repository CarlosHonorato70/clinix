/**
 * Distributed rate limiter backed by Redis with in-memory fallback.
 * Uses sliding window counters via Redis INCR + EXPIRE.
 */

import { redis, isRedisAvailable } from '@/lib/db/redis'

// ─── In-memory fallback (single instance only) ───────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memStore = new Map<string, RateLimitEntry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memStore) {
      if (now > entry.resetAt) memStore.delete(key)
    }
  }, 5 * 60 * 1000)
}

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + config.windowSec * 1000 })
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowSec * 1000 }
  }

  entry.count++

  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

// ─── Redis rate limiter ──────────────────────────────────────────────────

async function checkRedisRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`
  const now = Date.now()

  const count = await redis.incr(redisKey)

  if (count === 1) {
    await redis.expire(redisKey, config.windowSec)
  }

  const ttl = await redis.ttl(redisKey)
  const resetAt = now + ttl * 1000

  if (count > config.max) {
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining: config.max - count, resetAt }
}

// ─── Public API ──────────────────────────────────────────────────────────

export interface RateLimitConfig {
  max: number
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

let _redisAvailable: boolean | null = null

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  // Cache Redis availability check (re-check every 60s)
  if (_redisAvailable === null) {
    _redisAvailable = await isRedisAvailable()
    if (_redisAvailable) {
      setTimeout(() => { _redisAvailable = null }, 60_000)
    } else {
      setTimeout(() => { _redisAvailable = null }, 10_000)
    }
  }

  if (_redisAvailable) {
    try {
      return await checkRedisRateLimit(key, config)
    } catch {
      _redisAvailable = null
      return checkMemoryRateLimit(key, config)
    }
  }

  return checkMemoryRateLimit(key, config)
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
  login: { max: 5, windowSec: 900 },
  loginAccount: { max: 10, windowSec: 900 },
  refresh: { max: 10, windowSec: 60 },
  agentChat: { max: 10, windowSec: 60 },
  api: { max: 60, windowSec: 60 },
} as const

// ─── Account lockout ─────────────────────────────────────────────────────

export async function recordLoginFailure(email: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  const key = `lockout:${email.toLowerCase()}`
  const MAX_ATTEMPTS = 5
  const LOCKOUT_SEC = 900 // 15 min

  if (_redisAvailable) {
    try {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, LOCKOUT_SEC)

      return {
        locked: count >= MAX_ATTEMPTS,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - count),
      }
    } catch {
      return { locked: false, attemptsLeft: MAX_ATTEMPTS }
    }
  }

  // Memory fallback
  const entry = memStore.get(key)
  const now = Date.now()
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + LOCKOUT_SEC * 1000 })
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1 }
  }
  entry.count++
  return {
    locked: entry.count >= MAX_ATTEMPTS,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - entry.count),
  }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const key = `lockout:${email.toLowerCase()}`

  if (_redisAvailable) {
    try {
      const count = await redis.get(key)
      return count !== null && parseInt(count, 10) >= 5
    } catch {
      return false
    }
  }

  const entry = memStore.get(key)
  if (!entry || Date.now() > entry.resetAt) return false
  return entry.count >= 5
}

export async function clearLoginFailures(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`

  if (_redisAvailable) {
    try { await redis.del(key) } catch { /* fallback */ }
  }
  memStore.delete(key)
}
