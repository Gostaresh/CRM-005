// src/composables/useEntityMap.ts
export interface EntityMeta {
  set: string
  display: string
  id: string
}

/**
 * Central entity metadata used by both search autocomplete
 * and payload building. Extend this object to support more
 * Dynamics entities – no code changes required.
 */
export const entityMap: Record<string, EntityMeta> = {
  account: { set: 'accounts', display: 'name', id: 'accountid' },
  contact: { set: 'contacts', display: 'fullname', id: 'contactid' },
  lead: { set: 'leads', display: 'subject', id: 'leadid' },
  opportunity: { set: 'opportunities', display: 'name', id: 'opportunityid' },
  invoice: { set: 'invoices', display: 'name', id: 'invoiceid' },
  order: { set: 'salesorders', display: 'name', id: 'salesorderid' },
  quote: { set: 'quotes', display: 'name', id: 'quoteid' },
  case: { set: 'incidents', display: 'title', id: 'incidentid' },
}

/** Options for <n-select> */
export function getRegardingTypeOptions() {
  return Object.keys(entityMap).map((key) => ({
    label: key, // you can localise later
    value: key,
  }))
}

/** Helper to fetch meta for the given key */
export function getEntityMeta(type: string): EntityMeta | undefined {
  return entityMap[type.toLowerCase()]
}
