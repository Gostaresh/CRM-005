<script setup>
defineProps({
  event: { type: Object, required: true },
})
</script>

<template>
  <n-popover trigger="hover" placement="top" :delay="50">
    <template #trigger>
      <slot />
      <!-- the original event element -->
    </template>

    <div style="min-width: 200px">
      <strong>{{ event.title }}</strong>
      <br />
      <span v-if="event.extendedProps.description">
        {{ event.extendedProps.description }}
        <br />
      </span>
      <span>مالک: {{ event.extendedProps.owner?.name || '—' }}</span
      ><br />
      <span>اولویت: {{ event.extendedProps.prioritycode }}</span
      ><br />
      <span>وضعیت: {{ event.extendedProps.statecode }}</span>
    </div>
  </n-popover>
</template>
