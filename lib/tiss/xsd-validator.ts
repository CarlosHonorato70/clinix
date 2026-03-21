/**
 * Clinix — Validador XSD TISS (Homologação ANS)
 *
 * Valida XML gerado contra os schemas XSD oficiais da ANS.
 * Usado para garantir conformidade antes do envio às operadoras.
 *
 * Nota: validação completa contra XSD requer uma lib XML como libxmljs.
 * Esta implementação faz validação estrutural básica sem dependência externa,
 * cobrindo os erros mais comuns de homologação.
 *
 * Para validação XSD completa, use: https://www.validadortiss.com.br/
 */

import { TISS_NAMESPACE, REGEX, TABELA_TUSS } from './constants'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface XsdValidationIssue {
  tipo: 'estrutura' | 'conteudo' | 'hash' | 'namespace' | 'versao'
  campo: string
  mensagem: string
  severidade: 'erro' | 'aviso'
}

export interface XsdValidationResult {
  valido: boolean
  versaoDetectada: string | null
  erros: XsdValidationIssue[]
  avisos: XsdValidationIssue[]
  resumo: {
    totalGuias: number
    tiposGuia: string[]
    hashValido: boolean
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTagValue(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([^<]+)<`, 'i')
  return xml.match(regex)?.[1]?.trim()
}

function countOccurrences(xml: string, tag: string): number {
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[\\s>]`, 'gi')
  return (xml.match(regex) || []).length
}

function extractAllTagValues(xml: string, tag: string): string[] {
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([^<]+)<`, 'gi')
  const values: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    values.push(match[1].trim())
  }
  return values
}

// ─── Validador principal ─────────────────────────────────────────────────────

export function validateTissXml(xml: string): XsdValidationResult {
  const erros: XsdValidationIssue[] = []
  const avisos: XsdValidationIssue[] = []

  // 1. XML declaration
  if (!xml.startsWith('<?xml')) {
    erros.push({ tipo: 'estrutura', campo: 'xml', mensagem: 'Declaração XML ausente (<?xml version="1.0"?>)', severidade: 'erro' })
  }

  // 2. Namespace
  if (!xml.includes(TISS_NAMESPACE)) {
    erros.push({ tipo: 'namespace', campo: 'mensagemTISS', mensagem: `Namespace TISS ausente: ${TISS_NAMESPACE}`, severidade: 'erro' })
  }

  // 3. Versão do padrão
  const versao = extractTagValue(xml, 'Padrao')
  if (!versao) {
    erros.push({ tipo: 'versao', campo: 'Padrao', mensagem: 'Tag <Padrao> obrigatória não encontrada no cabeçalho', severidade: 'erro' })
  } else if (!versao.startsWith('4.')) {
    erros.push({ tipo: 'versao', campo: 'Padrao', mensagem: `Versão ${versao} obsoleta — ANS exige v4.02.00+`, severidade: 'erro' })
  }

  // 4. Cabeçalho obrigatório
  const campos = ['tipoTransacao', 'sequencialTransacao', 'dataRegistroTransacao']
  for (const campo of campos) {
    if (!extractTagValue(xml, campo)) {
      erros.push({ tipo: 'estrutura', campo, mensagem: `Campo obrigatório <${campo}> ausente no cabeçalho`, severidade: 'erro' })
    }
  }

  // 5. Origem (prestador)
  if (!xml.includes('identificacaoPrestador')) {
    erros.push({ tipo: 'estrutura', campo: 'identificacaoPrestador', mensagem: 'Identificação do prestador ausente na origem', severidade: 'erro' })
  }

  // 6. Destino (operadora)
  const registroAns = extractTagValue(xml, 'registroANS')
  if (!registroAns) {
    erros.push({ tipo: 'conteudo', campo: 'registroANS', mensagem: 'Registro ANS da operadora ausente no destino', severidade: 'erro' })
  } else if (!REGEX.ANS_REGISTRO.test(registroAns)) {
    erros.push({ tipo: 'conteudo', campo: 'registroANS', mensagem: `Registro ANS "${registroAns}" deve ter 6 dígitos`, severidade: 'erro' })
  }

  // 7. Hash (epílogo)
  const hash = extractTagValue(xml, 'hash')
  const hashValido = !!hash && /^[a-f0-9]{32}$/i.test(hash)
  if (!hash) {
    erros.push({ tipo: 'hash', campo: 'hash', mensagem: 'Hash MD5 obrigatório ausente no epílogo', severidade: 'erro' })
  } else if (!hashValido) {
    erros.push({ tipo: 'hash', campo: 'hash', mensagem: `Hash "${hash}" não é MD5 válido (32 caracteres hex)`, severidade: 'erro' })
  }

  // 8. Guias
  const tiposGuia: string[] = []
  if (xml.includes('guiaConsulta')) tiposGuia.push('consulta')
  if (xml.includes('guiaSP-SADT')) tiposGuia.push('sp_sadt')
  if (xml.includes('guiaResumoInternacao')) tiposGuia.push('internacao')
  if (xml.includes('guiaHonorarios')) tiposGuia.push('honorarios')

  const totalGuias = countOccurrences(xml, 'guiaConsulta')
    + countOccurrences(xml, 'guiaSP-SADT')
    + countOccurrences(xml, 'guiaResumoInternacao')
    + countOccurrences(xml, 'guiaHonorarios')

  if (totalGuias === 0 && xml.includes('loteGuias')) {
    avisos.push({ tipo: 'estrutura', campo: 'guias', mensagem: 'Lote de guias sem nenhuma guia', severidade: 'aviso' })
  }

  if (totalGuias > 100) {
    avisos.push({ tipo: 'conteudo', campo: 'guias', mensagem: `Lote com ${totalGuias} guias — operadoras costumam limitar a 100`, severidade: 'aviso' })
  }

  // 9. Códigos TUSS
  const tussValues = extractAllTagValues(xml, 'codigoProcedimento')
  for (const tuss of tussValues) {
    if (!REGEX.TUSS.test(tuss)) {
      erros.push({ tipo: 'conteudo', campo: 'codigoProcedimento', mensagem: `Código TUSS "${tuss}" inválido (deve ter 8 dígitos)`, severidade: 'erro' })
    }
  }

  // 10. Tabela de procedimentos
  const tabelas = extractAllTagValues(xml, 'codigoTabela')
  for (const tab of tabelas) {
    if (tab !== TABELA_TUSS && tab !== '00' && tab !== '90' && tab !== '98' && tab !== '19') {
      avisos.push({ tipo: 'conteudo', campo: 'codigoTabela', mensagem: `Código de tabela "${tab}" desconhecido — esperado: 22 (TUSS), 00, 90, 98 ou 19`, severidade: 'aviso' })
    }
  }

  // 11. Carteirinhas
  const carteiras = extractAllTagValues(xml, 'numeroCarteira')
  for (const cart of carteiras) {
    if (!REGEX.CARTEIRINHA.test(cart)) {
      erros.push({ tipo: 'conteudo', campo: 'numeroCarteira', mensagem: `Carteirinha "${cart}" em formato inválido`, severidade: 'erro' })
    }
  }

  // 12. Valores monetários
  const valores = [
    ...extractAllTagValues(xml, 'valorUnitario'),
    ...extractAllTagValues(xml, 'valorTotal'),
    ...extractAllTagValues(xml, 'valorProcedimento'),
  ]
  for (const val of valores) {
    if (!/^\d+(\.\d{1,2})?$/.test(val)) {
      erros.push({ tipo: 'conteudo', campo: 'valor', mensagem: `Valor "${val}" deve ter formato numérico com até 2 decimais`, severidade: 'erro' })
    }
  }

  return {
    valido: erros.length === 0,
    versaoDetectada: versao ?? null,
    erros,
    avisos,
    resumo: {
      totalGuias,
      tiposGuia,
      hashValido,
    },
  }
}
