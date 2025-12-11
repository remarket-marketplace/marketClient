<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import Loader from './components/Loader.vue'
import { storeToRefs } from 'pinia'
import { authService } from './api/auth/AuthService'
import MainPageLayout from './views/layouts/MainPageLayout.vue'

const store = useUserStore()
const route = useRoute()
const isUserLoaded = ref(false)

const { user } = storeToRefs(store)

onMounted(async () => {
  try {
    await store.fetchUser()
  } finally {
    isUserLoaded.value = true
  }

  // пингуем для сохранения статуса онлайн
  setInterval(() => {
    authService.pingOnlineStatus()
  }, 5000)
})
// Определяем какой layout использовать
const layout = computed(() => {
  if (route.path.startsWith('/admin') && user.value?.role === 'admin') {
    return AdminLayout
  }
  else if (route.path === '/') {
    return MainPageLayout
  }
  return DefaultLayout
})
</script>

<template>
  <div class="w-full h-full relative">
    <div v-if="!isUserLoaded" class="w-screen h-screen flex items-center justify-center relative z-10">
      <Loader />
    </div>

    <component v-else :is="layout" class="relative z-10">
      <RouterView v-slot="{ Component, route }">
        <Suspense>
          <template #default>
            <component :is="Component" :key="route.path" />
          </template>
          <template #fallback>
            <div class="flex h-full items-center justify-center">
              <Loader/>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </component>
  </div>
</template>