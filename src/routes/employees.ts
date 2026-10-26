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
import {
  PAY_TYPES,
  SCHEDULE_TYPES,
  type AppEnv,
  type Employee,
  type EmployeeInsert,
  type EmployeeUpdate,
  type PayType,
  type ScheduleType,
} from '../types'

const employees = new Hono<AppEnv>()

function isPayType(value: unknown): value is PayType {
  return typeof value === 'string' && (PAY_TYPES as readonly string[]).includes(value)
}

function isScheduleType(value: unknown): value is ScheduleType {
  return typeof value === 'string' && (SCHEDULE_TYPES as readonly string[]).includes(value)
}

function parseEmployeePayload(body: unknown, partial: boolean) {
  if (!isRecord(body)) return { error: 'JSON body is required' }

  const payload: EmployeeUpdate = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return { error: 'name must be a non-empty string' }
    }
    payload.name = body.name.trim()
  } else if (!partial) {
    return { error: 'name is required' }
  }

  if (body.position !== undefined) {
    if (body.position !== null && typeof body.position !== 'string') {
      return { error: 'position must be a string or null' }
    }
    payload.position = body.position
  }

  if (body.daily_rate !== undefined) {
    if (body.daily_rate === null) {
      payload.daily_rate = null
    } else {
      const rate = typeof body.daily_rate === 'number' ? body.daily_rate : Number(body.daily_rate)
      if (Number.isNaN(rate)) return { error: 'daily_rate must be a number or null' }
      payload.daily_rate = rate
    }
  }

  if (body.pay_type !== undefined) {
    if (!isPayType(body.pay_type)) {
      return { error: `pay_type must be one of: ${PAY_TYPES.join(', ')}` }
    }
    payload.pay_type = body.pay_type
  }

  if (body.schedule_type !== undefined) {
    if (!isScheduleType(body.schedule_type)) {
      return { error: `schedule_type must be one of: ${SCHEDULE_TYPES.join(', ')}` }
    }
    payload.schedule_type = body.schedule_type
  }

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return { error: 'active must be a boolean' }
    }
    payload.active = body.active
  }

  if (partial && Object.keys(payload).length === 0) {
    return { error: 'Provide at least one field to update' }
  }

  return { payload }
}

employees.get('/', async (c) => {
  try {
    const sql = createDb(c.env)
    const active = c.req.query('active')
    const payType = c.req.query('pay_type')
    const scheduleType = c.req.query('schedule_type')
    const search = c.req.query('q')
    const limit = Math.min(parsePositiveInt(c.req.query('limit')) ?? 50, 200)
    const offset = parseNonNegativeInt(c.req.query('offset'))

    const clauses: string[] = []
    const params: unknown[] = []

    if (active === 'true' || active === 'false') {
      params.push(active === 'true')
      clauses.push(`active = $${params.length}`)
    }
    if (payType) {
      params.push(payType)
      clauses.push(`pay_type = $${params.length}`)
    }
    if (scheduleType) {
      params.push(scheduleType)
      clauses.push(`schedule_type = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      clauses.push(`name ILIKE $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const [countRows, data] = await Promise.all([
      query<{ count: number }>(sql, `SELECT COUNT(*)::int AS count FROM employees ${where}`, params),
      query<Employee>(
        sql,
        `SELECT * FROM employees ${where} ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ])

    return c.json({ data, count: countRows[0]?.count ?? 0 })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

employees.get('/:id/attendance', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid employee id')

  try {
    const sql = createDb(c.env)
    const [employee] = await query(sql, 'SELECT id FROM employees WHERE id = $1', [id])
    if (!employee) return jsonError(c, 404, 'Employee not found')

    const limit = Math.min(parsePositiveInt(c.req.query('limit')) ?? 50, 200)
    const offset = parseNonNegativeInt(c.req.query('offset'))
    const from = c.req.query('from')
    const to = c.req.query('to')

    const clauses = ['user_id = $1']
    const params: unknown[] = [id]
    if (from) {
      params.push(from)
      clauses.push(`timestamp >= $${params.length}`)
    }
    if (to) {
      params.push(to)
      clauses.push(`timestamp <= $${params.length}`)
    }

    const where = `WHERE ${clauses.join(' AND ')}`
    const [countRows, data] = await Promise.all([
      query<{ count: number }>(sql, `SELECT COUNT(*)::int AS count FROM attendance ${where}`, params),
      query(
        sql,
        `SELECT * FROM attendance ${where} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ])

    return c.json({ data, count: countRows[0]?.count ?? 0 })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

employees.get('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid employee id')

  try {
    const sql = createDb(c.env)
    const [data] = await query<Employee>(sql, 'SELECT * FROM employees WHERE id = $1', [id])
    if (!data) return jsonError(c, 404, 'Employee not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

employees.post('/', async (c) => {
  const body = await readJson(c)
  const parsed = parseEmployeePayload(body, false)
  if ('error' in parsed && parsed.error) return jsonError(c, 400, parsed.error)

  try {
    const sql = createDb(c.env)
    const insert = insertStatement('employees', parsed.payload as EmployeeInsert)
    const [data] = await query<Employee>(sql, insert.text, insert.params)
    return c.json({ data }, 201)
  } catch (err) {
    return jsonDbError(c, err)
  }
})

employees.patch('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid employee id')

  const body = await readJson(c)
  const parsed = parseEmployeePayload(body, true)
  if ('error' in parsed && parsed.error) return jsonError(c, 400, parsed.error)

  try {
    const sql = createDb(c.env)
    const update = updateStatement('employees', parsed.payload as EmployeeUpdate, id)
    const [data] = await query<Employee>(sql, update.text, update.params)
    if (!data) return jsonError(c, 404, 'Employee not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err)
  }
})

employees.delete('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return jsonError(c, 400, 'Invalid employee id')

  try {
    const sql = createDb(c.env)
    const [data] = await query<Employee>(sql, 'DELETE FROM employees WHERE id = $1 RETURNING *', [id])
    if (!data) return jsonError(c, 404, 'Employee not found')
    return c.json({ data })
  } catch (err) {
    return jsonDbError(c, err, {
      '23503': { status: 409, message: 'Cannot delete employee with existing attendance records' },
    })
  }
})

export default employees
