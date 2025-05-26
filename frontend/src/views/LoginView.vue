<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100">
    <div class="card p-4 shadow-sm w-100" style="max-width: 400px">
      <h2 class="mb-4 text-center">ورود به سیستم</h2>
      <form @submit.prevent="submitLogin" dir="rtl">
        <div class="mb-3">
          <label for="username" class="form-label">نام کاربری</label>
          <input
            type="text"
            v-model="username"
            id="username"
            class="form-control"
            placeholder="مثال: user یا domain\user"
          />
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">رمز عبور</label>
          <input type="password" v-model="password" id="password" class="form-control" />
        </div>
        <div class="form-text text-end">
          دامنه پیش‌فرض <strong>{{ DOMAIN }}</strong> است؛ اگر می‌خواهید با دامنهٔ دیگری وارد شوید،
          فرمت&nbsp; <code>user@DOMAIN</code> یا <code>DOMAIN\user</code> را بنویسید.
        </div>
        <button class="btn btn-primary w-100" :disabled="auth.loading" type="submit">
          {{ auth.loading ? 'در حال ورود…' : 'ورود' }}
        </button>
        <br />
      </form>
      <div v-if="auth.error" class="alert alert-danger mt-3 text-center">{{ auth.error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')

const DOMAIN = 'GOSTARESH' // ← adjust if your domain ever changes

const submitLogin = async () => {
  if (!username.value || !password.value) {
    auth.error = 'نام کاربری و رمز عبور الزامی است'
    return
  }

  /* ------------------------------------------------------------- *\
    Accept 3 formats and convert to DOMAIN\user
      1. user
      2. DOMAIN\user
      3. user@DOMAIN
  \* ------------------------------------------------------------- */
  let formatted = username.value.trim()

  if (formatted.includes('\\')) {
    // Already DOMAIN\user — keep as‑is
  } else if (formatted.includes('@')) {
    const [user, dom] = formatted.split('@')
    formatted = `${dom}\\${user}`
  } else {
    formatted = `${DOMAIN}\\${formatted}`
  }

  const success = await auth.login(formatted, password.value)
  if (success) router.push('/dashboard')
}
</script>
