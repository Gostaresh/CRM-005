import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// lazy-loaded routes
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')

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
  if (auth.user === null) await auth.fetchUser()
  if (to.name === 'Dashboard' && !auth.user) return next('/login')
  next()
})

export default router
