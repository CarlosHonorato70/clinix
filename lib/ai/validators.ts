/**
 * Clinix — Guard-rails e validadores contra alucinações da IA
 *
 * Toda saída da IA passa por essas validações antes de ser usada/exibida.
 * Camadas:
 *   1. Validação estrutural (existe no banco de referência?)
 *   6. Guard-rails externos (regex, limites, datas)
 */

import { db } from '@/lib/db'
import { tuss } from '@/lib/db/schema'
import { inArray, and, or, isNull, gte } from 'drizzle-orm'

// ─── CID-10 ─────────────────────────────────────────────────────────────────

/**
 * Valida formato CID-10: letra + 2 dígitos + opcional ponto + 1-2 dígitos
 * Exemplos válidos: A00, J45.0, M54.5, Z00.00
 */
export function isValidCidFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false
  return /^[A-TV-Z]\d{2}(\.\d{1,2})?$/i.test(code.trim())
}

/**
 * Normaliza CID-10: uppercase + trim
 */
export function normalizeCid(code: string): string {
  return code.trim().toUpperCase()
}

// ─── TUSS ───────────────────────────────────────────────────────────────────

/**
 * Valida formato TUSS: 8 dígitos (ou 10 para materiais/OPME)
 */
export function isValidTussFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false
  return /^\d{8}(\d{2})?$/.test(code.trim())
}

/**
 * Verifica se código TUSS existe no banco de referência (tabela tuss)
 * e se está dentro da vigência atual.
 */
export async function validateTussCodesInDb(codes: string[]): Promise<{
  valid: string[]
  invalid: string[]
}> {
  if (codes.length === 0) return { valid: [], invalid: [] }

  const normalized = codes.filter(isValidTussFormat)
  if (normalized.length === 0) {
    return { valid: [], invalid: codes }
  }

  const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const found = await db
    .select({ codigo: tuss.codigo })
    .from(tuss)
    .where(
      and(
        inArray(tuss.codigo, normalized),
        or(
          isNull(tuss.vigenciaFim),
          gte(tuss.vigenciaFim, todayStr),
        )
      )
    )

  const foundSet = new Set(found.map((r) => r.codigo))
  const valid = normalized.filter((c) => foundSet.has(c))
  const invalid = codes.filter((c) => !foundSet.has(c))

  return { valid, invalid }
}

// ─── Datas ──────────────────────────────────────────────────────────────────

/**
 * Valida data: formato YYYY-MM-DD, não futura, não anterior a 1900
 */
export function isValidClinicalDate(date: string | null | undefined): boolean {
  if (!date) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false

  const d = new Date(date)
  if (isNaN(d.getTime())) return false

  const now = new Date()
  const minDate = new Date('1900-01-01')

  return d <= now && d >= minDate
}

// ─── Valores monetários ────────────────────────────────────────────────────

/**
 * Valida valor monetário dentro de limites razoáveis
 */
export function isValidMonetaryValue(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return false
  // Valor entre R$ 0,01 e R$ 1.000.000,00
  return num >= 0.01 && num <= 1_000_000
}

// ─── Quantidade ────────────────────────────────────────────────────────────

/**
 * Valida quantidade de procedimento (1 a 999)
 */
export function isValidQuantity(qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1 && qty <= 999
}

// ─── Confiança ─────────────────────────────────────────────────────────────

/**
 * Verifica se score de confiança é válido (0.0 a 1.0)
 */
export function isValidConfidence(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 1
}

/**
 * Categoriza confiança para UI:
 * - high: >= 0.9 (verde)
 * - medium: 0.7-0.9 (amarelo, requer atenção)
 * - low: < 0.7 (vermelho, requer revisão manual obrigatória)
 */
export function confidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

// ─── Validação completa de extração TUSS ───────────────────────────────────

export interface ExtractedProcedure {
  tuss: string
  descricao: string
  quantidade: number
  confianca?: number
}

export interface ValidatedProcedure extends ExtractedProcedure {
  confianca: number
  isValid: boolean
  errors: string[]
}

export interface ExtractionValidation {
  cid10_principal: { code: string; isValid: boolean; confianca: number }
  cid10_secundarios: { code: string; isValid: boolean }[]
  procedimentos: ValidatedProcedure[]
  hasErrors: boolean
  requiresReview: boolean
  summary: {
    totalProcedures: number
    validProcedures: number
    invalidTussCodes: number
    lowConfidenceItems: number
  }
}

export async function validateTussExtraction(extraction: {
  cid10_principal: string
  cid10_secundarios?: string[]
  procedimentos: ExtractedProcedure[]
  confidence?: number
}): Promise<ExtractionValidation> {
  const allTussCodes = extraction.procedimentos.map((p) => p.tuss)
  const { valid: validTussCodes } = await validateTussCodesInDb(allTussCodes)
  const validSet = new Set(validTussCodes)

  const procedimentos: ValidatedProcedure[] = extraction.procedimentos.map((p) => {
    const errors: string[] = []
    const isInDb = validSet.has(p.tuss)
    const isFormatValid = isValidTussFormat(p.tuss)
    const isQtyValid = isValidQuantity(p.quantidade)

    if (!isFormatValid) errors.push('formato TUSS inválido (deve ter 8 ou 10 dígitos)')
    if (!isInDb && isFormatValid) errors.push('código TUSS não encontrado na tabela oficial ANS')
    if (!isQtyValid) errors.push('quantidade inválida (deve ser 1-999)')

    return {
      ...p,
      confianca: p.confianca ?? extraction.confidence ?? 0.5,
      isValid: errors.length === 0,
      errors,
    }
  })

  const principalCid = normalizeCid(extraction.cid10_principal)
  const cid10_principal = {
    code: principalCid,
    isValid: isValidCidFormat(principalCid),
    confianca: extraction.confidence ?? 0.5,
  }

  const cid10_secundarios = (extraction.cid10_secundarios || []).map((code) => {
    const normalized = normalizeCid(code)
    return {
      code: normalized,
      isValid: isValidCidFormat(normalized),
    }
  })

  const invalidTussCodes = procedimentos.filter((p) => !p.isValid).length
  const lowConfidenceItems = procedimentos.filter((p) => p.confianca < 0.7).length
  const hasErrors = invalidTussCodes > 0 || !cid10_principal.isValid
  const requiresReview = hasErrors || lowConfidenceItems > 0

  return {
    cid10_principal,
    cid10_secundarios,
    procedimentos,
    hasErrors,
    requiresReview,
    summary: {
      totalProcedures: procedimentos.length,
      validProcedures: procedimentos.filter((p) => p.isValid).length,
      invalidTussCodes,
      lowConfidenceItems,
    },
  }
}
