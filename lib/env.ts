import { z } from 'zod'

/**
 * Runtime validation for required environment variables.
 * Import this module early (e.g. in instrumentation.ts) to fail fast
 * if critical secrets are missing.
 */

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters (hex)'),

  // Optional services — validated only if present
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_BASIC: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  EMAIL_FROM: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let _validated = false

export function validateEnv(): ServerEnv {
  if (_validated) return process.env as unknown as ServerEnv

  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues.map(
      (i) => `  - ${i.path.join('.')}: ${i.message}`
    )
    console.error(
      `\n❌ Missing or invalid environment variables:\n${missing.join('\n')}\n`
    )

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration. Check logs above.')
    }
  }

  _validated = true
  return (result.success ? result.data : process.env) as unknown as ServerEnv
}
