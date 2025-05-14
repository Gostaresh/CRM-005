import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView },
  ],
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  // fetchUser only once if needed
  if (auth.user === null) {
    await auth.fetchUser()
  }

  if (to.name === 'Dashboard' && !auth.user) {
    return next('/login')
  }

  next()
})

export default router
