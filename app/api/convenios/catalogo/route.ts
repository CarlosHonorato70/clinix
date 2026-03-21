import { withAuth } from '@/lib/auth/middleware'
import {
  OPERADORAS_CATALOGO,
  buscarOperadora,
  buscarOperadoraPorAns,
  gerarInstrucoesConfig,
} from '@/lib/tiss/operadoras-catalogo'

/**
 * GET /api/convenios/catalogo
 *
 * Retorna o catálogo de operadoras com endpoints TISS conhecidos.
 * Query params:
 *   - q: busca por nome (fuzzy)
 *   - ans: busca por código ANS
 *   - wsOnly: se "true", retorna apenas operadoras com WS disponível
 */
export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')
  const ans = url.searchParams.get('ans')
  const wsOnly = url.searchParams.get('wsOnly') === 'true'

  // Search by ANS code
  if (ans) {
    const operadora = buscarOperadoraPorAns(ans)
    if (!operadora) {
      return Response.json({ error: 'Operadora não encontrada' }, { status: 404 })
    }
    return Response.json({
      operadora,
      instrucoes: gerarInstrucoesConfig(operadora),
    })
  }

  // Search by name
  if (q) {
    const operadora = buscarOperadora(q)
    if (!operadora) {
      return Response.json({ error: 'Operadora não encontrada', sugestao: 'Tente buscar pelo nome parcial ou código ANS' }, { status: 404 })
    }
    return Response.json({
      operadora,
      instrucoes: gerarInstrucoesConfig(operadora),
    })
  }

  // List all
  let catalogo = OPERADORAS_CATALOGO
  if (wsOnly) {
    catalogo = catalogo.filter((op) => op.wsDisponivel)
  }

  return Response.json({
    total: catalogo.length,
    operadoras: catalogo.map((op) => ({
      nome: op.nome,
      codigoAns: op.codigoAns,
      portalPrestador: op.portalPrestador,
      wsdlUrl: op.wsdlUrl ?? null,
      wsDisponivel: op.wsDisponivel,
      telefone: op.telefone ?? null,
      cor: op.cor,
    })),
  })
}, ['admin', 'faturista'])
