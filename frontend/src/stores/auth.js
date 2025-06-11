import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { BASE_URL } from '@/utils/env'

// const baseUrl = import.meta.env.VITE_API_BASE_URL
const baseUrl = BASE_URL || 'http://localhost:3000'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    error: null,
  }),

  actions: {
    async login(username, password) {
      this.error = null
      try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Login failed')
        }

        // Prefer user object returned by backend, otherwise call /me endpoint
        let data
        try {
          data = await response.json() // if backend returns user info
        } catch {
          data = null
        }

        if (data && data.user) {
          this.user = data.user // { id, username, fullname, ... }
        } else {
          // Fallback: fetch /me to fill id & fullname
          await this.fetchUser()
        }
        return true
      } catch (err) {
        this.error = err.message
        return false
      }
    },

    async logout() {
      try {
        await fetch(`${baseUrl}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        })
      } finally {
        this.user = null
      }
    },
    async fetchUser() {
      try {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          this.user = data.user
        } else {
          this.user = null
        }
      } catch {
        this.user = null
      }
    },
  },

  setup() {
    const form = ref({
      startJalali: '',
      endJalali: '',
      startRaw: '',
      endRaw: '',
    })

    function saveTask() {
      console.log('Jalali Start:', form.value.startJalali)
      console.log('Jalali End:', form.value.endJalali)
      console.log('ISO Start:', form.value.startRaw)
      console.log('ISO End:', form.value.endRaw)
    }

    function updateStartTime(value) {
      // Assume value is Jalali string, convert to ISO string here
      form.value.startJalali = value
      form.value.startRaw = jalaliToISO(value)
    }

    function updateEndTime(value) {
      // Assume value is Jalali string, convert to ISO string here
      form.value.endJalali = value
      form.value.endRaw = jalaliToISO(value)
    }

    function jalaliToISO(jalaliDate) {
      // Placeholder conversion function
      // Implement actual Jalali to ISO conversion logic here
      return new Date(jalaliDate).toISOString()
    }

    return {
      form,
      saveTask,
      updateStartTime,
      updateEndTime,
    }
  },
})
