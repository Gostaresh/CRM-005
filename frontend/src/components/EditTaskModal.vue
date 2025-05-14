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
          <div class="modal-header">
            <h5 class="modal-title" id="editTaskModalLabel">Edit Task</h5>
            <button type="button" class="btn-close" @click="hideModal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
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
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="hideModal">Close</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { ref, watch, onMounted } from 'vue'
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle'
import moment from 'moment-jalaali'
import momentTz from 'moment-timezone'
import DatePicker from 'vue3-persian-datetime-picker'
moment.tz = momentTz.tz
moment.loadPersian({ usePersianDigits: false })

const baseUrl = import.meta.env.VITE_API_BASE_URL

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
    })

    const formatDatetimeLocal = (dateStr) => {
      if (!dateStr) return ''
      // Parse as UTC, then convert to local time, then format as Jalali with time
      return moment(dateStr).utc().local().format('jYYYY/jMM/jDD HH:mm')
    }

    const resetForm = () => {
      if (props.task) {
        form.value.subject = props.task.subject || ''
        form.value.description = props.task.description || ''
        form.value.startDisplay = props.task.scheduledstart
          ? formatDatetimeLocal(props.task.scheduledstart)
          : ''
        form.value.endDisplay = props.task.scheduledend
          ? formatDatetimeLocal(props.task.scheduledend)
          : ''
        form.value.startRaw = props.task.scheduledstart || ''
        form.value.endRaw = props.task.scheduledend || ''
      }
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
        }
        console.log('form start task:', form.value.startRaw, 'form end Task:', form.value.endRaw)
        const response = await axios.patch(
          `${baseUrl}/api/crm/activities/${props.task.activityid}`,
          updatedTask,
          { withCredentials: true },
        )
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
    }
  },
}
</script>
