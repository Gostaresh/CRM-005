<template>
  <n-message-provider>
    <div class="container py-4 full-width" dir="rtl">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="text-center flex-grow-1">
          <h2 class="mb-0">داشبورد</h2>
          <small v-if="auth.user" class="text-muted">
            {{ auth.user.fullname || auth.user.username }}
          </small>
          <n-button text @click="showShortcuts = true">❔</n-button>
          <n-modal v-model:show="showShortcuts" preset="dialog">
            <template #header>کلیدهای میان‌بر</template>
            <ul class="list-unstyled m-0">
              <li><kbd>N</kbd> ایجاد فعالیت جدید</li>
              <li><kbd>R</kbd> بازآوری تقویم</li>
              <li><kbd>T</kbd> تقویم ⇄ جدول</li>
              <li><kbd>F</kbd> فیلتر</li>
              <li><kbd>Shift + →/←</kbd> دوره بعد / قبل</li>
              <li><kbd>.</kbd> امروز</li>
            </ul>
          </n-modal>
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

      <div class="calendar-area">
        <!-- Calendar + mini when view is CAL -->
        <template v-if="viewMode === VIEW.CAL">
          <div class="mini-calendar-wrapper">
            <div class="mini-card">
              <div class="mini-card-header">مینی‌تقویم</div>
              <div class="mini-card-body">
                <FullCalendar :options="miniOptions" ref="miniRef" />
              </div>
            </div>
          </div>

          <n-spin :show="isLoading">
            <FullCalendar :options="calendarOptions" ref="calendarRef" />
          </n-spin>
        </template>

        <!-- Full‑width data‑table when view is TABLE -->
        <template v-else>
          <!-- toolbar row -->
          <div class="d-flex justify-content-end mb-2">
            <button class="btn btn-outline-secondary" @click="viewMode = VIEW.CAL">
              📅 بازگشت به تقویم
            </button>
          </div>

          <n-data-table
            :columns="tableColumns"
            :data="activities"
            :row-props="(row) => ({ style: 'cursor:pointer', onClick: () => loadTaskById(row.id) })"
            striped
            :pagination="false"
            size="small"
          />
        </template>
      </div>

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
import { ref, watch, nextTick, h, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { NMessageProvider, NSelect, NSpin, NDataTable } from 'naive-ui'
import { NDrawer, NDrawerContent } from 'naive-ui'
const showFilter = ref(false)

import { useAuthStore } from '@/stores/auth'
import EditTaskModal from '@/components/EditTaskModal.vue'
import CreateTaskModal from '@/components/CreateTaskModal.vue'
import TaskFilterForm from '@/components/TaskFilterForm.vue'
import { ref as vueRef } from 'vue'
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
const miniRef = ref(null)

const selectedPreset = ref('ALL')
const presetOptions = ActivityPresets.map((p) => ({
  label: p.label,
  value: p.key,
  disabled: !!p.disabled,
}))
const isLoading = ref(false)
const odataFilter = vueRef('') // holds $filter string from TaskFilterForm

// view toggle: calendar <-> table
const VIEW = { CAL: 'calendar', TABLE: 'table' }
const viewMode = ref(VIEW.CAL)

// activity rows for the table
const activities = ref([])
const tableColumns = [
  {
    title: 'موضوع',
    key: 'subject',
    render: (row) =>
      h(
        'a',
        {
          href: '#',
          onClick: (e) => {
            e.preventDefault()
            loadTaskById(row.id)
          },
        },
        row.subject,
      ),
  },
  { title: 'شروع', key: 'startJ' },
  { title: 'پایان برنامه', key: 'endJ' },
  { title: 'پایان واقعی', key: 'actualEndJ' },
  { title: 'نوع', key: 'typeLabel' },
  { title: 'دیده شده؟', key: 'seenLabel' },
  { title: 'وضعیت', key: 'stateLabel' },
  { title: 'مالک', key: 'owner' },
]

/* ---------------------------------------------------------------------------
 * helpers
 * -------------------------------------------------------------------------*/

onMounted(() => {
  window.addEventListener('keydown', handleKeys)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeys)
})

function handleKeys(e) {
  // ignore when focus is in an input / textarea / select
  const tag = e.target && e.target.tagName
  if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

  const ctrl = e.ctrlKey || e.metaKey // Cmd on Mac
  const shift = e.shiftKey

  switch (true) {
    case !ctrl && !shift && e.key === 'n': // N
      isCreateVisible.value = true
      e.preventDefault()
      break

    case !ctrl && !shift && e.key === 'r': // R
      refreshCalendar()
      e.preventDefault()
      break

    case !ctrl && !shift && e.key === 't': // T
      viewMode.value = viewMode.value === VIEW.CAL ? VIEW.TABLE : VIEW.CAL
      e.preventDefault()
      break

    case !ctrl && !shift && e.key === 'f': // F
      showFilter.value = true
      e.preventDefault()
      break

    case !ctrl && shift && e.key === 'ArrowRight': // Shift + →
      calendarRef.value?.getApi().next()
      e.preventDefault()
      break

    case !ctrl && shift && e.key === 'ArrowLeft': // Shift + ←
      calendarRef.value?.getApi().prev()
      e.preventDefault()
      break

    case !ctrl && !shift && e.key === '.': // .
      calendarRef.value?.getApi().today()
      e.preventDefault()
      break
  }
}

const miniOptions = {
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,today,next',
    center: 'title',
    right: '',
  },
  height: 'auto',
  selectable: false,
  showNonCurrentDates: false,
  fixedWeekCount: false, // true gives exactly 6 rows
  dayHeaderContent: ({ text }) => {
    const map = {
      شنبه: 'ش',
      یکشنبه: 'ی',
      دوشنبه: 'د',
      سه‌شنبه: 'س',
      چهارشنبه: 'چ',
      پنجشنبه: 'پ',
      جمعه: 'ج',
    }
    return map[text] ?? text
  },
  dateClick: ({ date }) => {
    // Jump the main calendar to the clicked day
    calendarRef.value?.getApi().gotoDate(date)
  },
  dayMaxEvents: false,
  navLinks: false,
  dayHeaders: true,
  locale: 'fa',
  firstDay: 6,
  direction: 'rtl',
  events: [], // no events in the mini
  dateClick({ date, dayEl }) {
    // clear previous
    document
      .querySelectorAll('.mini-selected')
      .forEach((el) => el.classList.remove('mini-selected'))
    dayEl.classList.add('mini-selected')

    calendarRef.value?.getApi().gotoDate(date)
  },
}

const refreshCalendar = () => {
  calendarRef.value?.getApi().refetchEvents()
}

function presetChange(key) {
  const p = ActivityPresets.find((x) => x.key === key)
  if (!p) return

  /* -------- ISO helpers – no external libs ---------------------------------*/
  function isoStartOfDay(offsetDays = 0) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  function isoMonthStart(offsetMonths = 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + offsetMonths, 1) // 1 → first day
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  const repl = {
    '{TODAY}': isoStartOfDay(0),
    '{TOMORROW}': isoStartOfDay(1),
    '{TODAY+7}': isoStartOfDay(7),
    '{MONTH_START}': isoMonthStart(0),
    '{NEXT_MONTH_START}': isoMonthStart(1),
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

    // calendar is hidden → refresh table data directly
    if (viewMode.value === VIEW.TABLE) {
      fetchTableData()
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
/** Format ISO into “YYYY/MM/DD HH:mm” using the Persian calendar.
 *  Works in modern browsers with Intl DateTimeFormat. */
function toJalali(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

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
  height: '100%',
  slotMinTime: '07:00:00' /* show from 07:00 */,
  slotMaxTime: '22:00:00' /* …until 22:00 */,
  scrollTime: '07:00:00' /* auto‑scroll to 07:00 */,
  slotDuration: '00:30:00',
  snapDuration: '00:30:00',
  slotLabelInterval: '00:30:00',

  customButtons: {
    showCalendar: {
      text: '📅',
      click() {
        viewMode.value = VIEW.CAL
      },
    },
    showTable: {
      text: '📋',
      click() {
        viewMode.value = VIEW.TABLE
      },
    },
  },

  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'showCalendar,showTable listMonth,dayGridMonth,timeGridWeek,timeGridDay',
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
      /* keep a lightweight copy for the data table */
      activities.value = value.map((t) => {
        return {
          id: t.activityid,
          key: t.activityid,
          subject: t.subject,
          startJ: toJalali(t.scheduledstart),
          endJ: toJalali(t.scheduledend),
          actualEndJ: toJalali(t.actualend),
          typeLabel: t['activitytypecode@OData.Community.Display.V1.FormattedValue'] || '',
          seenLabel: t['new_seen@OData.Community.Display.V1.FormattedValue'] || '',
          stateLabel: t['statecode@OData.Community.Display.V1.FormattedValue'] || '',
          owner: t.owner?.name ?? '',
        }
      })
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

    /* priority dot */
    const prio = event.extendedProps.prioritycode
    const dot = document.createElement('span')
    dot.className = 'prio-dot'
    if (prio === 2) dot.classList.add('prio-high')
    else if (prio === 1) dot.classList.add('prio-mid')
    else dot.classList.add('prio-low')
    container.appendChild(dot)

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

  eventClick: async ({ event }) => loadTaskById(event.id),

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
async function loadTaskById(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/crm/activities/${id}`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    selectedTask.value = await res.json()
  } catch (err) {
    console.error('❌ loadTaskById fallback:', err)
    selectedTask.value = { activityid: id }
  }
  isEditModalVisible.value = true
}
async function fetchTableData() {
  try {
    isLoading.value = true
    const q = odataFilter.value ? `?$filter=${encodeURIComponent(odataFilter.value)}` : ''
    const res = await fetch(`${BASE_URL}/api/crm/activities/my${q}`, {
      credentials: 'include',
    })
    const { value } = await res.json()

    activities.value = value.map((t) => ({
      id: t.activityid,
      key: t.activityid,
      subject: t.subject,
      startJ: toJalali(t.scheduledstart),
      endJ: toJalali(t.scheduledend),
      actualEndJ: toJalali(t.actualend),
      typeLabel: t['activitytypecode@OData.Community.Display.V1.FormattedValue'] || '',
      seenLabel: t['new_seen@OData.Community.Display.V1.FormattedValue'] || '',
      stateLabel: t['statecode@OData.Community.Display.V1.FormattedValue'] || '',
      owner: t.owner?.name ?? '',
    }))
  } catch (err) {
    console.error('❌ fetchTableData:', err)
  } finally {
    isLoading.value = false
  }
}

watch(viewMode, (m) => {
  if (m === VIEW.TABLE) fetchTableData()
})
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

/* 1️⃣  day-grid & list view */
:deep(.fc-daygrid-event),
:deep(.fc-list-event) {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 2️⃣  time-grid (hourly columns) */
:deep(.fc-timegrid-event) {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 3️⃣  make the inner title inherit the rule (optional but tidy) */
:deep(.fc-event-title) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-calendar-wrapper {
  width: 300px;
  float: right; /* or use flexbox/grid */
  margin-left: 1rem;
}
.mini-calendar-wrapper :deep(.fc) {
  height: auto; /* let it shrink */
}

.mini-selected {
  background-color: #0d6efd !important;
  color: #fff !important;
  border-radius: 4px;
}

:deep(.n-data-table) {
  width: 100%;
}

:deep(.n-data-table .n-data-table-tr:hover) {
  background: #f5f5f5;
}

/* tiny coloured priority dot */
:deep(.prio-dot) {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-inline-end: 0.25rem;
}
:deep(.prio-high) {
  background: #dc3545;
} /* red */
:deep(.prio-mid) {
  background: #ffc107;
} /* yellow */
:deep(.prio-low) {
  background: #28a745;
} /* green */
</style>
