/**
 * B1: Helpers padronizados para respostas de API.
 *
 * Formato consistente de erro em toda a aplicação:
 *   { error: string, code?: string, details?: unknown }
 *
 * Uso:
 *   return apiError('Paciente não encontrado', 404)
 *   return apiError('Validação falhou', 400, { code: 'VALIDATION', details: issues })
 *   return apiOk({ paciente })
 *   return apiCreated({ paciente })
 */

export function apiOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init })
}

export function apiCreated<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 201, ...init })
}

export function apiNoContent(): Response {
  return new Response(null, { status: 204 })
}

export function apiError(
  message: string,
  status = 400,
  extra?: { code?: string; details?: unknown },
): Response {
  return Response.json(
    {
      error: message,
      ...(extra?.code ? { code: extra.code } : {}),
      ...(extra?.details !== undefined ? { details: extra.details } : {}),
    },
    { status },
  )
}
