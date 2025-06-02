<template>
  <div class="d-flex align-items-center mb-3 gap-3 justify-content-between">
    <!-- keep title on the RTL‑right -->
    <h2 class="m-0">داشبورد</h2>
    <n-button-group>
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
      <n-button secondary @click="refreshCalendar" title="بارگیری دوباره">🔄 بروزرسانی</n-button>
      <n-button type="primary" @click="isCreateVisible = true">➕ ایجاد فعالیت جدید</n-button>
    </n-button-group>
    <!-- push user / help / logout to RTL‑left -->
    <div class="d-flex align-items-center gap-3">
      <small v-if="auth.user" class="text-muted">
        {{ auth.user.fullname || auth.user.username }}
      </small>
      <n-tooltip>
        <template #trigger>
          <n-button text @click="showShortcuts = true">❓</n-button>
        </template>
        کلیدهای میان‌بر
      </n-tooltip>
      <button class="btn btn-outline-danger" @click="logout">خروج</button>
    </div>

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
</template>
