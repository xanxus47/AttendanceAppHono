import { neon } from '@neondatabase/serverless'
import type { Bindings } from '../types'

export function createDb(env: Bindings) {
  if (!env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL')
  }

  return neon(env.DATABASE_URL)
}

export type Sql = ReturnType<typeof neon>

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: Sql,
  text: string,
  params: unknown[] = [],
) {
  return (await sql.query(text, params)) as T[]
}

const IDENT = /^[a-z_]+$/

export function insertStatement(table: 'employees' | 'attendance', payload: Record<string, unknown>) {
  const columns = Object.keys(payload).filter((key) => IDENT.test(key) && payload[key] !== undefined)
  if (columns.length === 0) {
    throw new Error('No columns to insert')
  }

  const params = columns.map((key) => payload[key])
  const placeholders = columns.map((_, i) => `$${i + 1}`)

  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    params,
  }
}

export function updateStatement(
  table: 'employees' | 'attendance',
  payload: Record<string, unknown>,
  id: number,
) {
  const columns = Object.keys(payload).filter((key) => IDENT.test(key) && payload[key] !== undefined)
  if (columns.length === 0) {
    throw new Error('No columns to update')
  }

  const params = columns.map((key) => payload[key])
  const sets = columns.map((key, i) => `${key} = $${i + 1}`)
  params.push(id)

  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  }
}
