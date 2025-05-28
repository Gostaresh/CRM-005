import { defineStore } from 'pinia'

export const useFilterStore = defineStore('filter', {
  state: () => ({
    schema: [], // array of field descriptors from /api/meta/task/filters
    model: {}, // reactive object { fieldKey: value }
  }),
  actions: {
    async load() {
      if (this.schema.length) return // already cached

      const res = await fetch('/api/meta/task/filters', { credentials: 'include' })
      if (res.status === 304) return // HTTP cache hit
      this.schema = await res.json()

      // initialise model with pick-list defaults
      this.schema.forEach((f) => {
        if (f.default !== undefined) this.model[f.key] = f.default
      })
    },
  },
})
