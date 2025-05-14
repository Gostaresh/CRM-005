<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100">
    <div class="card p-4 shadow-sm w-100" style="max-width: 400px">
      <h2 class="mb-4 text-center">ورود به سیستم</h2>
      <form @submit.prevent="submitLogin" dir="rtl">
        <div class="mb-3">
          <label for="username" class="form-label">نام کاربری</label>
          <input type="text" v-model="username" id="username" class="form-control" />
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">رمز عبور</label>
          <input type="password" v-model="password" id="password" class="form-control" />
        </div>
        <button class="btn btn-primary w-100" type="submit">ورود</button>
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

const username = ref('GOSTARESH\\ehsntb')
const password = ref('Ss12345')

const submitLogin = async () => {
  const success = await auth.login(username.value, password.value)
  if (success) {
    router.push('/dashboard')
  }
}
</script>
