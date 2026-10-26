import { Hono } from 'hono'
import { createDb, insertStatement, query, updateStatement } from '../lib/db'
import {
  isRecord,
  jsonDbError,
  jsonError,
  parseNonNegativeInt,
  parsePositiveInt,
  readJson,
} from '../lib/http'
import type { AppEnv, Attendance, AttendanceInsert, AttendanceUpdate } from '../types'

const attendance = new Hono<AppEnv>()

const ATTENDANCE_WITH_EMPLOYEE = `
  a.id,
  a.user_id,
  a.timestamp,
  CASE WHEN e.id IS NULL THEN NULL ELSE json_build_object(
    'id', e.id,
    'name', e.name,
    'position', e.position,
    'daily_rate', e.daily_rate,
    'pay_type', e.pay_type,
    'schedule_type', e.schedule_type,
    'active', e.active
  ) END AS employee
`

function isIsoTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value))
}

function parseAttendancePayload(body: unknown, partial: boolean) {
  if (!isRecord(body)) return { error: 'JSON body is required' }

  const payload: AttendanceUpdate = {}

  if (body.user_id !== undefined) {
    const userId = parsePositiveInt(body.user_id as string | number)
    if (!userId) return { error: 'user_id must be a positive integer' }
    payload.user_id = userId
  } else if (!partial) {
    return { error: 'user_id is required' }
  }

  if (body.timestamp !== undefined) {
    if (typeof body.timestamp !== 'string' || !isIsoTimestamp(body.timestamp)) {
      return { error: 'timestamp must be a valid ISO date string' }
    }
    payload.timestamp = body.timestamp
  }

  if (partial && Object.keys(payload).length === 0) {
    return { error: 'Provide at least one field to update' }
  }

  return { payload }
}

attendance.get('/', async (c) => {
  const userId = c.req.query('user_id')
  const parsedUserId = parsePositiveInt(userId)
  if (userId && !parsedUserId) return jsonError(c, 400, 'user_id must be a positive integer')

  try {
    const sql = createDb(c.env)
    const from = c.req.query('from')
    const to = c.req.query('to')
    const includeEmployee = c.req.query('include') === 'employee'
    const limit = Math.min(parsePositiveInt(c.req.query('limit')) ?? 50, 200)
    const offset = parseNonNegativeInt(c.req.query('offset'))

    const clauses: string[] = []
    const params: unknown[] = []

    if (parsedUserId) {
      params.push(parsedUserId)
      clauses.push(`a.user_id = $${params.length}`)
    }
    if (from) {
      params.push(from)
      clauses.push(`a.timestamp >= $${params.length}`)
    }
    if (to) {
      params.push(to)
      clauses.push(`a.timestamp <= $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const select = includeEmployee ? ATTENDANCE_WITH_EMPLOYEE : 'a.id, a.user_id, a.timestamp'
    const fromSql = includeEmployee
      ? 'FROM attendance a LEFT JOIN employees e ON e.id = a.user_id'
      : 'FROM attendance a'

    const [countRows, data] = await Promise.all([
      query<{ count: number }>(sql, `SELECT COUNT(*)::int AS count FROM attendance a ${where}`, params),
      query(
        sql,
        `SELECT ${select} ${fromSql} ${where} ORDER BY a.timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ])

    return c.json({ data, count: countRows[0]?.count ?? 0 })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

attendance.get('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid attendance id')

  try {
    const sql = createDb(c.env)
    const includeEmployee = c.req.query('include') === 'employee'
    const select = includeEmployee ? ATTENDANCE_WITH_EMPLOYEE : 'a.id, a.user_id, a.timestamp'
    const fromSql = includeEmployee
      ? 'FROM attendance a LEFT JOIN employees e ON e.id = a.user_id'
      : 'FROM attendance a'

    const [data] = await query(sql, `SELECT ${select} ${fromSql} WHERE a.id = $1`, [id])
    if (!data) return jsonError(c, 404, 'Attendance record not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

attendance.post('/', async (c) => {
  const body = await readJson(c)
  const parsed = parseAttendancePayload(body, false)
  if ('error' in parsed && parsed.error) return jsonError(c, 400, parsed.error)

  const insertPayload: AttendanceInsert = {
    user_id: parsed.payload!.user_id!,
    timestamp: parsed.payload!.timestamp ?? new Date().toISOString(),
  }

  try {
    const sql = createDb(c.env)
    const insert = insertStatement('attendance', insertPayload)
    const [data] = await query<Attendance>(sql, insert.text, insert.params)
    return c.json({ data }, 201)
  } catch (err) {
    return jsonDbError(c, err, {
      '23505': { status: 409, message: 'Attendance already exists for this user at this timestamp' },
    })
  }
})

attendance.patch('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid attendance id')

  const body = await readJson(c)
  const parsed = parseAttendancePayload(body, true)
  if ('error' in parsed && parsed.error) return jsonError(c, 400, parsed.error)

  try {
    const sql = createDb(c.env)
    const update = updateStatement('attendance', parsed.payload as AttendanceUpdate, id)
    const [data] = await query<Attendance>(sql, update.text, update.params)
    if (!data) return jsonError(c, 404, 'Attendance record not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err, {
      '23505': { status: 409, message: 'Attendance already exists for this user at this timestamp' },
    })
  }
})

attendance.delete('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid attendance id')

  try {
    const sql = createDb(c.env)
    const [data] = await query<Attendance>(sql, 'DELETE FROM attendance WHERE id = $1 RETURNING *', [id])
    if (!data) return jsonError(c, 404, 'Attendance record not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

export default attendance
