import { describe, it, expect, beforeAll } from 'vitest'

// Set env before imports
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-for-jwt-testing-64-chars-min-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-for-jwt-testing-64-chars-min-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
})

describe('JWT', () => {
  const payload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: '223e4567-e89b-12d3-a456-426614174000',
    role: 'admin',
    email: 'test@medflow.dev',
  }

  it('should sign and verify access token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('../jwt')
    const token = signAccessToken(payload)

    expect(token).toBeTruthy()
    expect(token.split('.')).toHaveLength(3) // JWT format

    const decoded = verifyAccessToken(token)
    expect(decoded.userId).toBe(payload.userId)
    expect(decoded.tenantId).toBe(payload.tenantId)
    expect(decoded.role).toBe(payload.role)
    expect(decoded.email).toBe(payload.email)
  })

  it('should sign and verify refresh token', async () => {
    const { signRefreshToken, verifyRefreshToken } = await import('../jwt')
    const token = signRefreshToken(payload)
    const decoded = verifyRefreshToken(token)
    expect(decoded.userId).toBe(payload.userId)
  })

  it('should reject invalid token', async () => {
    const { verifyAccessToken } = await import('../jwt')
    expect(() => verifyAccessToken('invalid-token')).toThrow()
  })

  it('should reject tampered token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('../jwt')
    const token = signAccessToken(payload)
    const tampered = token.slice(0, -5) + 'xxxxx'
    expect(() => verifyAccessToken(tampered)).toThrow()
  })
})
