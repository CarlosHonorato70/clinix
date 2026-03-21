import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { testarConexao, type ConvenioConfig } from '@/lib/tiss/gateway'

/**
 * POST /api/convenios/[id]/testar-conexao
 *
 * Testa a conexão TISS Web Service com a operadora.
 * Envia uma verificação de elegibilidade dummy e verifica se responde.
 */
export const POST = withAuth(async (req, user) => {
  const id = req.url.split('/convenios/')[1]?.split('/testar-conexao')[0]
  if (!id) return Response.json({ error: 'ID do convênio não informado' }, { status: 400 })

  const [convenio] = await db
    .select()
    .from(convenios)
    .where(and(eq(convenios.id, id), eq(convenios.tenantId, user.tenantId)))
    .limit(1)

  if (!convenio) return Response.json({ error: 'Convênio não encontrado' }, { status: 404 })

  if (!convenio.wsdlUrl) {
    return Response.json({
      conectado: false,
      latenciaMs: 0,
      mensagem: 'URL do Web Service não configurada',
    })
  }

  const config: ConvenioConfig = {
    nome: convenio.nome,
    codigoAns: convenio.codigoAns ?? '',
    wsdlUrl: convenio.wsdlUrl,
    codigoPrestador: convenio.codigoPrestador ?? undefined,
    wsLogin: convenio.wsLogin ?? undefined,
    wsSenha: convenio.wsSenha ?? undefined,
    wsConfig: (convenio.wsConfig as ConvenioConfig['wsConfig']) ?? undefined,
  }

  const resultado = await testarConexao(config, '')

  // Update last test timestamp
  if (resultado.conectado) {
    await db
      .update(convenios)
      .set({ integracaoTesteAt: new Date() })
      .where(eq(convenios.id, id))
  }

  return Response.json(resultado)
}, ['admin'])
