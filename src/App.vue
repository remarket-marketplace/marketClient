<!-- App.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import { storeToRefs } from 'pinia'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import Loader from './components/Loader.vue'

const store = useUserStore()
const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const { user } = storeToRefs(store)

onMounted(async () => {
  await store.fetchUser()
})

// Определяем какой layout использовать
const layout = computed(() => {
  // Если путь начинается с /admin - используем админский layout
  return route.path.startsWith('/admin') ? AdminLayout : DefaultLayout
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