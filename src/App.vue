<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { useNavigationStore } from './stores/navigation'
import { useChatStore } from './stores/chat'
import { useNotificationStore } from './stores/notification'
import { chatsService } from './api/chats/chatsService'
import DefaultLayout from './views/layouts/DefaultLayout.vue'
import AdminLayout from './views/layouts/AdminLayout.vue'
import { storeToRefs } from 'pinia'
import { authService } from './api/auth/AuthService'
import MainPageLayout from './views/layouts/MainPageLayout.vue'
import AppRouteSkeleton from './components/layout/AppRouteSkeleton.vue'
import CookieConsentBanner from './components/layout/CookieConsentBanner.vue'
import AuthCornerToast from './components/AuthCornerToast.vue'
import AuthModal from './components/auth/AuthModal.vue'
import { consumeAuthWelcomeToast, type AuthWelcomeToastPayload } from './utils/authWelcomeToast'

type AuthModalMode = 'signin' | 'signup'

const store = useUserStore()
const navigationStore = useNavigationStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()
const route = useRoute()
const router = useRouter()
const isUserLoaded = ref(false)
const authWelcomeToast = ref<AuthWelcomeToastPayload | null>(null)
let unsubscribeChatUpdated: (() => void) | null = null
let unsubscribeNotificationCreated: (() => void) | null = null
let onlinePingIntervalHandle: number | null = null
let authWelcomeToastTimer: number | null = null
let chatSyncVersion = 0
let isResyncingChats = false
let needResyncChats = false
const onlinePingIntervalMs = Number(import.meta.env.VITE_ONLINE_PING_INTERVAL_MS ?? 30000)
const resolvedOnlinePingIntervalMs = Number.isFinite(onlinePingIntervalMs)
  ? Math.max(30000, Math.floor(onlinePingIntervalMs))
  : 30000

const { user } = storeToRefs(store)
const { routePending } = storeToRefs(navigationStore)
const showRouteProgress = computed(() => isUserLoaded.value && routePending.value)
const authModalMode = computed<AuthModalMode | null>(() => {
  const mode = route.query.auth
  const normalizedMode = Array.isArray(mode) ? mode[0] : mode
  if (normalizedMode === 'signin' || normalizedMode === 'signup') {
    return normalizedMode
  }
  return null
})
const isAuthModalOpen = computed(() => Boolean(authModalMode.value) && !user.value)

function closeAuthModal() {
  const nextQuery = { ...route.query }
  delete nextQuery.auth
  delete nextQuery.redirect
  void router.replace({
    path: route.path,
    query: nextQuery,
    hash: route.hash,
  })
}

function setAuthModalMode(mode: AuthModalMode) {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      auth: mode,
    },
    hash: route.hash,
  })
}

function pingOnlineSafely() {
  if (!user.value) return
  void authService.pingOnlineStatus().catch(() => null)
}

function startOnlinePing() {
  if (onlinePingIntervalHandle) return
  pingOnlineSafely()
  onlinePingIntervalHandle = window.setInterval(() => {
    pingOnlineSafely()
  }, resolvedOnlinePingIntervalMs)
}

function stopOnlinePing() {
  if (!onlinePingIntervalHandle) return
  clearInterval(onlinePingIntervalHandle)
  onlinePingIntervalHandle = null
}

function clearAuthWelcomeToastTimer() {
  if (!authWelcomeToastTimer) return
  window.clearTimeout(authWelcomeToastTimer)
  authWelcomeToastTimer = null
}

function showQueuedAuthWelcomeToast() {
  const payload = consumeAuthWelcomeToast()
  if (!payload) return

  authWelcomeToast.value = payload
  clearAuthWelcomeToastTimer()
  authWelcomeToastTimer = window.setTimeout(() => {
    authWelcomeToast.value = null
    authWelcomeToastTimer = null
  }, 2600)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    pingOnlineSafely()
  }
}

function handleWindowFocus() {
  pingOnlineSafely()
}

function handleWindowOnline() {
  pingOnlineSafely()
}

async function resyncChats(userId: string, syncVersion: number) {
  if (isResyncingChats) {
    needResyncChats = true
    return
  }

  isResyncingChats = true
  try {
    do {
      needResyncChats = false
      const chats = await chatsService.getChats()
      if (syncVersion !== chatSyncVersion || store.user?.id !== userId) return
      chatStore.setChats(chats)
    } while (needResyncChats)
  } finally {
    isResyncingChats = false
  }
}

async function initChats(userId: string, syncVersion: number) {
  if (!store.user) return

  await chatsService.connectChatsWebsocket()
  if (syncVersion !== chatSyncVersion || store.user?.id !== userId) return

  const chats = await chatsService.getChats()
  if (syncVersion !== chatSyncVersion || store.user?.id !== userId) return

  chatStore.setChats(chats)

  unsubscribeChatUpdated?.()
  unsubscribeNotificationCreated?.()
  unsubscribeChatUpdated = chatsService.onChatUpdated((update) => {
    const hasChatInStore = chatStore.chats.some((chat) => chat.id === update.chat_id)
    if (!hasChatInStore) {
      void resyncChats(userId, syncVersion)
      return
    }
    chatStore.updateChatFromSocket(update)
  })
  unsubscribeNotificationCreated = chatsService.onNotificationCreated((notification) => {
    notificationStore.pushRealtimeNotification(notification)
  })
}

function clearChats() {
  unsubscribeChatUpdated?.()
  unsubscribeNotificationCreated?.()
  unsubscribeChatUpdated = null
  unsubscribeNotificationCreated = null
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
      notificationStore.clear()
      return
    }

    notificationStore.initForUser(userId)
    await notificationStore.loadInbox(true)
    await initChats(userId, syncVersion)
  },
  { immediate: true }
)

watch(
  () => user.value?.id ?? null,
  (userId) => {
    if (userId) {
      startOnlinePing()
      if (authModalMode.value) {
        closeAuthModal()
      }
      return
    }
    stopOnlinePing()
  },
  { immediate: true }
)

watch(
  authModalMode,
  (mode) => {
    if (mode && user.value) {
      closeAuthModal()
    }
  }
)

watch(
  () => route.fullPath,
  () => {
    showQueuedAuthWelcomeToast()
  }
)

onMounted(async () => {
  try {
    await store.ensureUserLoaded()
  } catch (error) {
    console.error('Failed to resolve current user on app bootstrap', error)
  }
  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('online', handleWindowOnline)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  pingOnlineSafely()
  showQueuedAuthWelcomeToast()
  isUserLoaded.value = true
})

onUnmounted(() => {
  unsubscribeChatUpdated?.()
  unsubscribeNotificationCreated?.()
  stopOnlinePing()
  clearAuthWelcomeToastTimer()
  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('online', handleWindowOnline)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
    <AuthCornerToast
      v-if="authWelcomeToast"
      :title="authWelcomeToast.title"
    />

    <Transition name="route-progress">
      <div v-if="showRouteProgress" class="pointer-events-none fixed inset-x-0 top-0 z-[140] h-1 overflow-hidden">
        <div class="route-progress-bar"></div>
      </div>
    </Transition>

    <div v-if="!isUserLoaded" class="w-screen h-screen relative z-10">
      <AppRouteSkeleton />
    </div>

    <component v-else :is="layout" class="relative z-10">
      <RouterView v-slot="{ Component, route }">
        <Suspense>
          <template #default>
            <component :is="Component" :key="route.path" />
          </template>
          <template #fallback>
            <AppRouteSkeleton />
          </template>
        </Suspense>
      </RouterView>
    </component>

    <CookieConsentBanner />

    <AuthModal
      v-if="authModalMode"
      :is-open="isAuthModalOpen"
      :mode="authModalMode"
      @close="closeAuthModal"
      @mode-change="setAuthModalMode"
    />
  </div>
</template>

<style scoped>
.route-progress-bar {
  height: 100%;
  width: 28%;
  border-radius: 9999px;
  background: var(--route-progress-bar);
  animation: route-progress-slide 1.05s ease-in-out infinite;
}

.route-progress-enter-active,
.route-progress-leave-active {
  transition: opacity 0.18s ease;
}

.route-progress-enter-from,
.route-progress-leave-to {
  opacity: 0;
}

@keyframes route-progress-slide {
  0% {
    transform: translateX(-120%) scaleX(0.8);
  }

  55% {
    transform: translateX(180%) scaleX(1.15);
  }

  100% {
    transform: translateX(430%) scaleX(0.85);
  }
}
</style>
