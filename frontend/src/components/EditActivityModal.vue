<template>
  <n-modal
    v-model:show="modelVisible"
    preset="card"
    :mask-closable="false"
    :title="modalTitle"
    class="edit-task-modal"
    style="width: 80%; max-width: 85%"
  >
    <div class="modal-body">
      <n-alert v-if="formErrors.length" type="error" class="mb-2">
        {{ formErrors[0] }}
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
              type="date"
              format="jYYYY/jMM/jDD"
              display-format="jYYYY/jMM/jDD"
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
              v-model:value="form.statuscode"
              :options="statusOptionsRef"
              placement="bottom-start"
              :consistent-menu-width="true"
              :virtual-scroll="false"
              label-field="label"
              value-field="value"
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
        <n-input v-model:value="newNote.subject" dir="rtl" placeholder="موضوع" />
        <input type="file" class="form-control form-control-sm" @change="onNewFile" />
      </div>
      <n-input
        v-model:value="newNote.text"
        type="textarea"
        rows="3"
        placeholder="توضیحات"
        class="mb-2"
        dir="rtl"
      />
      <button type="button" class="btn btn-sm btn-outline-primary" @click="addNote">
        افزودن یادداشت
      </button>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button strong secondary @click="hideModal">انصراف</n-button>
        <n-button strong type="primary" :disabled="!canEdit || formErrors.length" @click="saveTask">
          ذخیره
        </n-button>
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
        <n-button
          strong
          secondary
          tag="a"
          :href="shareLink"
          target="_blank"
          type="default"
          v-if="shareLink"
        >
          لینک اشتراک
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script>
import { ref, watch, reactive, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import {
  ACTIVITY_DISPLAY_NAMES,
  PRIORITY_OPTIONS,
  SEEN_OPTIONS,
  STATE_OPTIONS,
} from '@/constants/taskOptions'
import { getRegardingTypeOptions } from '@/composables/useEntityMap'
import { updateActivity, getTaskNotes, addTaskNote } from '@/api/crm'
import { useRegardingSearch, useOwnerSearch } from '@/composables/useEntitySearch'
import { formatDatetimeLocal, jalaliToIso } from '@/utils/dateHelpers'
import { MAX_FILE_SIZE, fileToBase64 } from '@/utils/fileHelpers'
import { validateTask } from '@/utils/validators'
import DatePicker from 'vue3-persian-datetime-picker'
import NoteList from './NoteList.vue'

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
    const message = useMessage()
    const modelVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    })
    const modalTitle = computed(() => {
      const type = props.task?.activitytypecode || 'task'
      const label = ACTIVITY_DISPLAY_NAMES[type] || 'فعالیت'
      return `ویرایش ${label}`
    })
    /** user may edit if they’re owner or creator */
    const canEdit = computed(() => {
      const me = auth.user?.id
      return props.task?._ownerid_value === me || props.task?._createdby_value === me
    })
    function hideModal() {
      modelVisible.value = false
    }
    const shareLink = computed(() =>
      props.task?.activityid
        ? `${window.location.origin}/dashboard?activityId=${props.task.activityid}`
        : '',
    )
    // dropdown options provided by backend (Persian)
    const stateOptionsRef = computed(() => props.task?.stateOptions || [])
    const statusMapRef = computed(() => props.task?.statusOptions || {})

    const statusOptionsRef = computed(() =>
      (stateOptionsRef.value || []).map((state) => ({
        type: 'group',
        key: state.value,
        label: state.label,
        disabled: true,
        children: (statusMapRef.value[state.value] || []).map((opt) => ({
          label: opt.label,
          value: opt.value,
          key: `${state.value}-${opt.value}`,
        })),
      })),
    )

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
      statuscode: null,
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
    const formErrors = ref([])
    async function onNewFile(e) {
      const f = e.target.files?.[0]
      if (!f) return

      try {
        newNote.base64 = await fileToBase64(f)
        newNote.file = f
      } catch (err) {
        alert(err.message)
        newNote.file = null
        newNote.base64 = ''
      } finally {
        // reset input so same file can be re‑selected if needed
        e.target.value = ''
      }
    }

    // Regarding helpers
    const regardingTypeOptions = getRegardingTypeOptions()
    const regardingTypeRef = computed(() => form.value.regardingType)
    const { regardingOptions, searching, searchRegarding } = useRegardingSearch(regardingTypeRef)

    function onRegardingSelect(value) {
      form.value.regardingObjectId = value
      const opt = regardingOptions.value.find((o) => o.value === value)
      form.value.regardingObjectLabel = opt ? opt.label : ''
    }

    // Owner helpers
    const { ownerOptions, searchingOwner, searchOwner } = useOwnerSearch()
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

    const priorityOptions = PRIORITY_OPTIONS
    const seenOptions = SEEN_OPTIONS
    const stateOptions = STATE_OPTIONS

    function resetDates() {
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

    function seedRegardingOptions() {
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
    }

    function seedOwnerOptions() {
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
    }

    const resetForm = () => {
      if (!props.task) return
      Object.assign(form.value, {
        subject: props.task.subject || '',
        description: props.task.description || '',
        regardingType: props.task.regardingtype || '',
        regardingObjectId: props.task.regardingobjectid || '',
        regardingObjectLabel: props.task.regardingname || props.task.regardingObjectLabel || '',
        ownerId: props.task._ownerid_value || '',
        ownerLabel: props.task.owner?.name || '',
        priority: typeof props.task.prioritycode === 'number' ? props.task.prioritycode : 1,
        statuscode: typeof props.task.statuscode === 'number' ? props.task.statuscode : null,
        stateCode: typeof props.task.statecode === 'number' ? props.task.statecode : 1,
        newSeen: typeof props.task.new_seen !== 'undefined' ? !!props.task.new_seen : false,
        lastOwnerLabel: props.task.lastownername || '(N/A)',
      })

      resetDates()
      seedRegardingOptions()
      seedOwnerOptions()
    }
    loadNotes()

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

    // Removed obsolete watchEffect and currentState watcher.
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

    // keep stateCode in sync with the selected status
    watch(
      () => form.value.statuscode,
      (newStatus) => {
        if (newStatus == null) return
        // find the parent state that owns this status
        for (const [stateKey, arr] of Object.entries(statusMapRef.value)) {
          if (arr.some((opt) => opt.value === newStatus)) {
            form.value.stateCode = Number(stateKey)
            return
          }
        }
      },
    )
    watch(
      () => [form.value.subject, form.value.startRaw, form.value.endRaw],
      () => {
        formErrors.value = validateTask(form.value)
      },
      { immediate: true },
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
          statuscode: String(form.value.statuscode),

          // Required by backend to resolve the correct entity‑set
          activitytypecode: props.task.activitytypecode || 'task',
        }

        if (form.value.regardingObjectId) {
          updatedTask.regardingobjectid = form.value.regardingObjectId
          updatedTask.regardingtype = form.value.regardingType
        }

        if (form.value.ownerId) {
          updatedTask.ownerid = form.value.ownerId
        }

        //console.log('form start task:', form.value.startRaw, 'form end Task:', form.value.endRaw)
        const { ok, data } = await updateActivity(props.task.activityid, updatedTask)
        if (!ok) throw new Error('HTTP error while updating task')
        if (ok) {
          message.success('فعالیت با موفقیت ویرایش شد.')
          const response = { data }
          emit('update', {
            ...response.data,
            start: response.data.scheduledstart,
            end: response.data.scheduledend,
          })
          hideModal()
        }
      } catch (error) {
        console.error('Failed to update task:', error)
        alert('Failed to update task. Please try again.')
      }
    }

    async function addNote() {
      if (!newNote.text.trim() && !newNote.base64) return
      const payload = {
        subject: newNote.subject || 'بدون موضوع',
        notetext: newNote.text || 'بدون توضیحات',
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
      statusOptionsRef,
      stateOptions,
      notes,
      newNote,
      onNewFile,
      addNote,
      loadNotes,
      NoteList,
      canEdit,
      shareLink,
      modalTitle,
      formErrors,
    }
  },
}
</script>
