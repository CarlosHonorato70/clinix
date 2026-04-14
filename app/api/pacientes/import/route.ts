/**
 * Clinix — Importação em massa de pacientes via CSV
 *
 * Formato esperado (header obrigatório):
 * nome,cpf,dataNascimento,sexo,telefone,email,convenio,carteirinha
 *
 * - nome é obrigatório
 * - dataNascimento em formato YYYY-MM-DD
 * - sexo: M ou F
 * - convenio: nome exato do convênio (match case-insensitive)
 * - campos vazios são aceitos (exceto nome)
 */

import { withAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { pacientes, convenios } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { encryptField } from '@/lib/security/encryption'
import { writeAuditLog } from '@/lib/audit/logger'

interface ImportRow {
  nome: string
  cpf?: string
  dataNascimento?: string
  sexo?: string
  telefone?: string
  email?: string
  convenio?: string
  carteirinha?: string
}

interface ImportResult {
  total: number
  imported: number
  errors: { line: number; error: string; row: Partial<ImportRow> }[]
}

/**
 * Parse CSV simples — suporta:
 * - Vírgula como separador
 * - Aspas duplas para campos com vírgula
 * - Quebra de linha \n ou \r\n
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  const lines = content.split(/\r?\n/).filter((l) => l.trim())

  for (const line of lines) {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === ',') {
          fields.push(current.trim())
          current = ''
        } else if (char === '"') {
          inQuotes = true
        } else {
          current += char
        }
      }
    }
    fields.push(current.trim())
    rows.push(fields)
  }

  return rows
}

function validateRow(row: ImportRow, lineNum: number): string | null {
  if (!row.nome || row.nome.length < 2) {
    return `Linha ${lineNum}: nome é obrigatório`
  }
  if (row.nome.length > 200) {
    return `Linha ${lineNum}: nome muito longo (max 200)`
  }
  if (row.dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(row.dataNascimento)) {
    return `Linha ${lineNum}: dataNascimento deve ser YYYY-MM-DD`
  }
  if (row.sexo && !['M', 'F'].includes(row.sexo.toUpperCase())) {
    return `Linha ${lineNum}: sexo deve ser M ou F`
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    return `Linha ${lineNum}: email inválido`
  }
  return null
}

export const POST = withAuth(async (req, ctx) => {
  const contentType = req.headers.get('content-type') || ''

  let csvContent: string
  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return Response.json({ error: 'Arquivo não enviado (campo "file")' }, { status: 400 })
      }
      csvContent = await file.text()
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      csvContent = await req.text()
    } else {
      const body = await req.json()
      csvContent = body.csv || ''
    }
  } catch {
    return Response.json({ error: 'Falha ao ler arquivo' }, { status: 400 })
  }

  if (!csvContent.trim()) {
    return Response.json({ error: 'Arquivo vazio' }, { status: 400 })
  }

  const rows = parseCSV(csvContent)
  if (rows.length < 2) {
    return Response.json({ error: 'CSV deve ter header + pelo menos 1 linha de dados' }, { status: 400 })
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/[\s_-]/g, ''))
  const expectedFields = ['nome', 'cpf', 'datanascimento', 'sexo', 'telefone', 'email', 'convenio', 'carteirinha']
  const fieldIndex: Record<string, number> = {}
  for (const field of expectedFields) {
    fieldIndex[field] = header.indexOf(field)
  }

  if (fieldIndex.nome === -1) {
    return Response.json(
      { error: 'Header deve conter a coluna "nome". Colunas aceitas: ' + expectedFields.join(', ') },
      { status: 400 }
    )
  }

  // Pre-load convenios for matching by name
  const conveniosList = await db
    .select({ id: convenios.id, nome: convenios.nome })
    .from(convenios)
    .where(and(eq(convenios.tenantId, ctx.tenantId), eq(convenios.ativo, true)))
  const convenioMap = new Map(conveniosList.map((c) => [c.nome.toLowerCase(), c.id]))

  const result: ImportResult = { total: rows.length - 1, imported: 0, errors: [] }
  const toInsert: Array<typeof pacientes.$inferInsert> = []

  for (let i = 1; i < rows.length; i++) {
    const lineNum = i + 1
    const values = rows[i]
    const row: ImportRow = {
      nome: fieldIndex.nome >= 0 ? values[fieldIndex.nome] : '',
      cpf: fieldIndex.cpf >= 0 ? values[fieldIndex.cpf] : undefined,
      dataNascimento: fieldIndex.datanascimento >= 0 ? values[fieldIndex.datanascimento] : undefined,
      sexo: fieldIndex.sexo >= 0 ? values[fieldIndex.sexo]?.toUpperCase() : undefined,
      telefone: fieldIndex.telefone >= 0 ? values[fieldIndex.telefone] : undefined,
      email: fieldIndex.email >= 0 ? values[fieldIndex.email] : undefined,
      convenio: fieldIndex.convenio >= 0 ? values[fieldIndex.convenio] : undefined,
      carteirinha: fieldIndex.carteirinha >= 0 ? values[fieldIndex.carteirinha] : undefined,
    }

    const error = validateRow(row, lineNum)
    if (error) {
      result.errors.push({ line: lineNum, error, row })
      continue
    }

    const convenioId = row.convenio ? convenioMap.get(row.convenio.toLowerCase()) ?? null : null

    toInsert.push({
      tenantId: ctx.tenantId,
      nome: row.nome,
      cpf: row.cpf ? encryptField(row.cpf) : null,
      dataNascimento: row.dataNascimento || null,
      sexo: row.sexo || null,
      telefone: row.telefone ? encryptField(row.telefone) : null,
      email: row.email ? encryptField(row.email) : null,
      convenioId,
      numeroCarteirinha: row.carteirinha || null,
    })
  }

  if (toInsert.length > 0) {
    // Insert in batches of 100 to avoid hitting parameter limits
    const BATCH_SIZE = 100
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      await db.insert(pacientes).values(batch)
      result.imported += batch.length
    }

    writeAuditLog({
      tenantId: ctx.tenantId,
      usuarioId: ctx.userId,
      acao: 'create',
      entidade: 'pacientes',
      dadosDepois: { importBulk: true, count: result.imported },
      ip: ctx.ip,
    })
  }

  return Response.json(result, { status: 201 })
}, ['admin', 'recepcionista'])
