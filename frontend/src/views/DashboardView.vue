<template>
  <n-message-provider>
    <div class="container py-4" dir="rtl">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="text-center flex-grow-1">
          <h2 class="mb-0">داشبورد</h2>
          <small v-if="auth.user" class="text-muted">
            {{ auth.user.fullname || auth.user.username }}
          </small>
        </div>

        <button class="btn btn-outline-danger" @click="logout">خروج</button>
      </div>

      <div class="mb-3 text-end d-flex justify-content-between mb-1 gap-2">
        <n-select
          v-model:value="selectedPreset"
          :options="presetOptions"
          size="large"
          style="width: 220px"
          @update:value="presetChange"
        />
        <!-- Filter drawer toggle -->
        <button class="btn btn-outline-primary" @click="showFilter = true">🔍 فیلتر</button>

        <!-- Refresh -->
        <button class="btn btn-outline-secondary" @click="refreshCalendar" title="بارگیری دوباره">
          🔄 بروزرسانی
        </button>

        <!-- New activity -->
        <button class="btn btn-primary" @click="isCreateVisible = true">ایجاد فعالیت جدید</button>
      </div>

      <n-spin :show="isLoading">
        <FullCalendar :options="calendarOptions" ref="calendarRef" />
      </n-spin>

      <!-- Side filter panel -->
      <n-drawer v-model:show="showFilter" placement="right" :width="330">
        <n-drawer-content title="فیلتر فعالیت‌ها" closable>
          <TaskFilterForm
            @filter="
              (q) => {
                applyFilter(q)
                showFilter = false
              }
            "
          />
        </n-drawer-content>
      </n-drawer>

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
import listPlugin from '@fullcalendar/list'
import { NMessageProvider, NSelect, NSpin } from 'naive-ui'
import { NDrawer, NDrawerContent } from 'naive-ui'
const showFilter = ref(false)

import { useAuthStore } from '@/stores/auth'
import EditTaskModal from '@/components/EditTaskModal.vue'
import CreateTaskModal from '@/components/CreateTaskModal.vue'
import TaskFilterForm from '@/components/TaskFilterForm.vue'
import { ref as vueRef } from 'vue'
import dayjs from 'dayjs'
import { ActivityPresets } from '@/constants/activityFilters'

/* ---------------------------------------------------------------------------
 * constants / state
 * -------------------------------------------------------------------------*/

// const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
const BASE_URL = ''

const router = useRouter()
const auth = useAuthStore()

const isEditModalVisible = ref(false)
const selectedTask = ref(null)

const isCreateVisible = ref(false)
const createStartIso = ref(null)
const createEndIso = ref(null)

const calendarRef = ref(null)
const selectedPreset = ref('ALL')
const presetOptions = ActivityPresets.map((p) => ({
  label: p.label,
  value: p.key,
  disabled: !!p.disabled,
}))
const isLoading = ref(false)
const odataFilter = vueRef('') // holds $filter string from TaskFilterForm

var br = document.createElement('br')
/* ---------------------------------------------------------------------------
 * helpers
 * -------------------------------------------------------------------------*/
const refreshCalendar = () => {
  calendarRef.value?.getApi().refetchEvents()
}

function presetChange(key) {
  const p = ActivityPresets.find((x) => x.key === key)
  if (!p) return

  // token replacements
  const repl = {
    '{TODAY}': dayjs().startOf('day').toISOString(),
    '{TOMORROW}': dayjs().add(1, 'day').startOf('day').toISOString(),
    '{TODAY+7}': dayjs().add(7, 'day').startOf('day').toISOString(),
    '{USERID}': auth.user?.id ?? '',
  }

  let filter = p.filter
  Object.entries(repl).forEach(([token, val]) => {
    filter = filter.replaceAll(token, val)
  })

  /* -------------------------------------------------------------
   * If the preset itself did NOT specify an owner condition,
   * we assume "activities that I own".
   * ----------------------------------------------------------- */
  if (!filter.includes('_ownerid_value')) {
    const ownerClause = `_ownerid_value eq '${auth.user?.id ?? ''}'`
    filter = filter ? `${ownerClause} and (${filter})` : ownerClause
  }

  applyFilter(filter)
}

function applyFilter(q) {
  odataFilter.value = q || ''
  nextTick(() => {
    const api = calendarRef.value?.getApi()
    if (api) {
      api.removeAllEventSources()
      api.addEventSource(calendarOptions.events)
    }
  })
}

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
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'timeGridWeek',
  navLinks: true,
  dayMaxEvents: true,
  locale: 'fa',
  firstDay: 6, // Saturday
  timeZone: 'local',
  selectable: true,
  selectMirror: true,
  editable: true,
  nowIndicator: true,
  eventStartEditable: true,
  eventDurationEditable: true,
  direction: 'rtl',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'listMonth,dayGridMonth,timeGridWeek,timeGridDay',
  },

  /** Fetch events for the logged‑in user. */
  events: async (fetchInfo, success, failure) => {
    try {
      const query = odataFilter.value ? `?$filter=${encodeURIComponent(odataFilter.value)}` : ''
      const res = await fetch(`${BASE_URL}/api/crm/activities/my${query}`, {
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
          backgroundColor: t.seen ? t.color : '#FFF8A6',
          borderColor: t.seen ? t.color : '#FFF8A6',
          editable: true,
          startEditable: true,
          durationEditable: true,
        })),
      )
      console.log(value[1].color)
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
    // container.appendChild(timeSpan)

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

  // Toggle the global spinner automatically
  loading: (busy) => {
    isLoading.value = busy
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

:deep(.fc-event .event-title) {
  color: #222; /* any hex / RGB / CSS var */
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
