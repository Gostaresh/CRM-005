<template>
  <n-modal
    v-model:show="modelVisible"
    preset="card"
    :mask-closable="false"
    title="ایجاد فعالیت"
    class="create-task-modal"
  >
    <div class="mb-3">
      <n-input v-model.trim="form.subject" placeholder="موضوع فعالیت *" />
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
        <n-button type="primary" :disabled="!isValid" :loading="loading" @click="save">
          ذخیره
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
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
})

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
const isValid = computed(() => !!form.subject && !!form.endIso)

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
const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || ''

async function save() {
  if (!isValid.value) return
  loading.value = true

  try {
    const payload = {
      subject: form.subject,
      description: form.description,
      scheduledstart: form.startIso || undefined, // optional
      scheduledend: form.endIso, // required by backend
      prioritycode: 1,
    }

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
  width: 400px;
  max-width: 95vw;
}
</style>
