/**
 * Clinix — Gerador de XML TISS v4.02
 *
 * Gera XML válido no padrão TISS da ANS para guias de consulta,
 * SP/SADT, internação e lotes de guias.
 *
 * Ref: https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss
 */

import { createHash } from 'crypto'
import { TISS_VERSION, TISS_NAMESPACE, TABELA_TUSS, type TipoGuia } from './constants'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Prestador {
  cnpj: string
  codigoPrestador: string
  nomeContratado: string
  cnes: string
  registroAns?: string
}

export interface Beneficiario {
  numeroCarteirinha: string
  nomeBeneficiario: string
  dataNascimento?: string // YYYY-MM-DD
  sexo?: 'M' | 'F'
  codigoAns: string // registro ANS da operadora
}

export interface Procedimento {
  codigoTuss: string
  descricao: string
  quantidade: number
  valorUnitario: number
  dataExecucao: string // YYYY-MM-DD
  cbo?: string
}

export interface DadosGuia {
  numeroGuia: string
  tipo: TipoGuia
  dataAtendimento: string // YYYY-MM-DD
  tipoAtendimento?: string // 01-14
  caraterAtendimento?: string // 1=Eletivo, 2=Urgência
  tipoConsulta?: string // 1=Primeira, 2=Retorno
  indicadorAcidente?: string // 0=Não, 1=Trabalho, 2=Trânsito
  cid10Principal?: string
  cid10Secundarios?: string[]
  observacao?: string
  senhaAutorizacao?: string
  dataAutorizacao?: string // YYYY-MM-DD
  validadeSenha?: string // YYYY-MM-DD
  procedimentos: Procedimento[]
  profissionalExecutante?: {
    nome: string
    conselho: string // CRM
    uf: string
    cbo: string
  }
}

export interface CabecalhoLote {
  registroAns: string
  dataEnvio: string // YYYY-MM-DD
  sequencialTransacao: string
  versaoPadrao?: string
}

// ─── XML Escaping ────────────────────────────────────────────────────────────

function esc(value: string | number | undefined): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tag(name: string, value: string | number | undefined, prefix = 'ans'): string {
  if (value === undefined || value === null || value === '') return ''
  return `<${prefix}:${name}>${esc(value)}</${prefix}:${name}>`
}

function formatDate(date: string): string {
  // Ensure YYYY-MM-DD format
  return date.slice(0, 10)
}

// ─── Hash do Epílogo (obrigatório TISS) ──────────────────────────────────────

export function generateTissHash(xmlContent: string): string {
  return createHash('md5').update(xmlContent, 'utf8').digest('hex')
}

// ─── Cabeçalho TISS ──────────────────────────────────────────────────────────

function buildCabecalho(cab: CabecalhoLote): string {
  return `
    <ans:cabecalho>
      <ans:identificacaoTransacao>
        <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
        <ans:sequencialTransacao>${esc(cab.sequencialTransacao)}</ans:sequencialTransacao>
        <ans:dataRegistroTransacao>${formatDate(cab.dataEnvio)}</ans:dataRegistroTransacao>
        <ans:horaRegistroTransacao>${new Date().toTimeString().slice(0, 8)}</ans:horaRegistroTransacao>
      </ans:identificacaoTransacao>
      <ans:origem>
        <ans:identificacaoPrestador>
          <ans:codigoPrestadorNaOperadora>${esc(cab.registroAns)}</ans:codigoPrestadorNaOperadora>
        </ans:identificacaoPrestador>
      </ans:origem>
      <ans:destino>
        <ans:registroANS>${esc(cab.registroAns)}</ans:registroANS>
      </ans:destino>
      <ans:Padrao>${cab.versaoPadrao ?? TISS_VERSION}</ans:Padrao>
    </ans:cabecalho>`
}

// ─── Dados do beneficiário ───────────────────────────────────────────────────

function buildDadosBeneficiario(b: Beneficiario): string {
  return `
      <ans:dadosBeneficiario>
        ${tag('numeroCarteira', b.numeroCarteirinha)}
        ${tag('atendimentoRN', 'N')}
        ${tag('nomeBeneficiario', b.nomeBeneficiario)}
      </ans:dadosBeneficiario>`
}

// ─── Dados do contratado/prestador ───────────────────────────────────────────

function buildDadosContratado(p: Prestador): string {
  return `
      <ans:dadosContratado>
        <ans:contratadoExecutante>
          <ans:cnpjContratado>${esc(p.cnpj)}</ans:cnpjContratado>
          ${tag('nomeContratado', p.nomeContratado)}
        </ans:contratadoExecutante>
        ${tag('CNES', p.cnes)}
      </ans:dadosContratado>`
}

// ─── Procedimentos ───────────────────────────────────────────────────────────

function buildProcedimento(proc: Procedimento, seq: number): string {
  return `
        <ans:procedimentoExecutado>
          ${tag('sequencialItem', seq)}
          ${tag('dataExecucao', formatDate(proc.dataExecucao))}
          ${tag('horaInicial', '08:00:00')}
          ${tag('horaFinal', '08:30:00')}
          <ans:procedimento>
            ${tag('codigoTabela', TABELA_TUSS)}
            ${tag('codigoProcedimento', proc.codigoTuss)}
            ${tag('descricaoProcedimento', proc.descricao)}
          </ans:procedimento>
          ${tag('quantidadeExecutada', proc.quantidade)}
          ${tag('valorUnitario', proc.valorUnitario.toFixed(2))}
          ${tag('valorTotal', (proc.valorUnitario * proc.quantidade).toFixed(2))}
        </ans:procedimentoExecutado>`
}

// ─── Guia de Consulta ────────────────────────────────────────────────────────

export function buildGuiaConsultaXML(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario
): string {
  const valorTotal = guia.procedimentos.reduce(
    (sum, p) => sum + p.valorUnitario * p.quantidade, 0
  )

  return `
    <ans:guiaConsulta>
      <ans:cabecalhoGuia>
        ${tag('registroANS', beneficiario.codigoAns)}
        ${tag('numeroGuiaPrestador', guia.numeroGuia)}
      </ans:cabecalhoGuia>
      ${guia.senhaAutorizacao ? `
      <ans:dadosAutorizacao>
        ${tag('numeroGuiaOperadora', guia.senhaAutorizacao)}
        ${tag('dataAutorizacao', guia.dataAutorizacao ? formatDate(guia.dataAutorizacao) : '')}
        ${tag('senha', guia.senhaAutorizacao)}
        ${tag('dataValidadeSenha', guia.validadeSenha ? formatDate(guia.validadeSenha) : '')}
      </ans:dadosAutorizacao>` : ''}
      ${buildDadosBeneficiario(beneficiario)}
      ${buildDadosContratado(prestador)}
      <ans:dadosAtendimento>
        ${tag('dataAtendimento', formatDate(guia.dataAtendimento))}
        ${tag('tipoConsulta', guia.tipoConsulta ?? '1')}
        <ans:procedimento>
          ${tag('codigoTabela', TABELA_TUSS)}
          ${tag('codigoProcedimento', guia.procedimentos[0]?.codigoTuss ?? '10101012')}
          ${tag('descricaoProcedimento', guia.procedimentos[0]?.descricao ?? 'Consulta em consultório')}
        </ans:procedimento>
        ${tag('valorProcedimento', valorTotal.toFixed(2))}
      </ans:dadosAtendimento>
      ${guia.cid10Principal ? tag('CID', guia.cid10Principal) : ''}
      ${guia.profissionalExecutante ? `
      <ans:profissionalExecutante>
        ${tag('nomeProfissional', guia.profissionalExecutante.nome)}
        ${tag('conselhoProfissional', guia.profissionalExecutante.conselho)}
        ${tag('UF', guia.profissionalExecutante.uf)}
        ${tag('CBOS', guia.profissionalExecutante.cbo)}
      </ans:profissionalExecutante>` : ''}
      ${tag('observacao', guia.observacao)}
    </ans:guiaConsulta>`
}

// ─── Guia SP/SADT ────────────────────────────────────────────────────────────

export function buildGuiaSADTXML(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario
): string {
  const valorTotal = guia.procedimentos.reduce(
    (sum, p) => sum + p.valorUnitario * p.quantidade, 0
  )

  return `
    <ans:guiaSP-SADT>
      <ans:cabecalhoGuia>
        ${tag('registroANS', beneficiario.codigoAns)}
        ${tag('numeroGuiaPrestador', guia.numeroGuia)}
      </ans:cabecalhoGuia>
      ${guia.senhaAutorizacao ? `
      <ans:dadosAutorizacao>
        ${tag('numeroGuiaOperadora', guia.senhaAutorizacao)}
        ${tag('senha', guia.senhaAutorizacao)}
        ${tag('dataValidadeSenha', guia.validadeSenha ? formatDate(guia.validadeSenha) : '')}
      </ans:dadosAutorizacao>` : ''}
      ${buildDadosBeneficiario(beneficiario)}
      <ans:dadosSolicitante>
        ${buildDadosContratado(prestador)}
        ${guia.profissionalExecutante ? `
        <ans:profissionalSolicitante>
          ${tag('nomeProfissional', guia.profissionalExecutante.nome)}
          ${tag('conselhoProfissional', guia.profissionalExecutante.conselho)}
          ${tag('UF', guia.profissionalExecutante.uf)}
          ${tag('CBOS', guia.profissionalExecutante.cbo)}
        </ans:profissionalSolicitante>` : ''}
      </ans:dadosSolicitante>
      <ans:dadosSolicitacao>
        ${tag('dataSolicitacao', formatDate(guia.dataAtendimento))}
        ${tag('caraterAtendimento', guia.caraterAtendimento ?? '1')}
        ${tag('indicacaoClinica', guia.observacao ?? '')}
      </ans:dadosSolicitacao>
      ${buildDadosContratado(prestador)}
      <ans:dadosAtendimento>
        ${tag('tipoAtendimento', guia.tipoAtendimento ?? '04')}
        ${tag('indicacaoAcidente', guia.indicadorAcidente ?? '0')}
      </ans:dadosAtendimento>
      <ans:procedimentosExecutados>
        ${guia.procedimentos.map((p, i) => buildProcedimento(p, i + 1)).join('')}
      </ans:procedimentosExecutados>
      ${guia.cid10Principal ? `
      <ans:diagnostico>
        ${tag('CID', guia.cid10Principal)}
        ${(guia.cid10Secundarios ?? []).map(c => tag('CID', c)).join('')}
      </ans:diagnostico>` : ''}
      ${tag('valorTotal', valorTotal.toFixed(2))}
      ${tag('observacao', guia.observacao)}
    </ans:guiaSP-SADT>`
}

// ─── Lote de Guias ───────────────────────────────────────────────────────────

export function buildLoteGuiasXML(
  guiasXML: string[],
  cabecalho: CabecalhoLote
): string {
  const corpo = `
    <ans:prestadorParaOperadora>
      <ans:loteGuias>
        ${tag('numeroLote', cabecalho.sequencialTransacao)}
        <ans:guiasTISS>
          ${guiasXML.join('\n')}
        </ans:guiasTISS>
      </ans:loteGuias>
    </ans:prestadorParaOperadora>`

  const hash = generateTissHash(corpo)

  return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="${TISS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  ${buildCabecalho(cabecalho)}
  ${corpo}
  <ans:epilogo>
    <ans:hash>${hash}</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`
}

// ─── Builder de alto nível ───────────────────────────────────────────────────

export function buildGuiaXML(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario
): string {
  switch (guia.tipo) {
    case 'consulta':
      return buildGuiaConsultaXML(guia, prestador, beneficiario)
    case 'sp_sadt':
      return buildGuiaSADTXML(guia, prestador, beneficiario)
    case 'internacao':
      // Internação usa estrutura similar ao SADT com campos adicionais
      return buildGuiaSADTXML(guia, prestador, beneficiario)
    case 'honorarios':
      return buildGuiaConsultaXML(guia, prestador, beneficiario)
    default:
      return buildGuiaSADTXML(guia, prestador, beneficiario)
  }
}

// ─── Helper: XML individual com envelope ─────────────────────────────────────

export function buildGuiaComEnvelope(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario,
  cabecalho: CabecalhoLote
): string {
  const guiaXML = buildGuiaXML(guia, prestador, beneficiario)
  return buildLoteGuiasXML([guiaXML], cabecalho)
}
