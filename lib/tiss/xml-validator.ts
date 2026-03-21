/**
 * Clinix — Validador de Guias TISS
 *
 * Valida campos obrigatórios, formatos de códigos e regras de negócio
 * antes da geração do XML e envio às operadoras.
 */

import { REGEX, MOTIVOS_GLOSA, type TipoGuia } from './constants'
import type { DadosGuia, Beneficiario, Prestador } from './xml-builder'

// ─── Types ──────────────────────────────────────────────────────────────────

export type Severidade = 'error' | 'warning'

export interface ValidationIssue {
  campo: string
  mensagem: string
  severidade: Severidade
  codigoGlosa?: string // Código do motivo de glosa ANS
}

export interface ValidationResult {
  valido: boolean
  erros: ValidationIssue[]
  avisos: ValidationIssue[]
  totalIssues: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addIssue(
  issues: ValidationIssue[],
  campo: string,
  mensagem: string,
  severidade: Severidade,
  codigoGlosa?: string
): void {
  issues.push({ campo, mensagem, severidade, codigoGlosa })
}

// ─── Validação de beneficiário ───────────────────────────────────────────────

function validarBeneficiario(b: Beneficiario): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!b.numeroCarteirinha) {
    addIssue(issues, 'beneficiario.numeroCarteirinha', 'Número da carteirinha é obrigatório', 'error', '1003')
  } else if (!REGEX.CARTEIRINHA.test(b.numeroCarteirinha)) {
    addIssue(issues, 'beneficiario.numeroCarteirinha', 'Formato da carteirinha inválido (deve ter 4-20 dígitos)', 'error', '1003')
  }

  if (!b.nomeBeneficiario || b.nomeBeneficiario.trim().length < 3) {
    addIssue(issues, 'beneficiario.nomeBeneficiario', 'Nome do beneficiário é obrigatório (mín. 3 caracteres)', 'error')
  }

  if (!b.codigoAns) {
    addIssue(issues, 'beneficiario.codigoAns', 'Código ANS da operadora é obrigatório', 'error')
  } else if (!REGEX.ANS_REGISTRO.test(b.codigoAns)) {
    addIssue(issues, 'beneficiario.codigoAns', 'Código ANS deve ter 6 dígitos', 'error')
  }

  return issues
}

// ─── Validação do prestador ──────────────────────────────────────────────────

function validarPrestador(p: Prestador): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!p.cnpj) {
    addIssue(issues, 'prestador.cnpj', 'CNPJ do prestador é obrigatório', 'error')
  } else if (!REGEX.CNPJ.test(p.cnpj.replace(/\D/g, ''))) {
    addIssue(issues, 'prestador.cnpj', 'CNPJ inválido (deve ter 14 dígitos)', 'error')
  }

  if (!p.nomeContratado || p.nomeContratado.trim().length < 3) {
    addIssue(issues, 'prestador.nomeContratado', 'Nome do prestador é obrigatório', 'error')
  }

  if (p.cnes && !REGEX.CNES.test(p.cnes)) {
    addIssue(issues, 'prestador.cnes', 'CNES deve ter 7 dígitos', 'warning')
  }

  return issues
}

// ─── Validação da guia ───────────────────────────────────────────────────────

function validarDadosGuia(guia: DadosGuia): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Número da guia
  if (!guia.numeroGuia) {
    addIssue(issues, 'guia.numeroGuia', 'Número da guia é obrigatório', 'error')
  }

  // Data de atendimento
  if (!guia.dataAtendimento) {
    addIssue(issues, 'guia.dataAtendimento', 'Data de atendimento é obrigatória', 'error')
  } else {
    const dataAtend = new Date(guia.dataAtendimento)
    const agora = new Date()
    if (dataAtend > agora) {
      addIssue(issues, 'guia.dataAtendimento', 'Data de atendimento não pode ser futura', 'error')
    }

    // Prazo de envio: guias com mais de 30 dias podem ser glosadas
    const diasPassados = Math.floor((agora.getTime() - dataAtend.getTime()) / (1000 * 60 * 60 * 24))
    if (diasPassados > 30) {
      addIssue(issues, 'guia.dataAtendimento', `Guia com ${diasPassados} dias de atraso — risco alto de glosa por prazo`, 'warning', '1018')
    }
  }

  // Data de execução não pode ser anterior à autorização
  if (guia.dataAutorizacao && guia.dataAtendimento) {
    if (new Date(guia.dataAtendimento) < new Date(guia.dataAutorizacao)) {
      addIssue(issues, 'guia.dataAtendimento', 'Data de atendimento anterior à data de autorização', 'error', '1060')
    }
  }

  // Validade da senha
  if (guia.validadeSenha) {
    if (new Date(guia.validadeSenha) < new Date()) {
      addIssue(issues, 'guia.validadeSenha', 'Senha de autorização expirada', 'error')
    }
  }

  // CID-10
  if (guia.cid10Principal && !REGEX.CID10.test(guia.cid10Principal)) {
    addIssue(issues, 'guia.cid10Principal', `CID-10 "${guia.cid10Principal}" em formato inválido (esperado: X00 ou X00.0)`, 'error', '1012')
  }

  if (guia.cid10Secundarios) {
    for (const cid of guia.cid10Secundarios) {
      if (!REGEX.CID10.test(cid)) {
        addIssue(issues, 'guia.cid10Secundarios', `CID-10 secundário "${cid}" em formato inválido`, 'warning')
      }
    }
  }

  return issues
}

// ─── Validação de procedimentos ──────────────────────────────────────────────

function validarProcedimentos(guia: DadosGuia): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!guia.procedimentos || guia.procedimentos.length === 0) {
    addIssue(issues, 'procedimentos', 'Pelo menos um procedimento é obrigatório', 'error')
    return issues
  }

  const tusCodigos = new Set<string>()

  for (let i = 0; i < guia.procedimentos.length; i++) {
    const proc = guia.procedimentos[i]
    const prefix = `procedimentos[${i}]`

    // Código TUSS
    if (!proc.codigoTuss) {
      addIssue(issues, `${prefix}.codigoTuss`, 'Código TUSS é obrigatório', 'error', '1010')
    } else if (!REGEX.TUSS.test(proc.codigoTuss)) {
      addIssue(issues, `${prefix}.codigoTuss`, `Código TUSS "${proc.codigoTuss}" deve ter 8 dígitos`, 'error', '1010')
    }

    // Descrição
    if (!proc.descricao || proc.descricao.trim().length < 3) {
      addIssue(issues, `${prefix}.descricao`, 'Descrição do procedimento é obrigatória', 'error')
    }

    // Quantidade
    if (proc.quantidade <= 0) {
      addIssue(issues, `${prefix}.quantidade`, 'Quantidade deve ser maior que zero', 'error')
    } else if (proc.quantidade > 99) {
      addIssue(issues, `${prefix}.quantidade`, `Quantidade ${proc.quantidade} parece elevada — verificar`, 'warning', '1045')
    }

    // Valor
    if (proc.valorUnitario < 0) {
      addIssue(issues, `${prefix}.valorUnitario`, 'Valor unitário não pode ser negativo', 'error')
    } else if (proc.valorUnitario === 0) {
      addIssue(issues, `${prefix}.valorUnitario`, 'Valor unitário é zero — verificar', 'warning')
    }

    // CBO do executante
    if (proc.cbo && !REGEX.CBO.test(proc.cbo)) {
      addIssue(issues, `${prefix}.cbo`, `CBO "${proc.cbo}" deve ter 6 dígitos`, 'error', '1055')
    }

    // Data de execução
    if (!proc.dataExecucao) {
      addIssue(issues, `${prefix}.dataExecucao`, 'Data de execução é obrigatória', 'error')
    }

    // Duplicidade
    const chave = `${proc.codigoTuss}-${proc.dataExecucao}`
    if (tusCodigos.has(chave)) {
      addIssue(issues, `${prefix}`, `Possível duplicidade: mesmo TUSS (${proc.codigoTuss}) na mesma data`, 'warning', '1020')
    }
    tusCodigos.add(chave)
  }

  return issues
}

// ─── Validação por tipo de guia ──────────────────────────────────────────────

function validarTipoGuia(guia: DadosGuia): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  switch (guia.tipo) {
    case 'consulta':
      if (!guia.tipoConsulta) {
        addIssue(issues, 'guia.tipoConsulta', 'Tipo de consulta é obrigatório para guia de consulta (1=Primeira, 2=Retorno)', 'warning')
      }
      if (guia.procedimentos.length > 1) {
        addIssue(issues, 'procedimentos', 'Guia de consulta deve ter apenas 1 procedimento', 'warning')
      }
      break

    case 'sp_sadt':
      if (!guia.tipoAtendimento) {
        addIssue(issues, 'guia.tipoAtendimento', 'Tipo de atendimento é obrigatório para guia SP/SADT', 'warning')
      }
      if (!guia.cid10Principal) {
        addIssue(issues, 'guia.cid10Principal', 'CID-10 recomendado para guia SP/SADT', 'warning')
      }
      break

    case 'internacao':
      if (!guia.senhaAutorizacao) {
        addIssue(issues, 'guia.senhaAutorizacao', 'Autorização prévia é obrigatória para internação', 'error', '1818')
      }
      if (!guia.cid10Principal) {
        addIssue(issues, 'guia.cid10Principal', 'CID-10 é obrigatório para guia de internação', 'error')
      }
      break
  }

  return issues
}

// ─── Validador principal ─────────────────────────────────────────────────────

export function validarGuia(
  guia: DadosGuia,
  prestador: Prestador,
  beneficiario: Beneficiario
): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...validarBeneficiario(beneficiario),
    ...validarPrestador(prestador),
    ...validarDadosGuia(guia),
    ...validarProcedimentos(guia),
    ...validarTipoGuia(guia),
  ]

  const erros = allIssues.filter((i) => i.severidade === 'error')
  const avisos = allIssues.filter((i) => i.severidade === 'warning')

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    totalIssues: allIssues.length,
  }
}

// ─── Helper: descrição do código de glosa ────────────────────────────────────

export function descricaoGlosa(codigo: string): string {
  return MOTIVOS_GLOSA[codigo] ?? `Motivo de glosa ${codigo}`
}
