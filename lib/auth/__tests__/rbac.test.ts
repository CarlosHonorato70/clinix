import { describe, it, expect } from 'vitest'
import { hasPermission } from '../rbac'

describe('RBAC', () => {
  it('admin should have all permissions', () => {
    expect(hasPermission('admin', 'dashboard:read')).toBe(true)
    expect(hasPermission('admin', 'faturamento:write')).toBe(true)
    expect(hasPermission('admin', 'anything:anything')).toBe(true)
  })

  it('medico should access own patients and records', () => {
    expect(hasPermission('medico', 'pacientes:read_own')).toBe(true)
    expect(hasPermission('medico', 'prontuarios:write_own')).toBe(true)
    expect(hasPermission('medico', 'dashboard:read')).toBe(true)
  })

  it('medico should NOT access billing', () => {
    expect(hasPermission('medico', 'faturamento:read')).toBe(false)
    expect(hasPermission('medico', 'faturamento:write')).toBe(false)
  })

  it('faturista should access billing but NOT prontuarios', () => {
    expect(hasPermission('faturista', 'faturamento:read')).toBe(true)
    expect(hasPermission('faturista', 'faturamento:write')).toBe(true)
    expect(hasPermission('faturista', 'prontuarios:read_own')).toBe(false)
  })

  it('recepcionista should access agenda and patients read-only', () => {
    expect(hasPermission('recepcionista', 'agenda:read')).toBe(true)
    expect(hasPermission('recepcionista', 'agenda:write')).toBe(true)
    expect(hasPermission('recepcionista', 'pacientes:read')).toBe(true)
    expect(hasPermission('recepcionista', 'faturamento:read')).toBe(false)
  })

  it('should reject unknown role', () => {
    expect(hasPermission('unknown' as never, 'anything')).toBe(false)
  })
})
