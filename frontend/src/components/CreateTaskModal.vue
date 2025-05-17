<template>
  <n-modal
    v-model:show="modelVisible"
    preset="card"
    :mask-closable="false"
    title="ایجاد فعالیت"
    class="create-task-modal"
    style="width: 500px; max-width: 95vw"
  >
    <div class="mb-3">
      <n-input v-model:value.trim="form.subject" placeholder="موضوع فعالیت *" />
    </div>

    <div class="mb-3">
      <n-input v-model:value="form.description" type="textarea" rows="3" placeholder="توضیحات" />
    </div>
    <hr />

    <!-- Regarding type ------------------------------------------------------- -->
    <div class="mb-3">
      <n-select
        v-model:value="form.regardingType"
        :options="regardingTypeOptions"
        placeholder="نوع موجودیت مرتبط"
      />
    </div>

    <!-- Regarding object (auto‑complete search) ----------------------------- -->
    <div class="mb-3">
      <n-auto-complete
        v-model:value="form.regardingObjectLabel"
        :options="regardingOptions"
        :loading="searching"
        :filter="false"
        placeholder="جستجوی موجودیت مرتبط"
        @update:value="searchRegarding"
        @select="onRegardingSelect"
      />
    </div>

    <!-- Priority ------------------------------------------------------------ -->
    <div class="mb-3">
      <n-select v-model:value="form.priority" :options="priorityOptions" placeholder="اولویت" />
    </div>
    <hr />
    <div class="mb-3">
      <DatePicker
        v-model="form.startMoment"
        type="datetime"
        format="jYYYY/jMM/jDD HH:mm"
        display-format="jYYYY/jMM/jDD HH:mm"
        placeholder="تاریخ و ساعت شروع (اختیاری)"
      />
    </div>

    <div class="mb-3">
      <DatePicker
        v-model="form.endMoment"
        type="datetime"
        format="jYYYY/jMM/jDD HH:mm"
        display-format="jYYYY/jMM/jDD HH:mm"
        placeholder="تاریخ و ساعت سررسید *"
      />
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button tertiary @click="close">انصراف</n-button>
        <n-button type="primary" :disabled="loading" :loading="loading" @click="save">
          ذخیره
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { NModal, NInput, NButton, NSpace, NSelect, NAutoComplete } from 'naive-ui'
import { getRegardingTypeOptions } from '@/composables/useEntityMap'
import { searchEntity, createTask } from '@/api/crm'
/* ---------------------------------------------------------------- *\
  Create‑task modal
  – Uses Naive‑UI & vue3-persian-datetime-picker
  – Emits:
      •   update:visible  → Boolean
      •   created         → the task object returned by API
\* ---------------------------------------------------------------- */

import { reactive, ref, watch, computed } from 'vue'
import moment from 'moment-jalaali'
import { useMessage } from 'naive-ui'
import Vue3PersianDatetimePicker from 'vue3-persian-datetime-picker'

const DatePicker = Vue3PersianDatetimePicker

/* ---------------------------------------------------------------- *\
  Props / emits
\* ---------------------------------------------------------------- */
const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'created'])

const message = useMessage()

/* ---------------------------------------------------------------- *\
  Reactive form state
\* ---------------------------------------------------------------- */
const form = reactive({
  subject: '',
  description: '',
  startMoment: null, // moment | null
  endMoment: null, // moment | null  (required)
  startIso: '',
  endIso: '',
  priority: 1,
  regardingType: 'account',
  regardingObjectId: '',
  regardingObjectLabel: '',
})
const priorityOptions = [
  { label: 'کم', value: 0 },
  { label: 'متوسط', value: 1 },
  { label: 'زیاد', value: 2 },
]

const regardingTypeOptions = getRegardingTypeOptions()

const searching = ref(false)
const regardingOptions = ref([])
async function searchRegarding(query: string) {
  if (!form.regardingType || !query || query.length < 2) {
    regardingOptions.value = []
    return
  }

  searching.value = true
  try {
    const { ok, data } = await searchEntity(form.regardingType, query)
    if (!ok) throw new Error('Search failed')

    // value carries GUID, label is the Persian name shown in the input
    regardingOptions.value = data.map((item) => ({
      label: item.name,
      value: item.id,
    }))
  } catch (e) {
    console.error('Failed to search regarding objects:', e)
  } finally {
    searching.value = false
  }
}

function onRegardingSelect(value: string) {
  form.regardingObjectId = value // GUID
  const match = regardingOptions.value.find((o) => o.value === value)
  form.regardingObjectLabel = match ? match.label : ''
}

watch(
  () => form.startMoment,
  (val) => {
    form.startIso = jalaliToIso(val)
  },
)
watch(
  () => form.endMoment,
  (val) => {
    form.endIso = jalaliToIso(val)
  },
)
watch(
  () => form.regardingType,
  () => {
    // Reset related fields when entity type changes
    form.regardingObjectId = ''
    form.regardingObjectLabel = ''
    regardingOptions.value = []
  },
)

/* ---------------------------------------------------------------- *\
  Derived state
\* ---------------------------------------------------------------- */
// form.endMoment is immediately reactive when the user picks a date
const isValid = computed(() => form.subject.trim().length > 0 && !!form.endMoment)

/* ---------------------------------------------------------------- *\
  Visibility helper (sync w/ parent)
\* ---------------------------------------------------------------- */
const modelVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

function close() {
  modelVisible.value = false
}

/* ---------------------------------------------------------------- *\
  Save handler
\* ---------------------------------------------------------------- */
const loading = ref(false)

async function save() {
  await nextTick() // ensure v-model updates are flushed

  const subjectOk =
    form.subject !== null && form.subject !== undefined && String(form.subject).trim().length > 0

  if (!subjectOk) {
    message.error('موضوع فعالیت الزامی است')
    return
  }
  if (!form.endMoment) {
    message.error('تاریخ سررسید الزامی است')
    return
  }
  loading.value = true

  try {
    const payload = {
      subject: form.subject,
      description: form.description,
      scheduledstart: form.startIso || undefined, // optional
      scheduledend: form.endIso, // required by backend
      prioritycode: form.priority,
      regardingobjectid: form.regardingObjectId || undefined,
      regardingtype: form.regardingType || undefined,
    }

    const { ok, data } = await createTask(payload)
    if (!ok) throw new Error('HTTP error creating task')

    message.success('فعالیت با موفقیت ایجاد شد')
    emit('created', data)
    close()
  } catch (err) {
    console.error('Create task error:', err)
    message.error(err.message || 'خطا در ایجاد فعالیت')
  } finally {
    loading.value = false
  }
}

/* ---------------------------------------------------------------- *\
  Minimal Jalali→ISO helper
  (can later be replaced with composable)
\* ---------------------------------------------------------------- */
function jalaliToIso(value) {
  if (!value) return ''
  if (moment.isMoment(value)) return value.clone().utc().toISOString()

  const m = moment(value, ['jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD'], true)
  return m.isValid() ? m.utc().toISOString() : ''
}
</script>

<style scoped>
.mb-3 {
  margin-bottom: 1rem;
}
.create-task-modal {
  /* width handled inline on n‑modal */
}
</style>
