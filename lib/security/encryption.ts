import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

let _cachedKey: Buffer | null = null
function getKey(): Buffer {
  if (_cachedKey) return _cachedKey
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY não configurada. Gere com: openssl rand -hex 32')
  }
  // M4: valida estritamente o formato. AES-256 exige 32 bytes = 64
  // hex chars. Um key malformado (comprimento errado ou chars não
  // hex) poderia cair em algum fallback silencioso e criptografar
  // com entropia reduzida; aqui falhamos cedo e alto.
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY inválida — precisa ser exatamente 64 caracteres hex (32 bytes). Gere com: openssl rand -hex 32'
    )
  }
  _cachedKey = Buffer.from(key, 'hex')
  return _cachedKey
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

// M4: Formato de dados criptografados: "base64:base64:base64" (iv:tag:cipher).
// Usamos este regex para distinguir "não está criptografado" (legacy) de
// "está criptografado mas corrompido" (erro real que precisa estourar).
const ENCRYPTED_SHAPE = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

/**
 * Encrypts a value if it's not already encrypted (idempotent).
 * Returns null for null/undefined/empty inputs.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null
  // Already encrypted (has iv:tag:cipher format with base64 chars)
  if (ENCRYPTED_SHAPE.test(value)) {
    try {
      decrypt(value)
      return value // Already encrypted and valid
    } catch {
      // Looks encrypted but is not — caller intended plaintext containing colons.
      // Fall through and re-encrypt.
    }
  }
  try {
    return encrypt(value)
  } catch {
    // ENCRYPTION_KEY ausente ou inválida — armazena plaintext e loga warning.
    // Não crashar para não bloquear signup/cadastro.
    console.warn('[Clinix] ENCRYPTION_KEY not available — storing plaintext (configure for LGPD compliance)')
    return value
  }
}

/**
 * Decrypts a value if it's encrypted, returns as-is otherwise.
 * M4: se o valor TEM formato de ciphertext mas o decrypt falha,
 * lançamos — sinal de chave errada ou dados corrompidos, NUNCA
 * devolve ciphertext bruto para a aplicação como se fosse plaintext.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  if (!ENCRYPTED_SHAPE.test(value)) {
    // Legacy plaintext (ou valor pequeno sem ':'), passa direto.
    return value
  }
  return decrypt(value)
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
