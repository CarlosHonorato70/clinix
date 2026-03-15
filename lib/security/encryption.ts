import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY não configurada. Gere com: openssl rand -hex 32')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypts an encrypted string (iv:authTag:ciphertext format).
 */
export function decrypt(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Formato de dados criptografados inválido')
  }

  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const ciphertext = parts[2]

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypts a value if it's not already encrypted (idempotent).
 * Returns null for null/undefined/empty inputs.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null
  // Already encrypted (has iv:tag:cipher format)
  if (value.includes(':') && value.split(':').length === 3) {
    try {
      decrypt(value)
      return value // Already encrypted and valid
    } catch {
      // Not encrypted, proceed to encrypt
    }
  }
  return encrypt(value)
}

/**
 * Decrypts a value if it's encrypted, returns as-is otherwise.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return value // Not encrypted, return as-is
  }
}

/**
 * Masks a CPF for display: ***.***.***-XX
 */
export function maskCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null
  // Decrypt if encrypted
  const plain = decryptField(cpf)
  if (!plain) return null
  // Get last 2 digits
  const digits = plain.replace(/\D/g, '')
  return `***.***.***-${digits.slice(-2)}`
}
