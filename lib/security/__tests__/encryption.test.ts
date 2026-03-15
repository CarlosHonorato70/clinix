import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
})

describe('Encryption', () => {
  it('should encrypt and decrypt roundtrip', async () => {
    const { encrypt, decrypt } = await import('../encryption')
    const plaintext = '123.456.789-00'
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(encrypted.split(':')).toHaveLength(3) // iv:tag:cipher

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for same input (random IV)', async () => {
    const { encrypt } = await import('../encryption')
    const e1 = encrypt('test')
    const e2 = encrypt('test')
    expect(e1).not.toBe(e2)
  })

  it('should reject tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('../encryption')
    const encrypted = encrypt('sensitive data')
    const parts = encrypted.split(':')
    parts[2] = parts[2].slice(0, -3) + 'xxx' // tamper
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('encryptField should handle null/empty', async () => {
    const { encryptField, decryptField } = await import('../encryption')
    expect(encryptField(null)).toBeNull()
    expect(encryptField(undefined)).toBeNull()
    expect(encryptField('')).toBeNull()
    expect(decryptField(null)).toBeNull()
  })

  it('maskCpf should mask correctly', async () => {
    const { maskCpf, encrypt } = await import('../encryption')
    // Plain CPF
    expect(maskCpf('123.456.789-00')).toBe('***.***.***-00')

    // Encrypted CPF
    const encrypted = encrypt('123.456.789-55')
    expect(maskCpf(encrypted)).toBe('***.***.***-55')
  })
})
