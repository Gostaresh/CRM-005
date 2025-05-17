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

<style>
/* Override the default Vite scaffold that centers #app at 1280 px */
#app {
  max-width: none;
  margin: 0;
  padding: 0;
}
</style>
