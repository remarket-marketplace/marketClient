<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import { useChatStore } from './stores/chat'
import { chatsService } from './api/chats/chatsService'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import Loader from './components/Loader.vue'
import { storeToRefs } from 'pinia'
import { authService } from './api/auth/AuthService'
import MainPageLayout from './views/layouts/MainPageLayout.vue'

const store = useUserStore()
const chatStore = useChatStore()
const route = useRoute()
const isUserLoaded = ref(false)
let unsubscribeChatUpdated: (() => void) | null = null
let onlinePingIntervalHandle: number | null = null
let chatSyncVersion = 0

const { user } = storeToRefs(store)

async function initChats(userId: string, syncVersion: number) {
  if (!store.user) return

  await chatsService.connectChatsWebsocket()
  if (syncVersion !== chatSyncVersion || store.user?.id !== userId) return

  const chats = await chatsService.getChats()
  if (syncVersion !== chatSyncVersion || store.user?.id !== userId) return

  chatStore.setChats(chats)

  unsubscribeChatUpdated?.()
  unsubscribeChatUpdated = chatsService.onChatUpdated((update) => {
    chatStore.updateChatFromSocket(update)
  })
}

function clearChats() {
  unsubscribeChatUpdated?.()
  unsubscribeChatUpdated = null
  chatStore.clear()
}

watch(
  () => store.user?.id ?? null,
  async (userId) => {
    chatSyncVersion += 1
    const syncVersion = chatSyncVersion

    if (!userId) {
      chatsService.disconnect()
      clearChats()
      return
    }

    await initChats(userId, syncVersion)
  },
  { immediate: true }
)

onMounted(async () => {
  await store.fetchUser()
  isUserLoaded.value = true

  if (!onlinePingIntervalHandle) {
    // пингуем для сохранения статуса онлайн
    onlinePingIntervalHandle = window.setInterval(() => {
      if (user.value)
        authService.pingOnlineStatus()
    }, 30000)
  }
})

onUnmounted(() => {
  unsubscribeChatUpdated?.()
  if (onlinePingIntervalHandle) {
    clearInterval(onlinePingIntervalHandle)
    onlinePingIntervalHandle = null
  }
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
              <Loader />
            </div>
          </template>
        </Suspense>
      </RouterView>
    </component>
  </div>
</template>
