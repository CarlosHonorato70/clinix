/**
 * Clinix — Módulo TISS
 *
 * Motor completo de faturamento TISS v4.02 com:
 * - Geração de XML (guias consulta, SP/SADT, lotes)
 * - Validação pré-envio (30+ regras de negócio)
 * - Pré-auditoria IA (regras aprendidas + busca semântica)
 * - Gateway SOAP (envio automático às operadoras)
 * - Verificação de elegibilidade
 * - Catálogo de operadoras pré-configurado
 */

export * from './constants'
export * from './xml-builder'
export * from './xml-validator'
export * from './pre-audit'
export * from './elegibilidade'
export * from './gateway'
export * from './operadoras-catalogo'
