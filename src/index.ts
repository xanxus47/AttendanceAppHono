import { swaggerUI } from '@hono/swagger-ui'
import { NeonDbError } from '@neondatabase/serverless'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jsonDbError } from './lib/http'
import { openApiSpec } from './openapi'
import attendance from './routes/attendance'
import employees from './routes/employees'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({
    service: 'attendance-api',
    docs: '/docs',
    openapi: '/openapi.json',
    resources: {
      employees: '/api/employees',
      attendance: '/api/attendance',
    },
  })
})

app.get('/openapi.json', (c) => c.json(openApiSpec))
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

app.route('/api/employees', employees)
app.route('/api/attendance', attendance)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((err, c) => {
  if (err instanceof NeonDbError) {
    return jsonDbError(c, err)
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  return c.json({ error: message }, 500)
})

export default app
