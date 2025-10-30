<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import Loader from './components/Loader.vue'
import { storeToRefs } from 'pinia'

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
})

// Определяем какой layout использовать
const layout = computed(() => {
  if (route.path.startsWith('/admin') && user.value?.role === 'admin') {
    return AdminLayout
  }
  return DefaultLayout
})
</script>

<template>
  <Loader v-if="!isUserLoaded" class="flex h-full items-center justify-center" />
  <component v-else :is="layout">
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
</template>