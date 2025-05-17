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

    <!-- Priority ------------------------------------------------------------ -->
    <div class="mb-3">
      <n-select v-model:value="form.priority" :options="priorityOptions" placeholder="اولویت" />
    </div>

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
        placeholder="جستجوی موجودیت مرتبط"
        @search="searchRegarding"
        @select="onRegardingSelect"
      />
    </div>

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

    <div class="mb-3">
      <n-input v-model="form.description" type="textarea" rows="3" placeholder="توضیحات" />
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

<script setup>
import { nextTick } from 'vue'
import { NModal, NInput, NButton, NSpace, NSelect, NAutoComplete } from 'naive-ui'
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

const regardingTypeOptions = [
  { label: 'حساب (Account)', value: 'account' },
  { label: 'مخاطب (Contact)', value: 'contact' },
  { label: 'سرنخ (Lead)', value: 'lead' },
  { label: 'فرصت (Opportunity)', value: 'opportunity' },
]

const searching = ref(false)
const regardingOptions = ref([])
async function searchRegarding(query) {
  if (!query || query.length < 2) return
  searching.value = true
  try {
    const res = await fetch(
      `${baseUrl}/api/crm/${form.regardingType}s/search?q=${encodeURIComponent(query)}`,
      { credentials: 'include' },
    )
    const data = await res.json() // expecting [{id,name}]
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

function onRegardingSelect(value, option) {
  form.regardingObjectId = value
  form.regardingObjectLabel = option.label
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
const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''

async function save() {
  await nextTick() // ensure v-model updates are flushed

  // DEBUG log form values
  console.log('DEBUG – form values:', {
    subject: form.subject,
    subjectLen: String(form.subject).trim().length,
    startMoment: form.startMoment,
    endMoment: form.endMoment,
    startIso: form.startIso,
    endIso: form.endIso,
    priority: form.priority,
    regardingType: form.regardingType,
    regardingObjectId: form.regardingObjectId,
  })

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

    // DEBUG log payload
    console.log('DEBUG – payload to backend:', payload)

    const res = await fetch(`${baseUrl}/api/crm/activities`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

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
