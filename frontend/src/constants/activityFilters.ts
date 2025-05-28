/* ------------------------------------------------------------------
   Preset activity filters for the calendar dropdown
   ------------------------------------------------------------------ */
export interface ActivityPreset {
  key: string
  label: string
  filter: string // OData fragment (tokens in {BRACES})
  disabled?: boolean
}

export const ActivityPresets: ActivityPreset[] = [
  {
    key: 'ALL',
    label: 'همه فعالیت‌های من', // default
    filter: '',
  },
  {
    key: 'NEXT_7',
    label: 'فعالیت‌های ۷ روز آینده',
    filter: 'scheduledend ge {TODAY} and scheduledend lt {TODAY+7}',
  },
  {
    key: 'TIL_TODAY',
    label: 'فعالیت‌ها تا امروز',
    filter: 'scheduledend lt {TOMORROW}',
  },
  {
    key: 'DUE_TODAY_OPEN',
    label: 'سررسید گذشته (باز)',
    filter: 'scheduledend lt {TOMORROW} and statecode eq 0',
  },
  {
    key: 'COMPLETED',
    label: 'فعالیت‌های من (بسته)',
    filter: 'statecode eq 1',
  },
  {
    key: 'LAST_OWNER',
    label: 'آخرین مالک من',
    filter: "_new_lastowner_value eq '{USERID}'",
  },
  {
    key: 'CREATED_BY_NOT_OWNER',
    label: 'ایجاد من، مالک شخص دیگر',
    filter: "_createdby_value eq '{USERID}' and _ownerid_value ne '{USERID}'",
  },
  {
    key: 'TEAM',
    label: 'فعالیت‌های تیم من',
    filter: '',
    disabled: true,
  },
]

/* Helper: return the preset, or the default */
export function getPreset(key: string | undefined) {
  return ActivityPresets.find((p) => p.key === key) || ActivityPresets[0]
}
