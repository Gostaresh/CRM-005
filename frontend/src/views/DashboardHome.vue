<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  CalendarOutlined,
  LineChartOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@vicons/antd'
import { NIcon } from 'naive-ui'

const router = useRouter()

const tiles = [
  { label: 'تقویم و فعالیت‌ها', route: '/calendar', icon: CalendarOutlined, ready: true },
  { label: 'فروش', route: '/sales', icon: LineChartOutlined, ready: false },
  { label: 'مخاطبین', route: '/contacts', icon: TeamOutlined, ready: false },
  { label: 'گزارشات', route: '/reports', icon: BarChartOutlined, ready: false },
  { label: 'تنظیمات', route: '/settings', icon: SettingOutlined, ready: false },
]
</script>

<template>
  <div class="dashboard-bg">
    <div class="dash-center">
      <div class="tile-box">
        <h2 class="dashboard-title">سلام، خوش آمدید</h2>
        <div class="tile-grid">
          <n-card
            v-for="t in tiles"
            :key="t.route"
            hoverable
            size="large"
            :class="['tile-card', { disabled: !t.ready }]"
            @click="t.ready && router.push(t.route)"
          >
            <n-icon class="icon" size="34">
              <component :is="t.icon" />
            </n-icon>
            <div class="label">{{ t.label }}</div>
            <div v-if="!t.ready" class="coming-soon">به‌زودی</div>
          </n-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.tile-card {
  text-align: center;
  cursor: pointer;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tile-card .icon {
  margin-bottom: 0.5rem;
}

.tile-card .label {
  font-weight: 700;
}

.tile-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.coming-soon {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}

.dash-center {
  min-height: calc(100vh - 120px); /* adjust if header height differs */
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 3rem;
}

.tile-box {
  background: #fff;
  border-radius: 12px;
  padding: 2rem 2.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  max-width: 800px;
  width: 100%;
}

.dashboard-title {
  text-align: right;
  font-size: 1.35rem;
  margin-bottom: 1.5rem;
}
</style>
