export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Attendance API',
    version: '1.0.0',
    description: 'CRUD API for employees and attendance records.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    { name: 'Employees', description: 'Employee records' },
    { name: 'Attendance', description: 'Attendance timestamps' },
  ],
  paths: {
    '/api/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search by name',
            schema: { type: 'string' },
          },
          {
            name: 'active',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
          {
            name: 'pay_type',
            in: 'query',
            schema: { $ref: '#/components/schemas/PayType' },
          },
          {
            name: 'schedule_type',
            in: 'query',
            schema: { $ref: '#/components/schemas/ScheduleType' },
          },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
        ],
        responses: {
          '200': {
            description: 'Employee list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeList' },
              },
            },
          },
          '500': { $ref: '#/components/responses/Error' },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Create employee',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeCreate' },
              example: {
                name: 'Jane Doe',
                position: 'Cashier',
                daily_rate: 500,
                pay_type: 'daily_rate',
                schedule_type: 'regular',
                active: true,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created employee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/api/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get employee',
        parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
        responses: {
          '200': {
            description: 'Employee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update employee',
        parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated employee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
      delete: {
        tags: ['Employees'],
        summary: 'Delete employee',
        parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
        responses: {
          '200': {
            description: 'Deleted employee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
          '409': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/api/employees/{id}/attendance': {
      get: {
        tags: ['Employees'],
        summary: 'List attendance for an employee',
        parameters: [
          { $ref: '#/components/parameters/EmployeeId' },
          { $ref: '#/components/parameters/From' },
          { $ref: '#/components/parameters/To' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
        ],
        responses: {
          '200': {
            description: 'Attendance list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceList' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/api/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List attendance records',
        parameters: [
          {
            name: 'user_id',
            in: 'query',
            schema: { type: 'integer', minimum: 1 },
          },
          { $ref: '#/components/parameters/From' },
          { $ref: '#/components/parameters/To' },
          {
            name: 'include',
            in: 'query',
            description: 'Set to `employee` to nest the related employee',
            schema: { type: 'string', enum: ['employee'] },
          },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
        ],
        responses: {
          '200': {
            description: 'Attendance list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceList' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
        },
      },
      post: {
        tags: ['Attendance'],
        summary: 'Create attendance record',
        description: 'If `timestamp` is omitted, the current time is used.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AttendanceCreate' },
              example: {
                user_id: 1,
                timestamp: '2026-10-26T08:00:00+08:00',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created attendance record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '409': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/api/attendance/{id}': {
      get: {
        tags: ['Attendance'],
        summary: 'Get attendance record',
        parameters: [
          { $ref: '#/components/parameters/AttendanceId' },
          {
            name: 'include',
            in: 'query',
            schema: { type: 'string', enum: ['employee'] },
          },
        ],
        responses: {
          '200': {
            description: 'Attendance record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
      patch: {
        tags: ['Attendance'],
        summary: 'Update attendance record',
        parameters: [{ $ref: '#/components/parameters/AttendanceId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AttendanceUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated attendance record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
          '409': { $ref: '#/components/responses/Error' },
        },
      },
      delete: {
        tags: ['Attendance'],
        summary: 'Delete attendance record',
        parameters: [{ $ref: '#/components/parameters/AttendanceId' }],
        responses: {
          '200': {
            description: 'Deleted attendance record',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AttendanceResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
    },
  },
  components: {
    parameters: {
      EmployeeId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
      AttendanceId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
      Offset: {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer', minimum: 0, default: 0 },
      },
      From: {
        name: 'from',
        in: 'query',
        description: 'Inclusive start timestamp (ISO 8601)',
        schema: { type: 'string', format: 'date-time' },
      },
      To: {
        name: 'to',
        in: 'query',
        description: 'Inclusive end timestamp (ISO 8601)',
        schema: { type: 'string', format: 'date-time' },
      },
    },
    schemas: {
      PayType: {
        type: 'string',
        enum: ['daily_rate', 'record_only'],
      },
      ScheduleType: {
        type: 'string',
        enum: ['regular', 'shift_day', 'shift_night'],
      },
      Employee: {
        type: 'object',
        required: ['id', 'name', 'pay_type', 'schedule_type', 'active'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          position: { type: 'string', nullable: true },
          daily_rate: { type: 'number', nullable: true },
          pay_type: { $ref: '#/components/schemas/PayType' },
          schedule_type: { $ref: '#/components/schemas/ScheduleType' },
          active: { type: 'boolean' },
        },
      },
      EmployeeCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          position: { type: 'string', nullable: true },
          daily_rate: { type: 'number', nullable: true },
          pay_type: { $ref: '#/components/schemas/PayType' },
          schedule_type: { $ref: '#/components/schemas/ScheduleType' },
          active: { type: 'boolean' },
        },
      },
      EmployeeUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          position: { type: 'string', nullable: true },
          daily_rate: { type: 'number', nullable: true },
          pay_type: { $ref: '#/components/schemas/PayType' },
          schedule_type: { $ref: '#/components/schemas/ScheduleType' },
          active: { type: 'boolean' },
        },
      },
      EmployeeResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/Employee' },
        },
      },
      EmployeeList: {
        type: 'object',
        required: ['data', 'count'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Employee' },
          },
          count: { type: 'integer' },
        },
      },
      Attendance: {
        type: 'object',
        required: ['id', 'user_id', 'timestamp'],
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          employee: { $ref: '#/components/schemas/Employee' },
        },
      },
      AttendanceCreate: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'integer', minimum: 1 },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      AttendanceUpdate: {
        type: 'object',
        properties: {
          user_id: { type: 'integer', minimum: 1 },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      AttendanceResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/Attendance' },
        },
      },
      AttendanceList: {
        type: 'object',
        required: ['data', 'count'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Attendance' },
          },
          count: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },
    },
    responses: {
      Error: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
}
