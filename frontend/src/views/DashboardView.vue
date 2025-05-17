<template>
  <n-message-provider>
    <div class="container py-4" dir="rtl">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">داشبورد</h2>
        <button class="btn btn-outline-danger" @click="logout">خروج</button>
      </div>

      <div class="mb-3 text-end">
        <button class="btn btn-primary" @click="isCreateVisible = true">ایجاد فعالیت جدید</button>
      </div>

      <FullCalendar :options="calendarOptions" ref="calendarRef" />

      <EditTaskModal
        v-if="selectedTask"
        :task="selectedTask"
        v-model:visible="isEditModalVisible"
        @update="onTaskUpdated"
      />
      <CreateTaskModal v-model:visible="isCreateVisible" @created="onTaskCreated" />
    </div>
  </n-message-provider>
</template>

<script setup>
import { NMessageProvider } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid/index.js'
import timeGridPlugin from '@fullcalendar/timegrid/index.js'
import interactionPlugin from '@fullcalendar/interaction/index.js'
import EditTaskModal from '@/components/EditTaskModal.vue'
import CreateTaskModal from '@/components/CreateTaskModal.vue'

const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''

const auth = useAuthStore()
const router = useRouter()

const logout = async () => {
  await auth.logout()
  router.push('/login')
}

const isEditModalVisible = ref(false)
const selectedTask = ref(null)
const calendarRef = ref(null)
const isCreateVisible = ref(false)

const onTaskUpdated = (updatedTask) => {
  selectedTask.value = null
  isEditModalVisible.value = false
  calendarRef.value?.getApi().refetchEvents()
  alert('فعالیت با موفقیت به‌روزرسانی شد.')
}

const onTaskCreated = () => {
  calendarRef.value?.getApi().refetchEvents()
}

/**
 * Persist start/end updates that come from eventDrag / eventResize.
 * When the request fails, caller should handle reverting the change.
 */
const saveEventTimes = async (event) => {
  try {
    const res = await fetch(`${baseUrl}/api/crm/activities/${event.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledstart: event.start.toISOString(),
        scheduledend: event.end ? event.end.toISOString() : event.start.toISOString(),
      }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch (err) {
    console.error('❌ Failed to update event time:', err)
    throw err
  }
}

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: 'fa',
  firstDay: 6, // Saturday
  timeZone: 'local',
  editable: true, // allow drag & resize
  eventStartEditable: true,
  eventDurationEditable: true,
  direction: 'rtl',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  events: async function (fetchInfo, successCallback, failureCallback) {
    try {
      const res = await fetch(`${baseUrl}/api/crm/activities/my`, {
        credentials: 'include',
      })
      const data = await res.json()
      const events = data.value.map((task) => ({
        id: task.activityid,
        title: task.subject,
        start: task.scheduledstart,
        end: task.scheduledend,
        extendedProps: task,
        // make absolutely sure each event itself is draggable and resizable
        editable: true,
        startEditable: true,
        durationEditable: true,
      }))
      successCallback(events)
    } catch (error) {
      console.error('❌ Failed to fetch events:', error)
      failureCallback(error)
    }
  },
  eventClick: async function (info) {
    const id = info.event.id
    try {
      const res = await fetch(`${baseUrl}/api/crm/activities/${id}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const task = await res.json()

      selectedTask.value = task // pass full record to the modal
      isEditModalVisible.value = true
    } catch (err) {
      console.error('❌ Failed to fetch activity details:', err)
      // fallback: open modal with slim props
      selectedTask.value = {
        activityid: id,
        subject: info.event.title,
        description: info.event.extendedProps.description || '',
        scheduledstart: info.event.start.toISOString(),
        scheduledend: info.event.end
          ? info.event.end.toISOString()
          : info.event.start.toISOString(),
      }
      isEditModalVisible.value = true
    }
  },
  eventDrop: async function (info) {
    console.log('🟡 eventDrop fired', info.event)
    try {
      await saveEventTimes(info.event)
      // Optionally show a toast/alert here
    } catch (e) {
      info.revert()
    }
  },
  eventResize: async function (info) {
    try {
      await saveEventTimes(info.event)
    } catch (e) {
      info.revert()
    }
  },
})
</script>
