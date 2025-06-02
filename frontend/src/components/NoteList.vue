<template>
  <div class="note-list">
    <table v-if="notes && notes.length" class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th>عنوان</th>
          <th>توضیحات</th>
          <th>فایل</th>
          <th>ایجاد کننده</th>
          <th>تاریخ ایجاد</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in notes" :key="n.annotationid">
          <td class="fw-bold">{{ n.subject || '(بدون عنوان)' }}</td>
          <td style="white-space: pre-line">{{ n.notetext }}</td>
          <td>
            <a
              v-if="n.filename"
              :href="`/api/crm/notes/${n.annotationid}/download`"
              target="_blank"
              class="text-decoration-none"
            >
              📎 {{ n.filename }}
            </a>
          </td>
          <td>{{ n.createdby || '-' }}</td>
          <td>{{ formatDate(n.createdon) }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else class="text-muted small mb-0">یادداشتی وجود ندارد.</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  notes: {
    annotationid: string
    subject: string | null
    notetext: string | null
    filename: string | null
    mimetype: string | null
    createdby?: string | null
    createdon?: string | null
  }[]
}>()

/** Convert ISO date string to readable Persian locale date–time. */
function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fa-IR')
}
</script>
<style scoped>
.note-list {
  max-height: 500px;
  overflow-y: auto;
  direction: rtl;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* smooth momentum scrolling on iOS */
}

.note-list table {
  width: 100%;
  min-width: 620px; /* keep columns wide enough to avoid letter‑wrap */
}
/* Use Naive‑UI theme tokens for header row */
.note-list thead tr {
  background-color: var(--n-success-color-hover);
  color: var(--n-success-color-suppl);
}

table,
td,
th {
  border: 1px solid #ddd;
}

tr:hover {
  background-color: coral;
}
th {
  background-color: #04aa6d;
  color: white;
}
</style>
