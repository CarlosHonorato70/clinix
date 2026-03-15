/**
 * LGPD Data Retention Policy
 *
 * Based on Brazilian regulations:
 * - CFM Resolution 1821/2007: Medical records must be kept for 20 years
 * - Tax records (NF, guias): 5 years (CTN Art. 173)
 * - Audit logs: 5 years
 * - Session/auth data: 30 days after last activity
 */

export const RETENTION_POLICIES = {
  /** Medical records (consultas, prontuários) */
  medical: {
    label: 'Prontuários médicos',
    years: 20,
    regulation: 'CFM Resolução 1821/2007',
    note: 'Não pode ser deletado, apenas anonimizado após o período',
  },

  /** Financial/billing records */
  financial: {
    label: 'Registros financeiros (guias TISS, NF)',
    years: 5,
    regulation: 'CTN Art. 173',
    note: 'Manter para fins fiscais',
  },

  /** Audit logs */
  audit: {
    label: 'Logs de auditoria',
    years: 5,
    regulation: 'LGPD Art. 37',
    note: 'Demonstrar conformidade',
  },

  /** Patient personal data (when inactive) */
  patientData: {
    label: 'Dados pessoais de pacientes inativos',
    years: 20,
    regulation: 'CFM + LGPD',
    note: 'Vinculado ao prazo do prontuário médico',
  },

  /** Session data */
  session: {
    label: 'Dados de sessão/autenticação',
    days: 30,
    regulation: 'Boas práticas de segurança',
    note: 'Purgar após 30 dias de inatividade',
  },

  /** Consent records */
  consent: {
    label: 'Registros de consentimento',
    years: 5,
    regulation: 'LGPD Art. 8, §5',
    note: 'Manter para comprovação',
  },
} as const
