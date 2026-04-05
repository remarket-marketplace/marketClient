import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'

export const useNavigationStore = defineStore('navigation', () => {
  const routePending = ref(false)

  function startRoutePending() {
    routePending.value = true
  }

  function finishRoutePending() {
    routePending.value = false
  }

  return {
    routePending,
    startRoutePending,
    finishRoutePending,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useNavigationStore as any, import.meta.hot))
