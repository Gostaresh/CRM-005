// src/constants/ui.ts
// -----------------------------------------------------------------------------
// UI‑level constants shared across the frontend.
// -----------------------------------------------------------------------------

/** View modes for dashboard / other pages */
export const VIEW = {
  CAL: 'calendar',
  TABLE: 'table',
} as const

/** Base table columns (no render fns). */
export const TABLE_COLUMNS = [
  { title: 'موضوع', key: 'subject' }, // render injected in view
  { title: 'شروع', key: 'startJ' },
  { title: 'پایان برنامه', key: 'endJ' },
  { title: 'پایان واقعی', key: 'actualEndJ' },
  { title: 'نوع', key: 'typeLabel' },
  { title: 'دیده شده؟', key: 'seenLabel' },
  { title: 'وضعیت', key: 'stateLabel' },
  { title: 'مالک', key: 'owner' },
] as const
