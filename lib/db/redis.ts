import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const globalForRedis = globalThis as unknown as { redis: Redis }

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  return client
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

/**
 * Check if Redis is available. Falls back gracefully to in-memory
 * if Redis is not connected.
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect()
    }
    await redis.ping()
    return true
  } catch {
    return false
  }
}
