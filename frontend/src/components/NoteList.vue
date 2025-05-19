<template>
  <div class="note-list">
    <ul class="list-group mb-3" v-if="notes && notes.length">
      <li v-for="n in notes" :key="n.annotationid" class="list-group-item d-flex flex-column gap-1">
        <div class="fw-bold">{{ n.subject || '(بدون عنوان)' }}</div>
        <div class="small text-body-secondary" style="white-space: pre-line">
          {{ n.notetext }}
        </div>

        <a
          v-if="n.filename"
          :href="`/api/crm/notes/${n.annotationid}/download`"
          target="_blank"
          class="badge text-bg-light align-self-start mt-1"
        >
          📎 {{ n.filename }}
        </a>
      </li>
    </ul>
    <p v-else class="text-muted small">یادداشتی وجود ندارد.</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  notes: {
    annotationid: string
    subject: string | null
    notetext: string | null
    filename: string | null
    mimetype: string | null
  }[]
}>()
</script>

<style scoped>
.note-list {
  max-height: 500px;
  overflow-y: auto;
}
</style>
