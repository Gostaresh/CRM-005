// src/composables/useEntitySearch.ts
// -----------------------------------------------------------------------------
// Lightweight composables to provide autocomplete options for
// 'regarding' (generic entity) and 'owner' (system user) fields.
// -----------------------------------------------------------------------------
import { ref, Ref, watch } from 'vue'
import { searchEntity, searchSystemUsers } from '@/api/crm'

/**
 * Entity search tied to a reactive `regardingType` ref.
 */
export function useRegardingSearch(regardingType: Ref<string>) {
  const options = ref<{ label: string; value: string }[]>([])
  const searching = ref(false)

  // Reset options when the entity type changes
  watch(regardingType, () => {
    options.value = []
  })

  async function searchRegarding(query: string) {
    if (!regardingType.value || !query || query.length < 2) {
      options.value = []
      return
    }
    searching.value = true
    try {
      const { ok, data } = await searchEntity(regardingType.value, query)
      if (ok) {
        options.value = data.map((item: any) => ({
          label: item.name,
          value: item.id,
        }))
      }
    } catch (err) {
      console.error('searchRegarding error:', err)
    } finally {
      searching.value = false
    }
  }

  return { regardingOptions: options, searching, searchRegarding }
}

/**
 * System-user search.
 */
export function useOwnerSearch() {
  const ownerOptions = ref<{ label: string; value: string }[]>([])
  const searchingOwner = ref(false)

  async function searchOwner(query: string) {
    if (!query || query.length < 2) return
    searchingOwner.value = true
    ownerOptions.value = await searchSystemUsers(query)
    searchingOwner.value = false
  }

  return { ownerOptions, searchingOwner, searchOwner }
}
