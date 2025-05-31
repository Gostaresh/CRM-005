// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-loaded pages (code-split)
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: LoginView },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardView,
      // pass ?activityId=<GUID> as a prop so DashboardView can open the modal
      props: (route) => ({ activityId: route.query.activityId || null }),
    },
  ],
})

/** Global guard: redirect guests to /login, logged-in users away from /login */
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (auth.user === null) await auth.fetchUser()

  if (to.name !== 'Login' && !auth.user) return next('/login')
  if (to.name === 'Login' && auth.user) return next('/dashboard')
  next()
})

export default router
