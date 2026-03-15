import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  const health = {
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor(process.uptime()),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
    },
  }

  return Response.json(health, {
    status: dbStatus === 'ok' ? 200 : 503,
  })
}
