/**
 * Token blacklist for session revocation.
 * Uses Redis with TTL matching the token's remaining lifetime.
 * Falls back to in-memory Map when Redis is unavailable.
 */

import { redis, isRedisAvailable } from '@/lib/db/redis'

const memBlacklist = new Map<string, number>() // token -> expireAt

// Cleanup expired in-memory entries every 5 min
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [token, expireAt] of memBlacklist) {
      if (now > expireAt) memBlacklist.delete(token)
    }
  }, 5 * 60 * 1000)
}

/**
 * Blacklist a token (e.g. on logout). The token will be rejected
 * until its natural expiry.
 */
export async function blacklistToken(token: string, expiresInSec: number): Promise<void> {
  const key = `bl:${token}`

  const available = await isRedisAvailable()
  if (available) {
    try {
      await redis.setex(key, expiresInSec, '1')
      return
    } catch { /* fall through to memory */ }
  }

  memBlacklist.set(token, Date.now() + expiresInSec * 1000)
}

/**
 * Check if a token has been blacklisted.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `bl:${token}`

  const available = await isRedisAvailable()
  if (available) {
    try {
      const val = await redis.get(key)
      return val !== null
    } catch { /* fall through to memory */ }
  }

  const expireAt = memBlacklist.get(token)
  if (!expireAt) return false
  if (Date.now() > expireAt) {
    memBlacklist.delete(token)
    return false
  }
  return true
}
