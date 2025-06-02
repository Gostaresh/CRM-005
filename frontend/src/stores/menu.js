// src/stores/menu.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useMenuStore = defineStore('menu', {
  state: () => ({ tree: [] }),
  actions: {
    async load() {
      const { data } = await axios.get('/api/ui/menus')
      this.tree = data // exactly the JSON you posted
    },
  },
})
