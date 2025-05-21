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

      <!-- Edit existing task -->
      <EditTaskModal
        v-if="selectedTask"
        v-model:visible="isEditModalVisible"
        :task="selectedTask"
        @update="onTaskUpdated"
      />

      <!-- Create new task -->
      <CreateTaskModal
        v-model:visible="isCreateVisible"
        :default-start="createStartIso"
        :default-end="createEndIso"
        @created="onTaskCreated"
      />
    </div>
  </n-message-provider>
</template>

<script setup>
/* ---------------------------------------------------------------------------
 * imports
 * -------------------------------------------------------------------------*/
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { NMessageProvider } from 'naive-ui'

import { useAuthStore } from '@/stores/auth'
import EditTaskModal from '@/components/EditTaskModal.vue'
import CreateTaskModal from '@/components/CreateTaskModal.vue'

/* ---------------------------------------------------------------------------
 * constants / state
 * -------------------------------------------------------------------------*/
const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''

const router = useRouter()
const auth = useAuthStore()

const isEditModalVisible = ref(false)
const selectedTask = ref(null)

const isCreateVisible = ref(false)
const createStartIso = ref(null)
const createEndIso = ref(null)

const calendarRef = ref(null)

var br = document.createElement('br')
/* ---------------------------------------------------------------------------
 * helpers
 * -------------------------------------------------------------------------*/
const logout = async () => {
  await auth.logout()
  router.push('/login')
}

/** Clear pre‑filled dates once the modal closes. */
watch(isCreateVisible, (v) => {
  if (!v) {
    createStartIso.value = null
    createEndIso.value = null
  }
})

/** Called when the user drags across the calendar to pick a slot. */
function handleCalendarSelect(selection) {
  // Persist the ISO strings first
  createStartIso.value = selection.startStr
  createEndIso.value = selection.endStr

  // Wait for the reactive props to propagate,
  // then open the Create‑Task modal
  nextTick(() => {
    isCreateVisible.value = true
  })

  // Clear the blue selection highlight
  selection.view.calendar.unselect()
}

/** Persist start/end when an event is dragged or resized. */
async function saveEventTimes(event) {
  try {
    const res = await fetch(`${BASE_URL}/api/crm/activities/${event.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledstart: event.start.toISOString(),
        scheduledend: event.end ? event.end.toISOString() : event.start.toISOString(),
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    console.error('❌ Failed to update event time:', err)
    throw err // let FullCalendar revert
  }
}

/** Format a Date to “HH:mm” local time */
function formatTime(date) {
  return date
    ? new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : ''
}

/* ---------------------------------------------------------------------------
 * FullCalendar options
 * -------------------------------------------------------------------------*/
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  navLinks: true,
  dayMaxEvents: true,
  locale: 'fa',
  firstDay: 6, // Saturday
  timeZone: 'local',
  selectable: true,
  selectMirror: true,
  editable: true,
  eventStartEditable: true,
  eventDurationEditable: true,
  direction: 'rtl',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },

  /** Fetch events for the logged‑in user. */
  events: async (fetchInfo, success, failure) => {
    try {
      const res = await fetch(`${BASE_URL}/api/crm/activities/my`, {
        credentials: 'include',
      })
      const { value } = await res.json()
      success(
        value.map((t) => ({
          id: t.activityid,
          title: t.subject,
          start: t.scheduledstart,
          end: t.scheduledend,
          extendedProps: t,
          backgroundColor: t.colour ?? undefined,
          borderColor: t.colour ?? undefined,
          editable: true,
          startEditable: true,
          durationEditable: true,
        })),
      )
    } catch (e) {
      console.error('❌ Failed to fetch activities:', e)
      failure(e)
    }
  },

  /** Render “HH:mm – HH:mm ✓ title” (✓ only if seen) */
  eventContent: ({ event }) => {
    const start = formatTime(event.start)
    const end = formatTime(event.end ?? event.start)

    const container = document.createElement('div')
    container.className = 'd-flex align-items-center gap-1'
    // Prevent line‑breaks so time, tick, and title stay on one line
    container.style.flexWrap = 'nowrap'
    container.style.whiteSpace = 'nowrap'

    const timeSpan = document.createElement('span')
    timeSpan.className = 'event-time'
    timeSpan.textContent = `${start} – ${end}`
    container.appendChild(timeSpan)
    container.appendChild(br)

    if (event.extendedProps.new_seen) {
      const tick = document.createElement('span')
      tick.className = 'seen-icon'
      tick.textContent = '✓'
      container.appendChild(tick)
    }

    const titleSpan = document.createElement('span')
    titleSpan.className = 'event-title flex-grow-1'
    // Avoid wrapping for long titles – truncate with ellipsis instead
    titleSpan.style.overflow = 'hidden'
    titleSpan.style.textOverflow = 'ellipsis'
    titleSpan.style.whiteSpace = 'nowrap'
    titleSpan.textContent = event.title
    container.appendChild(titleSpan)

    return { domNodes: [container] }
  },

  select: handleCalendarSelect,

  eventClick: async ({ event }) => {
    const id = event.id
    try {
      const res = await fetch(`${BASE_URL}/api/crm/activities/${id}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      selectedTask.value = await res.json()
    } catch (err) {
      console.error('❌ Failed to load full record, falling back:', err)
      selectedTask.value = {
        activityid: id,
        subject: event.title,
        description: event.extendedProps.description ?? '',
        scheduledstart: event.start.toISOString(),
        scheduledend: event.end ? event.end.toISOString() : event.start.toISOString(),
      }
    }
    isEditModalVisible.value = true
  },

  eventDrop: async ({ event, revert }) => {
    try {
      await saveEventTimes(event)
    } catch {
      revert()
    }
  },

  eventResize: async ({ event, revert }) => {
    try {
      await saveEventTimes(event)
    } catch {
      revert()
    }
  },
}

/* ---------------------------------------------------------------------------
 * emitted callbacks from modals
 * -------------------------------------------------------------------------*/
function onTaskCreated() {
  // refresh calendar events after creating
  calendarRef.value?.getApi().refetchEvents()
}

function onTaskUpdated() {
  // refresh calendar events after editing
  calendarRef.value?.getApi().refetchEvents()
}
</script>

<style scoped>
/* optional: tweak FullCalendar height */
:deep(.fc) {
  min-height: 80vh;
}

.seen-icon {
  color: #28a745;
  font-weight: 600;
  margin-inline-start: 0.25rem;
}

.event-time {
  font-size: 0.75rem;
  opacity: 0.7;
  direction: ltr;
}
</style>
