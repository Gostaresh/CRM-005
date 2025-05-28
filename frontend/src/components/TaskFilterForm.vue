<template>
  <div class="w-100">
    <n-form :model="model" label-placement="top" :size="'small'">
      <template v-for="field in schema" :key="field.key">
        <n-form-item :label="field.label">
          <component
            :is="resolveCmp(field)"
            v-bind="resolveProps(field)"
            v-model:value="model[field.key]"
          />
        </n-form-item>
      </template>

      <n-space justify="end">
        <n-button type="primary" @click="submit">جستجو</n-button>
      </n-space>
    </n-form>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useFilterStore } from '@/stores/filter'
import DatePicker from 'vue3-persian-datetime-picker' // you already use it

/* ------------------------------------------------------------------ */
/*  load schema via Pinia                                            */
/* ------------------------------------------------------------------ */
const filter = useFilterStore()
onMounted(filter.load)

const schema = computed(() => filter.schema)
const model = computed(() => filter.model)

const emit = defineEmits(['filter'])

/* --------- helpers ------------------------------------------------ */
function resolveCmp(f) {
  return f.type === 'Picklist'
    ? 'n-select'
    : f.type === 'Boolean'
      ? 'n-switch'
      : f.type === 'DateTime'
        ? DatePicker
        : f.type === 'Lookup'
          ? 'n-auto-complete'
          : 'n-input'
}
function resolveProps(f) {
  if (f.type === 'Picklist') {
    return { options: f.options, placeholder: f.label }
  }
  if (f.type === 'DateTime') {
    return { type: 'datetimerange', clearable: true }
  }
  if (f.type === 'Lookup') {
    return {
      placeholder: 'جستجو…',
      filter: false,
      remote: true,
      onSearch: async (q) => {
        const r = await fetch(`/api/crm/search?entity=systemuser&q=${q}`)
        const v = await r.json()
        return v.map((u) => ({ label: u.fullname, value: u.systemuserid }))
      },
    }
  }
  return {}
}
function submit() {
  const parts = []
  Object.entries(model.value).forEach(([k, v]) => {
    if (v === '' || v == null) return
    if (Array.isArray(v) && v.length === 2) {
      // date-range from Jalali picker
      parts.push(`${k} ge ${v[0]}`)
      parts.push(`${k} le ${v[1]}`)
    } else {
      parts.push(`${k} eq ${v}`)
    }
  })
  emit('filter', parts.join(' and '))
}
</script>
