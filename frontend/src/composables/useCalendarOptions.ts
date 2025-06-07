// src/composables/useCalendarOptions.ts
// ---------------------------------------------------------------------------
// Small composable(s) to keep bulky FullCalendar option objects out of views.
// Currently provides only the mini‑calendar options; the main calendarOptions
// can be migrated later in a similar fashion.
// ---------------------------------------------------------------------------

import { Ref } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import { crmFetch } from '@/api/crm'
import { formatTime } from '@/utils/dateHelpers'

/**
 * Factory for the right‑hand "mini" month calendar.
 * Pass the main calendar ref so the mini can control it.
 */
export function createMiniOptions(calendarRef: Ref<any>) {
  return {
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
    fixedWeekCount: false,
    dayMaxEvents: false,
    dayHeaders: true,
    locale: 'fa',
    firstDay: 6,
    direction: 'rtl',
    events: [], // mini shows no events – purely date navigation
    dayHeaderContent: ({ text }: { text: string }) => {
      const map: Record<string, string> = {
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
    dateClick({ date, dayEl }: any) {
      // highlight selection
      document
        .querySelectorAll('.mini-selected')
        .forEach((el) => el.classList.remove('mini-selected'))
      dayEl.classList.add('mini-selected')

      calendarRef.value?.getApi().gotoDate(date)
    },
    dayCellClassNames: ({ date }: { date: Date }) => {
      const today = new Date()
      return date.toDateString() === today.toDateString() ? ['mini-today'] : []
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Factory for the MAIN dashboard calendar
// ─────────────────────────────────────────────────────────────
interface MainArgs {
  calendarRef: Ref<any>
  odataFilter: Ref<string>
  auth: { user?: { id: string } }
  activities: Ref<any[]>
  viewMode: Ref<string>
  HOLIDAY_SOURCE: any
  SEEN_EVENT_BG: string
  DEFAULT_EVENT_BG: string
  clampToGrid: (d: Date | string | null, s?: boolean) => Date | null
  toJalali: (iso: string | null) => string
  saveEventTimes: (ev: any) => Promise<void>
  loadTaskById: (id: string) => Promise<void>
}

export function createCalendarOptions(args: MainArgs) {
  const {
    calendarRef,
    odataFilter,
    activities,
    viewMode,
    HOLIDAY_SOURCE,
    SEEN_EVENT_BG,
    DEFAULT_EVENT_BG,
    clampToGrid,
    toJalali,
    saveEventTimes,
    loadTaskById,
  } = args

  return {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    navLinks: true,
    dayMaxEvents: true,
    locale: 'fa',
    firstDay: 6,
    timeZone: 'local',
    selectable: true,
    editable: true,
    nowIndicator: true,
    direction: 'rtl',
    height: '85vh',
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    scrollTime: '07:00:00',
    slotDuration: '00:30:00',
    snapDuration: '00:30:00',
    slotLabelInterval: '00:30:00',

    customButtons: {
      showCalendar: { text: '📅', click: () => (viewMode.value = 'calendar') },
      showTable: { text: '📋', click: () => (viewMode.value = 'table') },
    },

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'showCalendar,showTable listMonth,dayGridMonth,timeGridWeek,timeGridDay',
    },

    eventSources: [
      HOLIDAY_SOURCE,
      {
        id: 'crm-events',
        events: async (_info: any, success: any, failure: any) => {
          try {
            const q = odataFilter.value ? `?$filter=${encodeURIComponent(odataFilter.value)}` : ''
            const { ok, data } = await crmFetch(`/api/crm/activities/my${q}`)
            const list = ok ? (Array.isArray((data as any).value) ? (data as any).value : data) : []

            success(
              list.map((t: any) => ({
                id: t.activityid,
                title: t.subject,
                start: clampToGrid(t.scheduledstart, true),
                end: clampToGrid(t.scheduledend ?? t.scheduledstart, false),
                extendedProps: t,
                backgroundColor: t.new_seen ? SEEN_EVENT_BG : t.color || DEFAULT_EVENT_BG,
                borderColor: '#000000',
                editable: true,
              })),
            )

            activities.value = list.map((t: any) => ({
              id: t.activityid,
              key: t.activityid,
              subject: t.subject,
              startJ: toJalali(t.scheduledstart),
              endJ: toJalali(t.scheduledend),
              actualEndJ: toJalali(t.actualend),
              typeLabel: t['activitytypecode@OData.Community.Display.V1.FormattedValue'] ?? '',
              seenLabel: t['new_seen@OData.Community.Display.V1.FormattedValue'] ?? '',
              stateLabel: t['statecode@OData.Community.Display.V1.FormattedValue'] ?? '',
              owner: t.owner?.name ?? '',
            }))
          } catch (err) {
            console.error('❌ fetch activities', err)
            failure(err)
          }
        },
      },
    ],

    eventContent: ({ event }: any) => {
      const container = document.createElement('div')
      container.className = 'd-flex align-items-center gap-1'
      container.style.whiteSpace = 'nowrap'
      const dot = document.createElement('span')
      dot.className =
        'prio-dot ' +
        (event.extendedProps.prioritycode === 2
          ? 'prio-high'
          : event.extendedProps.prioritycode === 1
            ? 'prio-mid'
            : 'prio-low')
      container.appendChild(dot)
      const titleSpan = document.createElement('span')
      titleSpan.className = 'event-title flex-grow-1'
      titleSpan.style.overflow = 'hidden'
      titleSpan.style.textOverflow = 'ellipsis'
      titleSpan.textContent = event.title
      container.appendChild(titleSpan)
      return { domNodes: [container] }
    },

    eventClick: ({ event }: any) => loadTaskById(event.id),

    eventDrop: async ({ event, revert }: any) => {
      try {
        await saveEventTimes(event)
      } catch {
        revert()
      }
    },
    eventResize: async ({ event, revert }: any) => {
      try {
        await saveEventTimes(event)
      } catch {
        revert()
      }
    },
  }
}
