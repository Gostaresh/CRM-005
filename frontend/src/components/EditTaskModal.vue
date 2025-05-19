<template>
  <div
    class="modal fade"
    id="edit-task-modal"
    tabindex="-1"
    aria-labelledby="editTaskModalLabel"
    aria-hidden="true"
    ref="modalEl"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <form @submit.prevent="saveTask">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title" id="editTaskModalLabel">Edit Task</h5>
            <button type="button" class="btn-close" @click="hideModal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label for="task-subject" class="form-label">Subject</label>
              <input type="text" class="form-control" id="task-subject" v-model="form.subject" />
            </div>

            <div class="mb-3">
              <label for="task-description" class="form-label">Description</label>
              <textarea
                class="form-control"
                id="task-description"
                rows="3"
                v-model="form.description"
              ></textarea>
            </div>

            <!-- Regarding type -->
            <div class="mb-3">
              <label class="form-label">نوع موجودیت مرتبط</label>
              <n-select
                v-model:value="form.regardingType"
                :options="regardingTypeOptions"
                placeholder="انتخاب نوع موجودیت"
              />
            </div>

            <!-- Regarding object search -->
            <div class="mb-3">
              <n-auto-complete
                v-model:value="form.regardingObjectLabel"
                :options="regardingOptions"
                :loading="searching"
                :filter="false"
                placeholder="جستجوی موجودیت مرتبط"
                @search="searchRegarding"
                @select="onRegardingSelect"
              />
            </div>

            <!-- Owner / مسئول --------------------------------------------------- -->
            <div class="mb-3">
              <n-auto-complete
                v-model:value="form.ownerLabel"
                :options="ownerOptions"
                :loading="searchingOwner"
                :filter="false"
                placeholder="جستجوی مسئول (کاربر)"
                @update:value="searchOwner"
                @select="onOwnerSelect"
              />
            </div>

            <!-- Priority ----------------------------------------------------- -->
            <div class="mb-3">
              <n-select
                v-model:value="form.priority"
                :options="priorityOptions"
                placeholder="اولویت"
              />
            </div>

            <!-- Seen --------------------------------------------------------- -->
            <div class="mb-3">
              <label class="form-label">دیده شده؟</label>
              <n-select
                v-model:value="form.newSeen"
                :options="seenOptions"
                placeholder="وضعیت دیده شدن"
              />
            </div>

            <!-- Last Owner (read‑only) --------------------------------------- -->
            <div class="mb-3">
              <label class="form-label">آخرین مسئول قبلی</label>
              <n-input :value="form.lastOwnerLabel" disabled />
            </div>

            <hr />

            <div class="mb-3">
              <label for="task-start" class="form-label">Start Date</label>
              <date-picker
                type="datetime"
                v-model="form.startDisplay"
                format="jYYYY/jMM/jDD HH:mm"
                display-format="jYYYY/jMM/jDD HH:mm"
                :minute-step="30"
                @change="updateStartTime"
                @update:modelValue="updateStartTime"
              />
            </div>

            <div class="mb-3">
              <label for="task-end" class="form-label">End Date</label>
              <date-picker
                type="datetime"
                v-model="form.endDisplay"
                format="jYYYY/jMM/jDD HH:mm"
                display-format="jYYYY/jMM/jDD HH:mm"
                :minute-step="30"
                @change="updateEndTime"
                @update:modelValue="updateEndTime"
              />
            </div>

            <!-- Notes list -->
            <hr />
            <h6 class="fw-bold mb-2">یادداشت‌ها</h6>
            <NoteList :notes="notes" />

            <!-- Add new note -->
            <div class="mb-2">
              <input
                v-model="newNote.subject"
                class="form-control form-control-sm mb-1"
                placeholder="عنوان یادداشت"
              />
              <textarea
                v-model="newNote.text"
                class="form-control form-control-sm mb-1"
                rows="2"
                placeholder="متن یادداشت"
              ></textarea>
              <input class="form-control form-control-sm mb-2" type="file" @change="onNewFile" />
              <button type="button" class="btn btn-sm btn-outline-primary" @click="addNote">
                افزودن یادداشت
              </button>
            </div>
          </div>

          <div class="modal-footer pt-0 border-top-0">
            <button type="button" class="btn btn-outline-secondary" @click="hideModal">
              انصراف
            </button>
            <button type="submit" class="btn btn-success">ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { ref, watch, onMounted, onUnmounted, reactive } from 'vue'
import { getRegardingTypeOptions } from '@/composables/useEntityMap'
import { searchEntity, updateTask, searchSystemUsers, getTaskNotes, addTaskNote } from '@/api/crm'
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle'
import moment from 'moment-jalaali'
import momentTz from 'moment-timezone'
import DatePicker from 'vue3-persian-datetime-picker'
import NoteList from './NoteList.vue'
moment.tz = momentTz.tz
moment.loadPersian({ usePersianDigits: false })

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
    const modalEl = ref(null)
    let bsModal = null

    const form = ref({
      subject: '',
      description: '',
      startDisplay: '',
      endDisplay: '',
      startRaw: '',
      endRaw: '',
      regardingType: '',
      regardingObjectId: '',
      regardingObjectLabel: '',
      ownerId: '',
      ownerLabel: '',
      priority: 1,
      newSeen: 0, // option‑set: 0 = No, 1 = Yes
      lastOwnerLabel: '', // read‑only label
    })

    const notes = ref([])
    const newNote = reactive({ subject: '', text: '', file: null, base64: '' })
    function onNewFile(e) {
      const f = e.target.files?.[0]
      if (!f) return
      newNote.file = f
      const r = new FileReader()
      r.onload = () => {
        newNote.base64 = String(r.result).split(',').pop() || ''
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
      if (!form.value.regardingType || !query || query.length < 2) {
        regardingOptions.value = []
        return
      }
      searching.value = true
      try {
        const { ok, data } = await searchEntity(form.value.regardingType, query)
        if (ok) {
          regardingOptions.value = data.map((item) => ({
            label: item.name,
            value: item.id,
          }))
        }
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
      { label: 'بله', value: 1 },
      { label: 'خیر', value: 0 },
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

      form.value.newSeen =
        typeof props.task.new_seen !== 'undefined' ? (props.task.new_seen ? 1 : 0) : 0

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
      form.value.startRaw = props.task.scheduledstart || ''
      form.value.endRaw = props.task.scheduledend || ''
    }

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

    const showModal = () => {
      if (bsModal) {
        bsModal.show()
      }
    }

    const hideModal = () => {
      if (bsModal) {
        bsModal.hide()
      }
    }

    watch(
      () => props.visible,
      async (newVal) => {
        if (newVal) {
          resetForm()
          showModal()
        } else {
          hideModal()
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

    onMounted(() => {
      bsModal = new bootstrap.Modal(modalEl.value, {
        backdrop: 'static',
        keyboard: false,
      })

      modalEl.value.addEventListener('hidden.bs.modal', () => {
        emit('update:visible', false)
      })

      // Fetch notes only after the modal is fully shown
      modalEl.value.addEventListener('shown.bs.modal', async () => {
        const { ok, data } = await getTaskNotes(props.task.activityid)
        notes.value = ok ? data : []
      })

      if (props.visible) {
        showModal()
      }
    })

    const saveTask = async () => {
      try {
        const updatedTask = {
          subject: form.value.subject,
          description: form.value.description,
          scheduledstart: form.value.startRaw || props.task.scheduledstart,
          scheduledend: form.value.endRaw || props.task.scheduledend,
          prioritycode: Number(form.value.priority),
          new_seen: !!Number(form.value.newSeen),
        }

        if (form.value.regardingObjectId) {
          updatedTask.regardingobjectid = form.value.regardingObjectId
          updatedTask.regardingtype = form.value.regardingType
        }

        if (form.value.ownerId) {
          updatedTask.ownerid = form.value.ownerId
        }

        console.log('form start task:', form.value.startRaw, 'form end Task:', form.value.endRaw)
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
        const { ok: ok2, data } = await getTaskNotes(props.task.activityid)
        if (ok2) notes.value = data
        Object.assign(newNote, { subject: '', text: '', file: null, base64: '' })
      }
    }

    return {
      modalEl,
      form,
      hideModal,
      saveTask,
      updateStartTime,
      updateEndTime,
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
      notes,
      newNote,
      onNewFile,
      addNote,
      NoteList,
    }
  },
}
</script>
