// src/utils/odataTokens.ts
// ---------------------------------------------------------------------------
// Replace template tokens like {TODAY}, {USERID} in OData $filter strings.
// Only TODAY/TOMORROW/TODAY+7, MONTH_START/NEXT_MONTH_START, USERID are needed.
// ---------------------------------------------------------------------------
// import { User } from '@/stores/auth' // adjust path if User interface elsewhere

function isoStartOfDay(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function isoMonthStart(offsetMonths = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMonths, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Replace tokens inside a filter template.
 * @param template raw filter string containing placeholders
 * @param userId   current CRM user id
 */
export function replaceTokens(template: string, userId = ''): string {
  const map: Record<string, string> = {
    '{TODAY}': isoStartOfDay(0),
    '{TOMORROW}': isoStartOfDay(1),
    '{TODAY+7}': isoStartOfDay(7),
    '{MONTH_START}': isoMonthStart(0),
    '{NEXT_MONTH_START}': isoMonthStart(1),
    '{USERID}': userId,
  }
  let out = template
  Object.entries(map).forEach(([tok, val]) => {
    out = out.replaceAll(tok, val)
  })
  return out
}
