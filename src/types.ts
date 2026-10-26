export type Bindings = {
  DATABASE_URL: string
}

export type AppEnv = {
  Bindings: Bindings
}

export const PAY_TYPES = ['daily_rate', 'record_only'] as const
export const SCHEDULE_TYPES = ['regular', 'shift_day', 'shift_night'] as const

export type PayType = (typeof PAY_TYPES)[number]
export type ScheduleType = (typeof SCHEDULE_TYPES)[number]

export type Employee = {
  id: number
  name: string
  position: string | null
  daily_rate: number | string | null
  pay_type: PayType
  schedule_type: ScheduleType
  active: boolean
}

export type EmployeeInsert = {
  name: string
  position?: string | null
  daily_rate?: number | null
  pay_type?: PayType
  schedule_type?: ScheduleType
  active?: boolean
}

export type EmployeeUpdate = Partial<EmployeeInsert>

export type Attendance = {
  id: number
  user_id: number
  timestamp: string
}

export type AttendanceInsert = {
  user_id: number
  timestamp?: string
}

export type AttendanceUpdate = Partial<AttendanceInsert>
