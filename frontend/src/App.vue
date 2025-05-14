<template>
  <router-view />
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const auth = useAuthStore()
auth.fetchUser() // preload session
</script>
