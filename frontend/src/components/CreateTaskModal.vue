<template>
  <n-modal
    v-model:show="modelVisible"
    preset="card"
    :mask-closable="false"
    title="ایجاد وظیفه"
    class="create-task-modal"
    style="width: 95%; max-width: 95%"
  >
    <n-alert v-if="formErrors.length" type="error" class="mb-2">
      {{ formErrors[0] }}
    </n-alert>
    <div class="modal-grid">
      <!--  LEFT 50 %  – موضوع + توضیحات + عطف -->
      <div class="form-left">
        <!-- موضوع -->
        <n-input v-model:value.trim="form.subject" placeholder="موضوع *" class="mb-3" />

        <!-- توضیحات -->
        <n-input
          v-model:value="form.description"
          type="textarea"
          rows="3"
          placeholder="توضیحات"
          class="mb-3"
        />

        <!-- نوع عطف + عطف به (33 % / 66 %) -->
        <div class="sub-grid-1-2-m2 mb-3">
          <n-select
            v-model:value="form.regardingType"
            :options="regardingTypeOptions"
            placement="bottom-end"
            :consistent-menu-width="true"
            teleported="false"
            placeholder="نوع عطف"
          />
          <n-auto-complete
            v-model:value="form.regardingObjectLabel"
            :options="regardingOptions"
            :loading="searching"
            :filter="false"
            placement="bottom-end"
            :consistent-menu-width="true"
            teleported="false"
            placeholder="عطف به"
            @update:value="searchRegarding"
            @select="onRegardingSelect"
          />
          <n-button
            type="info"
            dashed
            tag="a"
            target="_blank"
            size="medium"
            :href="form.regardingUrl"
            v-if="form.regardingUrl"
            >⛓️‍💥</n-button
          >
        </div>
      </div>

      <!--  RIGHT 50 %  – owner / dates / priority‑seen -->
      <div class="form-right">
        <!-- مالک فعلی (+ hidden previous owner) -->
        <div class="sub-grid-1-1 mb-3">
          <n-auto-complete
            v-model:value="form.ownerLabel"
            :options="ownerOptions"
            :loading="searchingOwner"
            placement="bottom-end"
            :consistent-menu-width="true"
            teleported="false"
            placeholder="مالک فعلی"
            @update:value="searchOwner"
            @select="onOwnerSelect"
          />
          <!-- previous owner hidden in Create -->
          <div></div>
        </div>

        <!-- تاریخ شروع / پایان -->
        <div class="sub-grid-1-1-1 mb-3">
          <DatePicker
            auto-submit
            v-model="form.startMoment"
            type="datetime"
            format="jYYYY/jMM/jDD HH:mm"
            display-format="jYYYY/jMM/jDD HH:mm"
            :jump-minute="30"
            :round-minute="true"
            placeholder="تاریخ شروع *"
          />
          <DatePicker
            auto-submit
            v-model="form.endMoment"
            type="datetime"
            format="jYYYY/jMM/jDD HH:mm"
            display-format="jYYYY/jMM/jDD HH:mm"
            :min="form.startMoment"
            :jump-minute="30"
            :round-minute="true"
            placeholder="تاریخ پایان *"
          />
          <DatePicker
            auto-submit
            v-model="form.endActual"
            type="date"
            format="jYYYY/jMM/jDD"
            display-format="jYYYY/jMM/jDD"
            :min="form.startMoment"
            :round-minute="true"
            placeholder="نهایت مهلت *"
          />
        </div>

        <!-- اولویت / دیده شده -->
        <div class="sub-grid-1-1-1 mb-3">
          <n-select
            v-model:value="form.priority"
            placement="bottom-end"
            :consistent-menu-width="true"
            teleported="false"
            :options="priorityOptions"
            placeholder="اولویت"
          />
          <n-switch
            size="large"
            label="دیده شده"
            v-model:value="form.newSeen"
            :options="seenOptions"
            placement="bottom-start"
            :consistent-menu-width="true"
          >
            <template #checked>دیده شده</template>
            <template #unchecked>دیده نشده</template>
          </n-switch>
          <n-select
            v-model:value="form.state"
            :options="stateOptions"
            placement="bottom-start"
            :consistent-menu-width="true"
            placeholder="وضعیت"
          />
        </div>
      </div>
    </div>

    <!-- یادداشت‌ها label -->
    <h6 class="fw-bold my-2">یادداشت‌ها</h6>

    <!-- Note subject + file row -->
    <div class="sub-grid-1-1 mb-2">
      <n-input v-model:value="note.subject" dir="rtl" placeholder="موضوع" />
      <input type="file" class="form-control form-control-sm" @change="onFileChange" />
    </div>

    <!-- Note textarea -->
    <n-input v-model:value="note.text" type="textarea" rows="3" dir="rtl" placeholder="توضیحات" />

    <template #footer>
      <n-space justify="end">
        <n-button strong secondary type="warning" @click="resetFormFields">ریست</n-button>
        <n-button strong secondary @click="close">انصراف</n-button>
        <n-button
          strong
          secondary
          type="primary"
          :disabled="loading || !isValid"
          :loading="loading"
          @click="save"
        >
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
import { searchEntity, createTask, searchSystemUsers, addTaskNote } from '@/api/crm'
import { PRIORITY_OPTIONS, SEEN_OPTIONS, STATE_OPTIONS } from '@/constants/taskOptions'
import { MAX_FILE_SIZE, fileToBase64 } from '@/utils/fileHelpers'
import { useRegardingSearch, useOwnerSearch } from '@/composables/useEntitySearch'
import { checkActivityRealTimeValidity } from '@/utils/validators'
/* ---------------------------------------------------------------- *\
  Create‑task modal
  – Uses Naive‑UI & vue3-persian-datetime-picker
  – Emits:
      •   update:visible  → Boolean
      •   created         → the task object returned by API
\* ---------------------------------------------------------------- */

import { reactive, ref, watch, computed, onMounted } from 'vue'
import { jalaliToIso, formatDatetimeLocal } from '@/utils/dateHelpers'
import { useMessage } from 'naive-ui'
import Vue3PersianDatetimePicker from 'vue3-persian-datetime-picker'

const DatePicker = Vue3PersianDatetimePicker

/* ---------------------------------------------------------------- *\
  Props / emits
\* ---------------------------------------------------------------- */
const props = defineProps({
  visible: { type: Boolean, default: false },
  /** ISO string coming from the calendar for the cell the user started dragging on */
  defaultStart: { type: String, default: '' },
  /** ISO string coming from the calendar for the cell the user finished dragging on */
  defaultEnd: { type: String, default: '' },
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
  endActual: null,
  startIso: '',
  endIso: '',
  endAIso: '',
  priority: 1,
  regardingType: 'account',
  regardingObjectId: '',
  regardingObjectLabel: '',
  regadingUrl: '',
  ownerId: '',
  ownerLabel: '',
  newSeen: false,
  state: 0,
})

const formErrors = ref<string[]>([])

/**
 * If the parent passes defaultStart / defaultEnd, initialise the form.
 * Runs when the component is mounted and every time the modal is (re‑)opened.
 */
function initDefaults() {
  // Reset previous values
  Object.assign(form, {
    startMoment: '',
    endMoment: '',
    endActual: '',
    startIso: '',
    endIso: '',
    endAIso: '',
  })

  // Apply incoming defaults
  if (props.defaultStart) {
    form.startMoment = formatDatetimeLocal(props.defaultStart)
    form.startIso = new Date(props.defaultStart).toISOString()
  }

  if (props.defaultEnd) {
    form.endMoment = formatDatetimeLocal(props.defaultEnd)
    form.endIso = new Date(props.defaultEnd).toISOString()
  }

  // Wait a tick so DatePicker picks up the new strings
  nextTick()
}

onMounted(initDefaults)

watch(
  () => props.visible,
  (v) => {
    if (v) initDefaults()
  },
)

watch(
  () => [props.defaultStart, props.defaultEnd],
  () => {
    if (modelVisible.value) initDefaults()
  },
)
const priorityOptions = PRIORITY_OPTIONS.slice()
const seenOptions = SEEN_OPTIONS.slice()
const stateOptions = STATE_OPTIONS.slice()

const regardingTypeOptions = getRegardingTypeOptions()

// reactive entity-type ref for regarding search
const regardingTypeRef = computed(() => form.regardingType)

const { regardingOptions, searching, searchRegarding } = useRegardingSearch(regardingTypeRef)

const { ownerOptions, searchingOwner, searchOwner } = useOwnerSearch()

function onRegardingSelect(value: string) {
  form.regardingObjectId = value // GUID
  const match = regardingOptions.value.find((o) => o.value === value)
  form.regardingObjectLabel = match ? match.label : ''
  form.regardingUrl = match ? match.url : ''
}
function onOwnerSelect(value: string, opt?: { label: string; value: string }) {
  if (!opt) {
    opt = ownerOptions.value.find((o) => o.value === value)
  }
  if (opt) {
    form.ownerId = opt.value
    form.ownerLabel = opt.label
  } else {
    form.ownerId = value
    form.ownerLabel = ''
  }
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
  () => form.endActual,
  (val) => {
    form.endAIso = jalaliToIso(val)
  },
)

/* ---------------------------------------------------------------- *\
  Derived state
\* ---------------------------------------------------------------- */
// form.endMoment is immediately reactive when the user picks a date
const isValid = computed(() => formErrors.value.length === 0)

watch(
  () => [form.subject, form.startIso, form.endIso],
  () => {
    formErrors.value = checkActivityRealTimeValidity({
      subject: form.subject,
      startRaw: form.startIso,
      endRaw: form.endIso,
    })
  },
  { immediate: true },
)

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

const note = reactive<{ subject: string; text: string; file: File | null; base64: string }>({
  subject: '',
  text: '',
  file: null,
  base64: '',
})

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return

  const f = target.files[0]
  try {
    note.base64 = await fileToBase64(f)
    note.file = f
  } catch (err: any) {
    message.error(err.message)
    note.file = null
    note.base64 = ''
  } finally {
    target.value = '' // allow re‑selecting the same file
  }
}

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
  if (!form.endActual) {
    message.error('تاریخ انجام الزامی است')
    return
  }
  loading.value = true

  try {
    const payload: any = {
      subject: form.subject,
      description: form.description,
      scheduledstart: form.startIso || undefined,
      scheduledend: form.endIso, // required
      actualend: form.endAIso || undefined,
      prioritycode: Number(form.priority),
      new_seen: !!form.newSeen,
    }

    // Regarding lookup – only add when both pieces exist
    if (form.regardingObjectId) {
      const nav = `regardingobjectid_${form.regardingType}@odata.bind`
      payload[nav] = `/${form.regardingType}s(${form.regardingObjectId})`
    }

    // Owner lookup
    if (form.ownerId) {
      payload['ownerid@odata.bind'] = `/systemusers(${form.ownerId})`
    }

    // (Remove any legacy plain columns if present)
    // payload.regardingobjectid, payload.regardingtype, payload.ownerid are not set anymore

    console.log(payload)
    const { ok, data } = await createTask(payload)
    if (!ok) throw new Error('HTTP error creating task')

    if (ok) {
      // If user entered a note, create it
      if (note.text.trim() || note.base64) {
        const notePayload: Record<string, unknown> = {
          subject: note.subject || 'بدون موضوع',
          notetext: note.text || 'بدون توضیحات',
        }
        if (note.base64) {
          notePayload.filename = note.file?.name
          notePayload.mimetype = note.file?.type
          notePayload.documentbody = note.base64
        }
        await addTaskNote(data.activityId, notePayload)
      }
    }

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
  Reset button (Create modal only)
\* ---------------------------------------------------------------- */
function resetFormFields() {
  Object.assign(form, {
    subject: '',
    description: '',
    startMoment: '',
    endMoment: '',
    endActual: '',
    startIso: '',
    endIso: '',
    endAIso: '',
    priority: 1,
    regardingType: 'account',
    regardingObjectId: '',
    regardingObjectLabel: '',
    regardingUrl: '',
    ownerId: '',
    ownerLabel: '',
    newSeen: 0,
    state: 0,
  })
  Object.assign(note, { subject: '', text: '', file: null, base64: '' })
  regardingOptions.value = []
  ownerOptions.value = []
}
</script>

<style scoped>
.mb-3 {
  margin-bottom: 1rem;
}
</style>
