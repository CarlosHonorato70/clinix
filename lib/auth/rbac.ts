export type Role = 'admin' | 'medico' | 'faturista' | 'recepcionista'

const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  medico: [
    'dashboard:read',
    'agenda:read', 'agenda:write_own',
    'pacientes:read_own',
    'prontuarios:read_own', 'prontuarios:write_own',
    'relatorios:read_partial',
  ],
  faturista: [
    'dashboard:read',
    'pacientes:read',
    'faturamento:read', 'faturamento:write',
    'financeiro:read',
    'agente:read', 'agente:write',
    'relatorios:read',
  ],
  recepcionista: [
    'dashboard:read',
    'agenda:read', 'agenda:write',
    'pacientes:read',
  ],
}

export function hasPermission(role: Role, permission: string): boolean {
  const perms = PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}
