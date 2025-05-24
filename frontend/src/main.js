import './assets/main.css'
import './assets/modal-grid.css'
import 'vfonts/FiraCode.css'
import 'vfonts/FiraSans.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(naive) // registers all Naive‑UI components globally

app.mount('#app')
