import { describe, it, expect } from 'vitest'
import { loginSchema, pacienteCreateSchema, agendamentoCreateSchema, agenteChatSchema } from '../schemas'

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({ email: 'admin@clinix.dev', password: 'clinix123' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-email', password: '123456' })
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: '12' })
      expect(result.success).toBe(false)
    })
  })

  describe('pacienteCreateSchema', () => {
    it('should accept valid patient', () => {
      const result = pacienteCreateSchema.safeParse({ nome: 'João Silva' })
      expect(result.success).toBe(true)
    })

    it('should reject empty nome', () => {
      const result = pacienteCreateSchema.safeParse({ nome: '' })
      expect(result.success).toBe(false)
    })

    it('should validate CPF format', () => {
      const valid = pacienteCreateSchema.safeParse({ nome: 'Ana', cpf: '123.456.789-00' })
      expect(valid.success).toBe(true)

      const invalid = pacienteCreateSchema.safeParse({ nome: 'Ana', cpf: '12345678900' })
      expect(invalid.success).toBe(false)
    })
  })

  describe('agendamentoCreateSchema', () => {
    it('should accept valid appointment', () => {
      const result = agendamentoCreateSchema.safeParse({
        medicoId: '123e4567-e89b-12d3-a456-426614174000',
        pacienteId: '223e4567-e89b-12d3-a456-426614174000',
        dataHora: '2026-03-20T10:00:00',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const result = agendamentoCreateSchema.safeParse({ medicoId: 'not-uuid' })
      expect(result.success).toBe(false)
    })
  })

  describe('agenteChatSchema', () => {
    it('should accept valid message', () => {
      const result = agenteChatSchema.safeParse({ message: 'Qual a taxa de glosa?' })
      expect(result.success).toBe(true)
    })

    it('should reject empty message', () => {
      const result = agenteChatSchema.safeParse({ message: '' })
      expect(result.success).toBe(false)
    })
  })
})
