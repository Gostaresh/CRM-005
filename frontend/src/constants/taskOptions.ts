// src/constants/taskOptions.ts
// -----------------------------------------------------------------------------
// Static option arrays and mappings reused across task-related components.
// -----------------------------------------------------------------------------

export const ACTIVITY_DISPLAY_NAMES: Record<string, string> = {
  task: 'وظیفه',
  phonecall: 'تماس تلفنی',
  appointment: 'قرار ملاقات',
  email: 'ایمیل',
  fax: 'فکس',
  letter: 'نامه',
  serviceappointment: 'فعالیت خدماتی',
  socialactivity: 'فعالیت اجتماعی',
  // extend as needed …
}

export const PRIORITY_OPTIONS = [
  { label: 'کم', value: 0 },
  { label: 'متوسط', value: 1 },
  { label: 'زیاد', value: 2 },
] as const

export const SEEN_OPTIONS = [
  { label: 'دیده شده', value: 1 },
  { label: 'دیده نشده', value: 0 },
] as const

export const STATE_OPTIONS = [
  { label: 'باز', value: 0 },
  { label: 'اتمام کار', value: 1 },
  { label: 'لغو شده', value: 2 },
  { label: 'برنامه ریزی شده', value: 3 },
] as const
