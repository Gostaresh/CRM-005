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

            <div class="mb-3">
              <label for="task-start" class="form-label">Start Date</label>
              <date-picker
                type="datetime"
                v-model="form.startDisplay"
                format="jYYYY/jMM/jDD HH:mm"
                display-format="jYYYY/jMM/jDD HH:mm"
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
                @change="updateEndTime"
                @update:modelValue="updateEndTime"
              />
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getRegardingTypeOptions } from '@/composables/useEntityMap'
import { searchEntity, updateTask } from '@/api/crm'
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle'
import moment from 'moment-jalaali'
import momentTz from 'moment-timezone'
import DatePicker from 'vue3-persian-datetime-picker'
moment.tz = momentTz.tz
moment.loadPersian({ usePersianDigits: false })

export default {
  name: 'EditTaskModal',
  components: { DatePicker },
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
    })

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

    const resetForm = () => {
      if (!props.task) return

      form.value.subject = props.task.subject || ''
      form.value.description = props.task.description || ''

      // Regarding fields
      form.value.regardingType = props.task.regardingtype || ''
      form.value.regardingObjectId = props.task.regardingobjectid || ''
      form.value.regardingObjectLabel =
        props.task.regardingname || props.task.regardingObjectLabel || ''

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
      (newVal) => {
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

      if (props.visible) {
        showModal()
      }
    })

    const saveTask = async () => {
      try {
        const updatedTask = {
          ...props.task,
          subject: form.value.subject,
          description: form.value.description,
          scheduledstart:
            form.value.startRaw && form.value.startRaw.trim() !== ''
              ? form.value.startRaw
              : props.task.scheduledstart,
          scheduledend:
            form.value.endRaw && form.value.endRaw.trim() !== ''
              ? form.value.endRaw
              : props.task.scheduledend,
          regardingtype: form.value.regardingType,
          regardingobjectid: form.value.regardingObjectId,
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
    }
  },
}
</script>
