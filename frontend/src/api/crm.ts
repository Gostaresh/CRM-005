// src/api/crm.ts

import { BASE_URL } from '@/utils/env'
/**
 * Thin wrapper around fetch that automatically prefixes the backend base URL,
 * attaches credentials and handles JSON ↔ JS conversion.
 */

export interface CRMResponse<T> {
  ok: boolean
  data: T
  status: number
}

export async function crmFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<CRMResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = (await res.json()) as T
  // treat any 2xx as success (200, 201, 204...)
  const ok = res.status >= 200 && res.status < 300
  return { ok, data, status: res.status }
}

/* ------------------------------------------------------------------ *
 * Convenience helpers used by the modals                             *
 * ------------------------------------------------------------------ */

export function searchEntity(type: string, q: string, top = 20) {
  const url = `/api/crm/search?type=${type}&q=${encodeURIComponent(q)}&top=${top}`
  return crmFetch<{ id: string; name: string; type: string }[]>(url)
}

export type DropdownOption = { label: string; value: string }

/** Convenience wrapper specifically for system users autocomplete */
export async function searchSystemUsers(term: string): Promise<DropdownOption[]> {
  const { ok, data } = await searchEntity('systemuser', term)
  if (!ok) return []
  return data.map((u) => ({ label: u.name, value: u.id }))
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
export function updateActivity(id: string, payload: Record<string, unknown>) {
  return crmFetch<{ message: string }>(`/api/crm/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/** @deprecated — kept temporarily for older components */
export const updateTask = updateActivity

export function updateTaskDates(
  id: string,
  dates: { scheduledstart?: string; scheduledend: string },
) {
  return crmFetch<{ message: string }>(`/api/crm/activities/${id}/update-dates`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
  })
}

/* ------------------------------------------------------------------ *
 * Notes (annotation) helpers                                         *
 * ------------------------------------------------------------------ */

/** GET all notes for a task */
export function getTaskNotes(activityId: string) {
  return crmFetch<
    {
      annotationid: string
      subject: string | null
      notetext: string | null
      filename: string | null
      mimetype: string | null
      createdon?: string
    }[]
  >(`/api/crm/activities/${activityId}/notes`)
}

/**
 * Add a note to a task.
 * payload = { subject?: string; notetext?: string; filename?: string; mimetype?: string; documentbody?: string }
 */
export function addTaskNote(activityId: string, payload: Record<string, unknown>) {
  return crmFetch<{ annotationid: string }>(`/api/crm/activities/${activityId}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
