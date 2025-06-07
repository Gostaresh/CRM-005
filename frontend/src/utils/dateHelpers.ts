// src/utils/dateHelpers.ts
// -----------------------------------------------------------------------------
// Shared date/time helpers for the CRM dashboard and other views.
// -----------------------------------------------------------------------------

/**
 * Clamp a date into the FullCalendar visible band 07:00 – 22:00.
 * Returns a **copy**; never mutates the incoming Date.
 */
export function clampToGrid(date: Date | string | null, isStart = true): Date | null {
  if (!date) return null
  const d = new Date(date) // copy
  const H = d.getHours()
  if (H < 7) {
    d.setHours(7, 0, 0, 0)
  } else if (H >= 22) {
    // Show very late events in the last slot (21:00‑22:00)
    d.setHours(21, 59, 0, 0)
  }
  return d
}

/** Format “HH:mm” in the user’s locale, 24‑hour clock. */
export function formatTime(date: Date | string | null): string {
  return date
    ? new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : ''
}

/** Convert ISO string to Persian calendar “YYYY/MM/DD HH:mm”. */
export function toJalali(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

import moment from 'moment-jalaali'
moment.loadPersian({ usePersianDigits: false })

/** ISO → local Jalali datetime string “jYYYY/jMM/jDD HH:mm” */
export function formatDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return moment(iso).utc().local().format('jYYYY/jMM/jDD HH:mm')
}

/** Jalali (string or moment) → UTC ISO string */
export function jalaliToIso(input: any): string {
  if (!input) return ''
  // Already a moment instance
  if (moment.isMoment(input)) {
    return input.clone().utc().toISOString()
  }
  if (typeof input !== 'string') return ''

  const parseFormats = ['jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD']
  const m = moment(input, parseFormats, true)
  if (!m.isValid()) return ''
  return m.utc().toISOString()
}
