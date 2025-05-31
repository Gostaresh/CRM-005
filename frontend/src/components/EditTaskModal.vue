<template>
  <n-modal
    v-model:show="modelVisible"
    preset="card"
    :mask-closable="false"
    title="ویرایش وظیفه"
    class="edit-task-modal"
    style="width: 80%; max-width: 85%"
  >
    <div class="modal-body">
      <n-alert v-if="!canEdit" type="warning" class="mb-2">
        شما مالک یا سازندهٔ این فعالیت نیستید؛ امکان ویرایش ندارید.
      </n-alert>
      <div class="modal-grid">
        <!-- LEFT 50 % – موضوع + توضیحات + عطف -->
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

          <!-- نوع عطف + عطف به -->
          <div class="sub-grid-33-66 mb-3">
            <n-select
              v-model:value="form.regardingType"
              :options="regardingTypeOptions"
              placement="bottom-start"
              :consistent-menu-width="true"
              placeholder="نوع عطف"
            />
            <n-auto-complete
              v-model:value="form.regardingObjectLabel"
              :options="regardingOptions"
              :loading="searching"
              :filter="false"
              placement="bottom-start"
              :consistent-menu-width="true"
              placeholder="عطف به"
              @update:value="searchRegarding"
              @select="onRegardingSelect"
            />
          </div>
        </div>

        <!-- RIGHT 50 % – owners / dates / priority‑seen -->
        <div class="form-right">
          <!-- مالک فعلی + قبلی -->
          <div class="sub-grid-50-50 mb-3">
            <n-auto-complete
              v-model:value="form.ownerLabel"
              :options="ownerOptions"
              :loading="searchingOwner"
              :filter="false"
              placement="bottom-start"
              :consistent-menu-width="true"
              placeholder="مالک فعلی"
              @update:value="searchOwner"
              @select="onOwnerSelect"
            />
            <n-input :value="form.lastOwnerLabel" disabled placeholder="مالک قبلی" />
          </div>

          <!-- تاریخ‌ها -->
          <div class="sub-grid-33-33-33 mb-3">
            <DatePicker
              auto-submit
              v-model="form.startDisplay"
              type="datetime"
              format="jYYYY/jMM/jDD HH:mm"
              display-format="jYYYY/jMM/jDD HH:mm"
              :jump-minute="30"
              :round-minute="true"
              placeholder="تاریخ شروع *"
              @change="updateStartTime"
              @update:modelValue="updateStartTime"
            />
            <DatePicker
              auto-submit
              v-model="form.endDisplay"
              type="datetime"
              format="jYYYY/jMM/jDD HH:mm"
              display-format="jYYYY/jMM/jDD HH:mm"
              :min="form.startDisplay"
              :jump-minute="30"
              :round-minute="true"
              placeholder="تاریخ پایان *"
              @change="updateEndTime"
              @update:modelValue="updateEndTime"
            />
            <DatePicker
              auto-submit
              v-model="form.endActual"
              type="datetime"
              format="jYYYY/jMM/jDD HH:mm"
              display-format="jYYYY/jMM/jDD HH:mm"
              :min="form.startDisplay"
              :jump-minute="30"
              :round-minute="true"
              placeholder="مهلت انجام *"
              @change="updateEndActual"
              @update:modelValue="updateEndActual"
            />
          </div>

          <!-- اولویت / دیده شده -->
          <div class="sub-grid-33-33-33 mb-3">
            <n-select
              v-model:value="form.priority"
              :options="priorityOptions"
              placement="bottom-start"
              :consistent-menu-width="true"
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
              v-model:value="form.stateCode"
              :options="stateOptions"
              placement="bottom-start"
              :consistent-menu-width="true"
              placeholder="وضعیت"
            />
          </div>
        </div>
      </div>

      <!-- یادداشت‌ها -->
      <h6 class="fw-bold my-2">یادداشت‌ها</h6>
      <NoteList :notes="notes" class="mb-2" />

      <!-- افزودن یادداشت -->
      <div class="sub-grid-50-50 mb-2">
        <n-input v-model:value="newNote.subject" placeholder="موضوع" />
        <input type="file" class="form-control form-control-sm" @change="onNewFile" />
      </div>
      <n-input
        v-model:value="newNote.text"
        type="textarea"
        rows="3"
        placeholder="توضیحات"
        class="mb-2"
      />
      <button type="button" class="btn btn-sm btn-outline-primary" @click="addNote">
        افزودن یادداشت
      </button>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button strong secondary @click="hideModal">انصراف</n-button>
        <n-button strong type="primary" :disabled="!canEdit" @click="saveTask"> ذخیره </n-button>
      </n-space>
      <n-space justify="start">
        <n-button
          strong
          secondary
          type="warning"
          tag="a"
          target="_blank"
          :href="task.recordUrl"
          v-if="task.recordUrl"
          >CRM</n-button
        >
      </n-space>
    </template>
  </n-modal>
</template>

<script>
import axios from 'axios'
import { ref, watch, onMounted, onUnmounted, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getRegardingTypeOptions } from '@/composables/useEntityMap'
import { searchEntity, updateTask, searchSystemUsers, getTaskNotes, addTaskNote } from '@/api/crm'
import moment from 'moment-jalaali'
import momentTz from 'moment-timezone'
import DatePicker from 'vue3-persian-datetime-picker'
import NoteList from './NoteList.vue'
moment.tz = momentTz.tz
moment.loadPersian({ usePersianDigits: false })

// Maximum upload size (≈ 330 KB)
const MAX_FILE_SIZE = 330 * 1024

export default {
  name: 'EditTaskModal',
  components: { DatePicker, NoteList },
  props: {
    task: {
      type: Object,
      required: true,
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const auth = useAuthStore()
    const modelVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    })
    /** user may edit if they’re owner or creator */
    const canEdit = computed(() => {
      const me = auth.user?.id
      return props.task?._ownerid_value === me || props.task?._createdby_value === me
    })
    function hideModal() {
      modelVisible.value = false
    }

    const form = ref({
      subject: '',
      description: '',
      startDisplay: '',
      endDisplay: '',
      endActual: '',
      startRaw: '',
      endRaw: '',
      endARaw: '',
      regardingType: '',
      regardingObjectId: '',
      regardingObjectLabel: '',
      ownerId: '',
      ownerLabel: '',
      priority: 1,
      stateCode: 0, // 0 = open , 1 = completed , 2 = canceled , 3 - scheduled
      newSeen: 0, // option‑set: 0 = No, 1 = Yes
      lastOwnerLabel: '', // read‑only label
    })

    const notes = ref([])
    async function loadNotes() {
      const { ok, data } = await getTaskNotes(props.task.activityid)
      notes.value = ok ? data : []
    }
    const newNote = reactive({ subject: '', text: '', file: null, base64: '' })
    function onNewFile(e) {
      const f = e.target.files?.[0]
      if (!f) return
      if (f && f.size > MAX_FILE_SIZE) {
        alert('حداکثر اندازه فایل ۳۳۰ کیلوبایت است')
        newNote.file = null
        newNote.base64 = ''
        e.target.value = ''
        return
      }
      newNote.file = f
      const r = new FileReader()
      r.onload = () => {
        newNote.base64 = String(r.result).split(',').pop() || ''
        e.target.value = ''
      }
      r.readAsDataURL(f)
    }

    const formatDatetimeLocal = (dateStr) => {
      if (!dateStr) return ''
      // Parse as UTC, then convert to local time, then format as Jalali with time
      return moment(dateStr).utc().local().format('jYYYY/jMM/jDD HH:mm')
    }

    // Regarding helpers
    const regardingTypeOptions = getRegardingTypeOptions()
    const searching = ref(false)
    const regardingOptions = ref([])

    async function searchRegarding(query) {
      console.log('Searching regarding ...', form.value.regardingType)
      if (!form.value.regardingType || !query || query.length < 2) {
        regardingOptions.value = []
        return
      }
      searching.value = true
      try {
        const { ok, data } = await searchEntity(form.value.regardingType, query)
        if (!ok) throw new Error('Search failed')
        if (ok) {
          regardingOptions.value = data.map((item) => ({
            label: item.name,
            value: item.id,
          }))
        }
      } catch (e) {
        console.error('Failed to search regarding objects:', e)
      } finally {
        searching.value = false
      }
    }

    function onRegardingSelect(value) {
      form.value.regardingObjectId = value
      const opt = regardingOptions.value.find((o) => o.value === value)
      form.value.regardingObjectLabel = opt ? opt.label : ''
    }

    // Owner helpers
    const ownerOptions = ref([])
    const searchingOwner = ref(false)
    async function searchOwner(q) {
      if (!q || q.length < 2) return
      searchingOwner.value = true
      ownerOptions.value = await searchSystemUsers(q)
      searchingOwner.value = false
    }
    function onOwnerSelect(value, opt) {
      if (!opt) {
        opt = ownerOptions.value.find((o) => o.value === value)
      }
      if (opt) {
        form.value.ownerId = opt.value
        form.value.ownerLabel = opt.label
      } else {
        form.value.ownerId = value
        form.value.ownerLabel = ''
      }
    }

    const priorityOptions = [
      { label: 'کم', value: 0 },
      { label: 'متوسط', value: 1 },
      { label: 'زیاد', value: 2 },
    ]

    const seenOptions = [
      { label: 'دیده شده', value: 1 },
      { label: 'دیده نشده', value: 0 },
    ]

    const stateOptions = [
      { label: 'باز', value: 0 },
      { label: 'اتمام کار', value: 1 },
      { label: 'لغو شده', value: 2 },
      { label: 'برنامه ریزی شده', value: 3 },
    ]

    const resetForm = () => {
      if (!props.task) return

      form.value.subject = props.task.subject || ''
      form.value.description = props.task.description || ''

      // Regarding fields
      form.value.regardingType = props.task.regardingtype || ''
      form.value.regardingObjectId = props.task.regardingobjectid || ''
      form.value.regardingObjectLabel =
        props.task.regardingname || props.task.regardingObjectLabel || ''

      // Owner fields
      form.value.ownerId = props.task._ownerid_value || ''
      form.value.ownerLabel = props.task.owner?.name || ''

      form.value.priority =
        typeof props.task.prioritycode === 'number' ? props.task.prioritycode : 1
      form.value.statecode = typeof props.task.statecode === 'number' ? props.task.statecode : 1
      form.value.newSeen =
        typeof props.task.new_seen !== 'undefined' ? (props.task.new_seen ? true : false) : false

      form.value.lastOwnerLabel = props.task.lastownername || '(N/A)'

      // If we have an existing regarding ID, pre‑seed the autocomplete list
      if (form.value.regardingObjectId) {
        regardingOptions.value = [
          {
            label: form.value.regardingObjectLabel || '(انتخاب شده)',
            value: form.value.regardingObjectId,
          },
        ]
      } else {
        regardingOptions.value = []
      }

      // If we have an existing owner ID, pre-seed the owner autocomplete list
      if (form.value.ownerId) {
        ownerOptions.value = [
          {
            label: form.value.ownerLabel || '(انتخاب شده)',
            value: form.value.ownerId,
          },
        ]
      } else {
        ownerOptions.value = []
      }

      // Dates
      form.value.startDisplay = props.task.scheduledstart
        ? formatDatetimeLocal(props.task.scheduledstart)
        : ''
      form.value.endDisplay = props.task.scheduledend
        ? formatDatetimeLocal(props.task.scheduledend)
        : ''
      form.value.endActual = props.task.actualend ? formatDatetimeLocal(props.task.actualend) : ''

      form.value.startRaw = props.task.scheduledstart || ''
      form.value.endRaw = props.task.scheduledend || ''
      form.value.endARaw = props.task.actualend || ''
    }
    loadNotes()
    // Utility: Convert Jalali datetime string (jYYYY/jMM/jDD HH:mm) to UTC ISO string
    const jalaliToIso = (jDateStr) => {
      // Accept either a Moment instance or a Jalali-formatted string
      if (!jDateStr) return ''

      // If a moment object is passed, convert it directly
      if (moment.isMoment(jDateStr)) {
        return jDateStr.clone().utc().toISOString()
      }

      if (typeof jDateStr !== 'string') {
        console.warn('Unsupported value for jalaliToIso:', jDateStr)
        return ''
      }

      // Accept strings with or without an explicit time portion
      const parseFormats = ['jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD']
      const m = moment(jDateStr, parseFormats, true) // strict parsing

      if (!m.isValid()) {
        console.warn('Invalid Jalali datetime string:', jDateStr)
        return ''
      }

      // Convert the moment (which is created in local time) to UTC ISO string
      return m.utc().toISOString()
    }

    const updateStartTime = (value) => {
      console.log('updateStartTime received:', value)
      if (value !== null && value !== undefined) {
        form.value.startRaw = jalaliToIso(value)
      }
    }

    const updateEndTime = (value) => {
      console.log('updateEndTime received:', value)
      if (value !== null && value !== undefined) {
        form.value.endRaw = jalaliToIso(value)
      }
    }

    const updateEndActual = (value) => {
      console.log('updateEndActual received:', value)
      if (value !== null && value !== undefined) {
        form.value.endARaw = jalaliToIso(value)
      }
    }

    let hasInitialized = false
    watch(
      () => form.value.regardingType,
      (newVal, oldVal) => {
        if (!hasInitialized) {
          hasInitialized = true // don’t reset on first assignment
          return
        }
        if (newVal !== oldVal) {
          form.value.regardingObjectId = ''
          form.value.regardingObjectLabel = ''
          regardingOptions.value = []
        }
      },
    )

    watch(
      () => props.task,
      (newTask) => {
        if (newTask) {
          resetForm()
        }
      },
      { immediate: true },
    )

    // Fetch notes each time the modal becomes visible
    watch(
      () => props.visible,
      (v) => {
        if (v) loadNotes()
      },
    )

    const saveTask = async () => {
      try {
        const updatedTask = {
          subject: form.value.subject,
          description: form.value.description,
          scheduledstart: form.value.startRaw || props.task.scheduledstart,
          scheduledend: form.value.endRaw || props.task.scheduledend,
          actualend: form.value.endARaw || props.task.actualend,
          prioritycode: String(form.value.priority),
          new_seen: !!Number(form.value.newSeen),
          statecode: String(form.value.stateCode),
        }

        if (form.value.regardingObjectId) {
          updatedTask.regardingobjectid = form.value.regardingObjectId
          updatedTask.regardingtype = form.value.regardingType
        }

        if (form.value.ownerId) {
          updatedTask.ownerid = form.value.ownerId
        }

        //console.log('form start task:', form.value.startRaw, 'form end Task:', form.value.endRaw)
        const { ok, data } = await updateTask(props.task.activityid, updatedTask)
        if (!ok) throw new Error('HTTP error while updating task')
        const response = { data }
        emit('update', {
          ...response.data,
          start: response.data.scheduledstart,
          end: response.data.scheduledend,
        })
        hideModal()
      } catch (error) {
        console.error('Failed to update task:', error)
        alert('Failed to update task. Please try again.')
      }
    }

    async function addNote() {
      if (!newNote.text.trim() && !newNote.base64) return
      const payload = {
        subject: newNote.subject,
        notetext: newNote.text,
      }
      if (newNote.base64) {
        payload.filename = newNote.file?.name
        payload.mimetype = newNote.file?.type
        payload.documentbody = newNote.base64
      }
      const { ok } = await addTaskNote(props.task.activityid, payload)
      if (ok) {
        await loadNotes()
        Object.assign(newNote, { subject: '', text: '', file: null, base64: '' })
      }
    }

    return {
      form,
      modelVisible,
      hideModal,
      saveTask,
      updateStartTime,
      updateEndTime,
      updateEndActual,
      regardingTypeOptions,
      regardingOptions,
      searching,
      searchRegarding,
      onRegardingSelect,
      ownerOptions,
      searchingOwner,
      searchOwner,
      onOwnerSelect,
      priorityOptions,
      seenOptions,
      stateOptions,
      notes,
      newNote,
      onNewFile,
      addNote,
      loadNotes,
      NoteList,
      canEdit,
    }
  },
}
</script>
