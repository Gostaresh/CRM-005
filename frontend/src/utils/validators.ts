// src/utils/validators.ts
export interface TaskFormShape {
  subject: string
  startRaw: string
  endRaw: string
}

/** Very small validation: subject required, end ≥ start */
export function validateTask(form: TaskFormShape): string[] {
  const errors: string[] = []

  if (!form.subject.trim()) errors.push('موضوع وارد نشده است.')

  if (form.startRaw && form.endRaw) {
    const start = new Date(form.startRaw).getTime()
    const end = new Date(form.endRaw).getTime()
    if (end < start) errors.push('تاریخ پایان نباید قبل از تاریخ شروع باشد.')
  }
  return errors
}
