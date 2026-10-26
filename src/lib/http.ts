import { NeonDbError } from '@neondatabase/serverless'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function jsonError(c: Context, status: ContentfulStatusCode, message: string) {
  return c.json({ error: message }, status)
}

export function parsePositiveInt(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export function parseNonNegativeInt(value: string | undefined) {
  if (value === undefined || value === '') return 0
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return 0
  return parsed
}

export async function readJson(c: Context) {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

export function mapDbError(error: { code?: string; message: string }) {
  switch (error.code) {
    case '23505':
      return { status: 409 as const, message: 'Record already exists' }
    case '23503':
      return { status: 400 as const, message: 'Referenced employee does not exist' }
    case '23514':
      return { status: 400 as const, message: 'Value failed a database check constraint' }
    default:
      return { status: 500 as const, message: error.message }
  }
}

export function jsonDbError(
  c: Context,
  err: unknown,
  overrides?: Partial<Record<string, { status: ContentfulStatusCode; message: string }>>,
) {
  if (err instanceof NeonDbError) {
    if (err.code && overrides?.[err.code]) {
      return jsonError(c, overrides[err.code]!.status, overrides[err.code]!.message)
    }
    const mapped = mapDbError({ code: err.code, message: err.message })
    return jsonError(c, mapped.status, mapped.message)
  }

  const message = err instanceof Error ? err.message : 'Database error'
  return jsonError(c, 500, message)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
