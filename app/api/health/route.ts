import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { redis, isRedisAvailable } from '@/lib/db/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Database check
  let dbStatus = 'error'
  let dbLatency = 0
  try {
    const start = Date.now()
    await db.execute(sql`SELECT 1`)
    dbLatency = Date.now() - start
    dbStatus = 'ok'
  } catch {
    dbStatus = 'unreachable'
  }

  // M8: Redis check — não é fatal (rate-limit e blacklist têm
  // fallback in-memory), mas queremos visibilidade quando o Redis
  // cair para saber que estamos degradados.
  let redisStatus = 'error'
  let redisLatency = 0
  try {
    const available = await isRedisAvailable()
    if (available) {
      const start = Date.now()
      await redis.ping()
      redisLatency = Date.now() - start
      redisStatus = 'ok'
    } else {
      redisStatus = 'unreachable'
    }
  } catch {
    redisStatus = 'unreachable'
  }

  // Database é crítico, Redis é degradação (não derruba health)
  const overall =
    dbStatus !== 'ok' ? 'unhealthy' : redisStatus !== 'ok' ? 'degraded' : 'healthy'

  const health = {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor(process.uptime()),
    checks: {
      database: { status: dbStatus, latencyMs: dbLatency },
      redis: { status: redisStatus, latencyMs: redisLatency },
    },
  }

  return Response.json(health, {
    status: overall === 'unhealthy' ? 503 : 200,
  })
}
