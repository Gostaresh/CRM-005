// src/api/crm.ts
/**
 * Thin wrapper around fetch that automatically prefixes the backend base URL,
 * attaches credentials and handles JSON ↔ JS conversion.
 */

export interface CRMResponse<T> {
  ok: boolean
  data: T
  status: number
}

const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''

export async function crmFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<CRMResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = (await res.json()) as T
  return { ok: res.ok, data, status: res.status }
}

/* ------------------------------------------------------------------ *
 * Convenience helpers used by the modals                             *
 * ------------------------------------------------------------------ */

export function searchEntity(type: string, q: string, top = 20) {
  const url = `/api/crm/search?type=${type}&q=${encodeURIComponent(q)}&top=${top}`
  return crmFetch<{ id: string; name: string; type: string }[]>(url)
}

export function createTask(payload: Record<string, unknown>) {
  return crmFetch<{ activityId: string; message: string }>('/api/crm/activities', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Full task update (PATCH /api/crm/activities/{id})
 */
export function updateTask(id: string, payload: Record<string, unknown>) {
  return crmFetch<{ message: string }>(`/api/crm/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateTaskDates(
  id: string,
  dates: { scheduledstart?: string; scheduledend: string },
) {
  return crmFetch<{ message: string }>(`/api/crm/activities/${id}/update-dates`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
  })
}
