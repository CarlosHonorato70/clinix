import { ZodSchema, ZodError } from 'zod'

/**
 * Parses and validates a request body against a Zod schema.
 * Returns the validated data or a 400 Response with error details.
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T | Response> {
  try {
    const body = await req.json()
    return schema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      }))
      return Response.json(
        { error: 'Dados inválidos', detalhes: errors },
        { status: 400 }
      )
    }
    return Response.json(
      { error: 'Corpo da requisição inválido' },
      { status: 400 }
    )
  }
}

/** Type guard to check if validateBody returned an error Response */
export function isValidationError(result: unknown): result is Response {
  return result instanceof Response
}
