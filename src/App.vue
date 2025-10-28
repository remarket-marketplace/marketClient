<!-- App.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import Loader from './components/Loader.vue'
import type { UserRead } from './validation/user/userRead'

const store = useUserStore()
const route = useRoute()

const user = ref<UserRead | null>()

onMounted(async () => {
  await store.fetchUser()
  user.value = await store.getUser()
})

// Определяем какой layout использовать
const layout = computed(() => {
  // Если путь начинается с /admin и пользователь admin - используем админский layout
  return route.path.startsWith('/admin') && (user.value != null && user.value.role === 'admin') ? AdminLayout : DefaultLayout
})
</script>

<template>
  <component :is="layout">
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