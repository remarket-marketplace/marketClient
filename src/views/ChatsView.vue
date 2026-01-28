<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Headphones } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const API_HOST = import.meta.env.VITE_API_HOST

const chats = ref<ChatListItem[]>([])
const chatMessages = ref<ChatMessageUnion[]>([])
const selectedChatId = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const isLoadingMoreMessages = ref(false)
const errorMessage = ref<string | null>(null)
const isMobile = ref(false)
const mobileMode = ref<'chats' | 'chat'>('chats')
const store = useUserStore()
const user = ref<UserRead | null>(null)
const newMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(0)
const perPage = ref(30)
const hasMoreMessages = ref(true)

// Разделяем чаты на support и обычные
const sortedChats = computed(() => {
  const supportChats = chats.value.filter(chat => chat.chat_type === 'support_chat')
  const regularChats = chats.value.filter(chat => chat.chat_type === 'chat')
  return [...supportChats, ...regularChats]
})

const currentChat = computed(() =>
  chats.value.find(chat => chat.id === selectedChatId.value) || null
)

// Вычисляемое свойство для отображения имени чата
const chatDisplayName = computed(() => {
  if (!currentChat.value) return ''
  if (currentChat.value.chat_type === 'support_chat') {
    return t('pages.chats.support')
  }
  return currentChat.value.another_user.username
})

// Вычисляемое свойство для статуса чата
const chatDisplayStatus = computed(() => {
  if (!currentChat.value) return false
  if (currentChat.value.chat_type === 'support_chat') {
    return true // поддержка всегда онлайн
  }
  return currentChat.value.another_user.is_active
})

// Вычисляемое свойство для аватара чата
const chatDisplayAvatarUrl = computed(() => {
  if (!currentChat.value) return null
  if (currentChat.value.chat_type === 'support_chat') {
    return null // для поддержки используем иконку
  }
  return currentChat.value.another_user.avatar_url
})

// Вычисляемое свойство для инициалов
const chatUserInitial = computed(() => {
  if (!currentChat.value) return ''
  if (currentChat.value.chat_type === 'support_chat') {
    return 'S' // или другая буква для поддержки
  }
  return currentChat.value.another_user.username.charAt(0).toUpperCase()
})

// Проверяем, является ли текущий чат чатом поддержки
const isSupportChat = computed(() => {
  return currentChat.value?.chat_type === 'support_chat'
})

// Показываем админ бейдж только для обычных чатов, не для поддержки
const shouldShowAdminBadge = computed(() => {
  return !isSupportChat.value
})

function updateUrlChatId(chatId: string | null) {
  router.replace({
    query: {
      ...route.query,
      chatId: chatId || undefined
    }
  })
}

function backToChats() {
  if (mobileMode.value === 'chat') {
    mobileMode.value = 'chats'
    selectedChatId.value = null
    updateUrlChatId(null)
  }
}

let unsubscribeNewMessage: (() => void) | null = null
let unsubscribeChatUpdated: (() => void) | null = null

onMounted(async () => {
  try {
    isLoading.value = true
    await store.fetchUser()
    user.value = await store.getUser()

    if (!chatsService.isConnected()) {
      await chatsService.connectChatsWebsocket()
    }

    unsubscribeChatUpdated = chatsService.onChatUpdated(update => {
      const chatIndex = chats.value.findIndex(c => c.id === update.chat_id)
      if (chatIndex === -1) return

      const chat = chats.value[chatIndex]

      if (update.last_message && chat) {
        chat.last_message = update.last_message

        // Для обычных чатов перемещаем наверх, support_chat остаются на месте
        if (chat.chat_type === 'chat') {
          chats.value.splice(chatIndex, 1)
          // Находим позицию после всех support_chat
          const firstRegularChatIndex = chats.value.findIndex(c => c.chat_type === 'chat')
          if (firstRegularChatIndex === -1) {
            chats.value.push(chat)
          } else {
            chats.value.splice(firstRegularChatIndex, 0, chat)
          }
        }
      }
    })

    unsubscribeNewMessage = chatsService.onNewMessage(message => {
      if (selectedChatId.value === message.chat_room_id) {
        if (!chatMessages.value.some(m => m.id === message.id)) {
          chatMessages.value.push(message)
          nextTick(scrollToBottom)
        }
      }
    })

    await loadChats()

    const chatIdFromQuery = route.query.chatId as string | undefined
    if (chatIdFromQuery) {
      const exists = chats.value.some(c => c.id === chatIdFromQuery)
      if (exists) {
        await loadChatMessages(chatIdFromQuery)
      }
    }
  } catch {
    errorMessage.value = t('pages.chats.errorLoadingChats')
  } finally {
    isLoading.value = false
  }

  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  unsubscribeNewMessage?.()
  unsubscribeChatUpdated?.()
})

async function loadChats() {
  chats.value = await chatsService.getChats()
}

function scrollToBottom() {
  const el = messageContainerRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function handleScroll() {
  const el = messageContainerRef.value
  if (!el || isLoadingMoreMessages.value || !hasMoreMessages.value) return
  if (el.scrollTop === 0) await loadMoreMessages()
}

async function loadMoreMessages() {
  if (!selectedChatId.value) return

  isLoadingMoreMessages.value = true
  const el = messageContainerRef.value
  const oldHeight = el?.scrollHeight || 0

  const response = await chatsService.getChatMessages(
    selectedChatId.value,
    currentPage.value + 1,
    perPage.value
  )

  if (response.messages.length) {
    chatMessages.value.unshift(...response.messages)
    currentPage.value++
    totalPages.value = response.totalPages
    hasMoreMessages.value = currentPage.value < totalPages.value
    await nextTick()
    if (el) el.scrollTop = el.scrollHeight - oldHeight
  } else {
    hasMoreMessages.value = false
  }

  isLoadingMoreMessages.value = false
}

async function loadChatMessages(chatId: string) {
  isLoading.value = true

  chatMessages.value = []
  currentPage.value = 1
  hasMoreMessages.value = true

  await chatsService.joinChat(chatId)
  selectedChatId.value = chatId
  updateUrlChatId(chatId)

  const response = await chatsService.getChatMessages(chatId, 1, perPage.value)
  chatMessages.value = response.messages
  totalPages.value = response.totalPages
  hasMoreMessages.value = 1 < totalPages.value

  await nextTick()
  scrollToBottom()

  if (isMobile.value) mobileMode.value = 'chat'

  isLoading.value = false
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedChatId.value) return
  const success = await chatsService.sendMessage(
    newMessage.value.trim(),
    selectedChatId.value
  )
  if (success) {
    newMessage.value = ''
    nextTick(scrollToBottom)
  }
}
</script>


<template>
  <div class="h-full w-full flex flex-col md:pt-6">
    <div v-if="isLoading" class="flex flex-1 items-center justify-center text-gray-300">
      <Loader />
    </div>

    <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ errorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <div v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="h-full lg:max-w-sm flex flex-col md:pr-5 transition-all duration-300 min-h-0" :class="[
          isMobile && mobileMode === 'chats'
            ? 'fixed inset-0 z-10 w-full bg-background'
            : 'w-3/12',
        ]">
        <div class="h-full flex flex-col border-dark-600 lg:border-1 md:rounded-3xl" :class="{
          'pb-20': isMobile && mobileMode === 'chats',
          'pt-16': isMobile && mobileMode === 'chats',
        }">
          <p class="my-4 text-2xl px-4 text-mainText font-semibold">
            {{ $t('pages.chats.title') }}
          </p>

          <div class="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div v-if="sortedChats.length > 0" class="flex flex-col">
              <ChatItem v-for="chat in sortedChats" :key="chat.id" :chat="chat" :selected-chat-id="selectedChatId"
                :show-support-as-user="false" @load-chat-messages="(n: string) => loadChatMessages(n)" />
            </div>
            <div v-else class="h-full w-full flex items-center justify-center">
              <p class="text-sm text-gray-400 font-light">
                {{ $t('pages.chats.emptyChats') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isMobile || (isMobile && mobileMode === 'chat')"
        class="flex flex-1 transition-all duration-300 min-h-0" :class="[
          isMobile && mobileMode === 'chat'
            ? 'fixed inset-0 z-10 w-full bg-background'
            : 'flex-1 w-9/12 border-1 border-dark-400 rounded-3xl',
        ]">
        <div class="flex flex-1 flex-col px-2 md:rounded-xl w-full min-h-0" :class="{
          'pb-16': isMobile && mobileMode === 'chat',
          'pt-16': isMobile && mobileMode === 'chat',
        }">
          <div class="flex flex-grow flex-col overflow-y-auto lg:pb-2 w-full">
            <div v-if="currentChat"
              class="flex items-center gap-2 sticky top-0 bg-background px-2 py-2 lg:py-3 lg:px-3 z-10 lg:border-b border-dark-700">
              <button v-if="isMobile" class="text-xl font-bold flex-shrink-0" @click="backToChats">
                <ArrowLeft />
              </button>
              <div v-if="currentChat" class="flex items-center gap-3 flex-1 min-w-0">
                <!-- Аватар чата -->
                <div class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                  <!-- Для чата поддержки - иконка на синем фоне -->
                  <div v-if="isSupportChat"
                    class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-blue-500/20 border-2 border-blue-500/30">
                    <Headphones class="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <!-- Для обычного чата - фото или инициалы -->
                  <template v-else>
                    <img v-if="chatDisplayAvatarUrl" :src="`${API_HOST}${chatDisplayAvatarUrl}`"
                      class="h-8 w-8 lg:h-10 lg:w-10 border-2 border-dark-600 rounded-full object-cover"
                      :alt="chatDisplayName">
                    <div v-else
                      class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-gray-700 text-mainText font-bold uppercase">
                      {{ chatUserInitial }}
                    </div>
                  </template>
                </div>

                <!-- Информация о чате -->
                <div class="flex flex-col truncate">
                  <!-- Имя чата -->
                  <p class="truncate font-semibold text-lg" :class="isSupportChat ? 'text-blue-500' : 'text-mainText'">
                    {{ chatDisplayName }}
                  </p>
                  <!-- Статус онлайн -->
                  <p v-if="chatDisplayStatus" class="text-xs text-green-500">
                    {{ $t('common.online') }}
                  </p>
                  <p v-else class="text-xs text-gray-500">
                    {{ $t('common.offline') }}
                  </p>
                </div>
              </div>
            </div>

            <div ref="messageContainerRef" class="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-2"
              @scroll="handleScroll">
              <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                <Loader size="sm" />
              </div>

              <div v-if="chatMessages.length > 0" class="flex flex-1 flex-col justify-start">
                <div class="flex flex-col gap-3 py-2">
                  <ChatMessage v-for="message in chatMessages" :key="message.id" :message="message" :user="user" :showAdminBadge="shouldShowAdminBadge" />
                </div>
              </div>

              <div v-else-if="selectedChatId != null && chatMessages.length === 0"
                class="h-full w-full flex items-center justify-center">
                <div v-if="isSupportChat" class="flex flex-col items-center justify-center gap-4 text-center px-4">
                  <div class="text-4xl">💬</div>
                  <p class="text-lg text-mainText font-semibold">{{ $t("pages.chats.emptySupport") }}</p>
                  <p class="text-gray-400 text-sm">{{ $t("pages.chats.emptySupportDesc") }}</p>
                </div>
                <p v-else class="text-gray-400 font-light">{{ $t("pages.chats.emptyMessages") }}</p>
              </div>

              <div v-else-if="selectedChatId === null" class="h-full w-full flex items-center justify-center">
                <p class="text-gray-400 font-light">{{ $t('pages.chats.selectChat') }}</p>
              </div>
            </div>

            <SendMessageBar v-if="selectedChatId" v-model:newMessage="newMessage" @sendMessage="sendMessage" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(header) {
  z-index: 20 !important;
}

:deep(.mobile-nav-glass) {
  z-index: 20 !important;
}
</style>