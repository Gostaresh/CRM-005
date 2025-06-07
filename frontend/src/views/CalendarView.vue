<template>
  <n-message-provider>
    <div class="container py-4 full-width" dir="rtl">
      <div
        class="header-bar d-flex flex-wrap align-items-center mb-3 gap-3 justify-content-between"
      >
        <!-- keep title on the RTL‑right -->
        <h2 class="m-0 flex-shrink-0">تقویم</h2>
        <n-button text size="large" class="d-md-none fs-3" @click="router.push('/')"> ← </n-button>
        <n-button text size="large" class="d-md-none fs-3" @click="showMobileMenu = true"
          >☰</n-button
        >
        <div class="d-none d-md-flex flex-wrap gap-2 header-actions">
          <n-select
            v-model:value="selectedPreset"
            :options="presetOptions"
            size="medium"
            style="width: 220px"
            @update:value="presetChange"
          />
          <!-- categories dropdown -->
          <n-dropdown
            trigger="hover"
            placement="bottom-start"
            size="large"
            :options="menuOptions"
            @select="handleMenuSelect"
          >
            <n-button secondary type="default" class="px-3">📂 منو</n-button>
          </n-dropdown>
          <n-button secondary type="primary" @click="showFilter = true">🔍 فیلتر</n-button>
          <n-button secondary @click="refreshCalendar" title="بارگیری دوباره"
            >🔄 بروزرسانی</n-button
          >
          <n-button type="primary" @click="isCreateVisible = true">➕ ایجاد فعالیت جدید</n-button>
        </div>
        <!-- push user / help / logout to RTL‑left -->
        <div class="d-none d-md-flex align-items-center gap-3">
          <small v-if="auth.user" class="text-muted">
            {{ auth.user.fullname || auth.user.username }}
          </small>
          <n-tooltip>
            <template #trigger>
              <n-button text @click="showShortcuts = true">❓</n-button>
            </template>
            کلیدهای میان‌بر
          </n-tooltip>
          <n-button type="info" ghost @click="router.push('/')"> بازگشت </n-button>
          <n-button type="error" ghost @click="logout">خروج</n-button>
        </div>

        <!-- 📱 Mobile off-canvas menu -->
        <n-drawer v-model:show="showMobileMenu" placement="right" :width="280">
          <n-drawer-content title="منو" closable>
            <div class="d-flex flex-column gap-2">
              <n-select
                v-model:value="selectedPreset"
                :options="presetOptions"
                size="medium"
                style="width: 100%"
                @update:value="presetChange"
              />

              <!-- Category tree -->
              <n-dropdown
                trigger="click"
                placement="bottom-start"
                size="large"
                :options="menuOptions"
                @select="handleMenuSelect"
              >
                <n-button secondary type="default" class="w-100">📂 منو</n-button>
              </n-dropdown>

              <n-button
                secondary
                type="primary"
                class="w-100"
                @click="
                  () => {
                    showFilter = true
                    showMobileMenu = false
                  }
                "
              >
                🔍 فیلتر
              </n-button>

              <n-button secondary class="w-100" @click="refreshCalendar"> 🔄 بروزرسانی </n-button>

              <n-button
                type="primary"
                class="w-100"
                @click="
                  () => {
                    isCreateVisible = true
                    showMobileMenu = false
                  }
                "
              >
                ➕ ایجاد فعالیت جدید
              </n-button>

              <n-divider />

              <small v-if="auth.user" class="text-muted d-block">
                {{ auth.user.fullname || auth.user.username }}
              </small>

              <n-button
                text
                class="w-100"
                @click="
                  () => {
                    showShortcuts = true
                    showMobileMenu = false
                  }
                "
              >
                ❓ کلیدهای میان‌بر
              </n-button>

              <n-button text type="error" class="w-100" @click="logout"> 🚪 خروج </n-button>
            </div>
          </n-drawer-content>
        </n-drawer>

        <!-- shortcuts modal stays unchanged -->
        <n-modal v-model:show="showShortcuts" preset="dialog" dir="rtl">
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

      <div class="mb-3 d-flex justify-content-between align-items-center gap-2"></div>

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
          <div class="d-flex justify-content-end mb-2 gap-2">
            <n-input
              v-model:value="searchTerm"
              placeholder="جستجو..."
              clearable
              style="max-width: 240px"
              @keydown.enter.native="fetchTableData"
            />
            <button class="btn btn-outline-secondary" @click="viewMode = VIEW.CAL">
              📅 بازگشت به تقویم
            </button>
          </div>

          <div class="table-responsive">
            <n-data-table
              :columns="tableColumns"
              :data="activities"
              :row-props="
                (row) => ({ style: 'cursor:pointer', onClick: () => loadTaskById(row.id) })
              "
              striped
              :pagination="false"
              size="small"
            />
          </div>
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
/** when the route contains ?activityId=<GUID> it is forwarded here */
const props = defineProps({
  activityId: {
    type: String,
    default: null,
  },
})
/* ---------------------------------------------------------------------------
 * imports
 * -------------------------------------------------------------------------*/
import { ref, watch, nextTick, h, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import {
  NMessageProvider,
  NSelect,
  NSpin,
  NDataTable,
  NModal,
  NInput,
  NDrawer,
  NDrawerContent,
  NDivider,
} from 'naive-ui'

import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import EditTaskModal from '@/components/EditTaskModal.vue'
import CreateTaskModal from '@/components/CreateTaskModal.vue'
import TaskFilterForm from '@/components/TaskFilterForm.vue'
import { ActivityPresets } from '@/constants/activityFilters'
import { HOLIDAY_SOURCE } from '@/constants/iranHolidays'
import { VIEW, TABLE_COLUMNS } from '@/constants/ui'
import { SEEN_EVENT_BG, DEFAULT_EVENT_BG } from '@/constants/colors'
import { clampToGrid, toJalali } from '@/utils/dateHelpers'
import { replaceTokens } from '@/utils/odataTokens'
import { createMiniOptions, createCalendarOptions } from '@/composables/useCalendarOptions'
import { updateTaskDates, crmFetch } from '@/api/crm'
import { useShortcuts } from '@/composables/useShortcuts'

/* ---------------------------------------------------------------------------
 * constants / state
 * -------------------------------------------------------------------------*/

const router = useRouter()
const auth = useAuthStore()
/* ── dynamic menu ─────────────────────────────────────────────── */
const menuStore = useMenuStore()
onMounted(() => {
  // 1) populate dynamic menu (once)
  if (!menuStore.tree.length) menuStore.load()

  // 2) apply default preset so calendar / table respect initial filter
  presetChange(selectedPreset.value)

  // 3) deep‑link: open EditTask modal if URL contains ?activityId=...
  if (props.activityId) loadTaskById(props.activityId)
})
function treeToOptions(nodes) {
  return nodes.map((n) => ({
    label: n.title,
    key: `node-${n.id}`, //  <- ALWAYS the same for the same record
    link: n.link || '', // NEW → keep original URL
    children: n.children?.length ? treeToOptions(n.children) : undefined,
  }))
}

const menuOptions = computed(() => treeToOptions(menuStore.tree))

function handleMenuSelect(key, option) {
  // Only leaf nodes have no children and have a link
  if (!option.children && option.link) {
    window.open(option.link, '_blank')
  }
}

const isEditModalVisible = ref(false)
const selectedTask = ref(null)

const isCreateVisible = ref(false)
const createStartIso = ref(null)
const createEndIso = ref(null)

const calendarRef = ref(null)
const miniRef = ref(null)

const selectedPreset = ref(ActivityPresets[0].key)
const presetOptions = ActivityPresets.map((p) => ({
  label: p.label,
  value: p.key,
  disabled: !!p.disabled,
}))
const isLoading = ref(false)
const odataFilter = ref('') // holds $filter string from TaskFilterForm
const searchTerm = ref('')
const showShortcuts = ref(false)
const showFilter = ref(false)
const showMobileMenu = ref(false)

// view toggle: calendar <-> table
const viewMode = ref(VIEW.CAL)

// activity rows for the table
const activities = ref([])
// clone the base columns and inject the subject renderer
const tableColumns = TABLE_COLUMNS.map((c) => ({ ...c }))
tableColumns[0].render = (row) =>
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
  )

/* ---------------------------------------------------------------------------
 * helpers
 * -------------------------------------------------------------------------*/

const miniOptions = createMiniOptions(calendarRef)

const calendarOptions = createCalendarOptions({
  calendarRef,
  odataFilter,
  auth,
  activities,
  viewMode,
  HOLIDAY_SOURCE,
  SEEN_EVENT_BG,
  DEFAULT_EVENT_BG,
  clampToGrid,
  toJalali,
  saveEventTimes,
  loadTaskById,
})
// attach delegations that depend on dashboard-local refs
calendarOptions.select = handleCalendarSelect
calendarOptions.loading = (busy) => {
  isLoading.value = busy
}

const refreshCalendar = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  const crmSource = api.getEventSources().find((s) => s.id === 'crm-events')
  crmSource?.refetch()
}

// Register shortcuts after all referenced variables are defined
useShortcuts({
  n: () => (isCreateVisible.value = true),
  r: refreshCalendar,
  t: () => (viewMode.value = viewMode.value === VIEW.CAL ? VIEW.TABLE : VIEW.CAL),
  f: () => (showFilter.value = true),
  'shift+arrowright': () => calendarRef.value?.getApi().next(),
  'shift+arrowleft': () => calendarRef.value?.getApi().prev(),
  '.': () => calendarRef.value?.getApi().today(),
})

function presetChange(key) {
  const p = ActivityPresets.find((x) => x.key === key)
  if (!p) return

  // replace placeholder tokens with ISO strings / user id
  let filter = replaceTokens(p.filter, auth.user?.id ?? '')

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
      // only refetch the CRM event source; keep holiday source intact
      const crmSource = api.getEventSources().find((s) => s.id === 'crm-events')
      crmSource?.refetch()
    }

    // If we are in table mode, reload the rows immediately
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
    await updateTaskDates(event.id, {
      activitytypecode: event.extendedProps.activitytypecode,
      scheduledstart: event.start.toISOString(),
      scheduledend: event.end ? event.end.toISOString() : event.start.toISOString(),
    })
  } catch (err) {
    console.error('❌ Failed to update event time:', err)
    throw err // lets FullCalendar revert
  }
}

/* ---------------------------------------------------------------------------
 * emitted callbacks from modals
 * -------------------------------------------------------------------------*/
function onTaskCreated() {
  // Refresh calendar events
  calendarRef.value?.getApi().refetchEvents()

  // If the table view is active, refresh it too
  if (viewMode.value === VIEW.TABLE) fetchTableData()
}

function onTaskUpdated() {
  // Refresh calendar events
  calendarRef.value?.getApi().refetchEvents()

  // If the table view is active, refresh it too
  if (viewMode.value === VIEW.TABLE) fetchTableData()
}
async function loadTaskById(id) {
  try {
    const { ok, data } = await crmFetch(`/api/crm/activities/${id}`)
    selectedTask.value = ok ? data : { activityid: id }
  } catch (err) {
    console.error('❌ loadTaskById fallback:', err)
    selectedTask.value = { activityid: id }
  }
  isEditModalVisible.value = true
}
async function fetchTableData() {
  try {
    isLoading.value = true
    // Always scope to activities owned by the current user
    let filter = `_ownerid_value eq '${auth.user?.id}'`

    // Merge any extra predicates coming from the side panel
    if (odataFilter.value) filter += ` and (${odataFilter.value})`

    // Optional keyword search on subject
    if (searchTerm.value) {
      // Escape single quotes for OData
      const term = searchTerm.value.replace(/'/g, "''")
      filter += ` and contains(subject,'${term}')`
    }

    const q = `?$filter=${encodeURIComponent(filter)}`
    const { ok, data } = await crmFetch(`/api/crm/activities/my${q}`)
    const list = ok ? (Array.isArray(data.value) ? data.value : data) : []

    activities.value = list.map((t) => ({
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
watch(searchTerm, () => {
  if (viewMode.value === VIEW.TABLE) fetchTableData()
})
</script>

<style scoped>
.header-bar {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}
.header-actions > * {
  flex-shrink: 0; /* prevent items from squashing */
}
/* prevent drawer buttons from shrinking */
:deep(.n-drawer-content .n-button) {
  flex-shrink: 0;
}
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

:deep(.n-data-table) {
  width: 100%;
}

:deep(.n-data-table .n-data-table-tr:hover) {
  background: #f5f5f5;
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
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px white;
}
:deep(.mini-today) {
  background-color: #e6f4ff !important;
  border-radius: 4px;
  font-weight: bold;
}
.mini-selected:hover {
  background-color: #0b5ed7 !important;
}
.mini-card-header {
  font-weight: 600;
  background: #f7f7f7;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #ddd;
}
/* ── make the data‑table scroll horizontally on narrow screens ── */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* smooth momentum scrolling on iOS */
}
.table-responsive :deep(table) {
  min-width: 620px; /* keep columns wide enough to avoid letter‑wrap */
}

@media (max-width: 768px) {
  .mini-calendar-wrapper {
    display: none;
  }
}
/* ── FullCalendar toolbar: stack rows & shrink buttons on phones ── */
@media (max-width: 576px) {
  /* allow flex rows to wrap */
  :deep(.fc-header-toolbar) {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  /* each chunk (nav, title, views) gets its own line */
  :deep(.fc-header-toolbar .fc-toolbar-chunk) {
    flex: 0 0 100%;
    display: flex;
    justify-content: center;
  }

  /* title centred with smaller font */
  :deep(.fc-header-toolbar .fc-toolbar-title) {
    font-size: 0.9rem;
  }

  /* compact the buttons */
  :deep(.fc-header-toolbar button) {
    padding: 0.25rem 0.4rem;
    font-size: 0.75rem;
  }
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .table-toolbar :deep(.n-input) {
    width: 100%;
  }
  .table-toolbar button {
    width: 100%;
  }
}
</style>
