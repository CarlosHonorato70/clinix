import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('Password', () => {
  it('should hash and verify correctly', async () => {
    const password = 'medflow123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)

    const valid = await verifyPassword(password, hash)
    expect(valid).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const valid = await verifyPassword('wrong-password', hash)
    expect(valid).toBe(false)
  })

  it('should produce different hashes for same password', async () => {
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2) // bcrypt salt is random
  })
})
