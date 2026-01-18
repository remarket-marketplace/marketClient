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
import { nextTick, onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
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
const perPage = ref(10)
const hasMoreMessages = ref(true)

const currentChat = computed(() =>
  chats.value.find(chat => chat.id === selectedChatId.value) || null
)

const chatUserInitial = computed(() =>
  currentChat.value?.another_user.username.charAt(0).toUpperCase() || ''
)

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
  // unsubscribeChatUpdated?.()
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
      <Loader/>
    </div>

    <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ errorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="h-full lg:max-w-sm flex flex-col md:pr-5 transition-all duration-300 min-h-0"
        :class="[
          isMobile && mobileMode === 'chats'
            ? 'fixed inset-0 z-10 w-full bg-background'
            : 'w-3/12',
        ]"
      >
        <div
          class="h-full flex flex-col border-dark-600 lg:border-1 md:rounded-3xl"
          :class="{
            'pb-20': isMobile && mobileMode === 'chats',
            'pt-16': isMobile && mobileMode === 'chats',
          }"
        >
          <p class="my-4 text-2xl px-4 text-mainText font-semibold">
            {{ $t('pages.chats.title') }}
          </p>

          <div class="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div v-if="chats.length > 0" class="flex flex-col">
                <ChatItem
                  v-for="chat in chats"
                  :key="chat.id"
                  :chat="chat"
                  :selected-chat-id="selectedChatId"
                  @load-chat-messages="(n: string) => loadChatMessages(n)"
                />
            </div>
            <div v-else class="h-full w-full flex items-center justify-center">
              <p class="text-sm text-gray-400 font-light">
                {{ $t('pages.chats.emptyChats') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chat')"
        class="flex flex-1 transition-all duration-300 min-h-0"
        :class="[
          isMobile && mobileMode === 'chat'
            ? 'fixed inset-0 z-10 w-full bg-background'
            : 'flex-1 w-9/12 border-1 border-dark-400 rounded-3xl',
        ]"
      >
        <div
          class="flex flex-1 flex-col px-2 md:rounded-xl w-full min-h-0"
          :class="{
            'pb-16': isMobile && mobileMode === 'chat',
            'pt-16': isMobile && mobileMode === 'chat',
          }"
        >
          <div class="flex flex-grow flex-col overflow-y-auto lg:pb-2 w-full">
            <div v-if="currentChat" class="flex items-center gap-2 sticky top-0 bg-background px-2 py-2 lg:py-3 lg:px-3 z-10 lg:border-b border-dark-700">
              <button v-if="isMobile" class="text-xl font-bold flex-shrink-0" @click="backToChats">
                <ArrowLeft />
              </button>
              <div v-if="currentChat" class="flex items-center gap-3 flex-1 min-w-0">
                <div class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                  <img
                    v-if="currentChat?.another_user.avatar_url"
                    :src="`${API_HOST}${currentChat.another_user.avatar_url}`"
                    class="h-8 w-8 lg:h-10 lg:w-10 border-2 border-dark-600 rounded-full object-cover"
                    :alt="currentChat.another_user.username"
                  >
                  <div
                    v-else
                    class="h-8 w-8 flex items-center justify-center rounded-full bg-gray-700 text-mainText font-bold uppercase"
                  >
                    {{ chatUserInitial }}
                  </div>
                </div>
                <div class="flex flex-col truncate">
                  <p class="truncate text-mainText font-semibold text-lg">
                    {{ currentChat?.another_user.username }}
                  </p>
                  <p v-if="currentChat?.another_user.is_active" class="text-xs text-green-500">
                    {{ $t('common.online') }}
                  </p>
                  <p v-else class="text-xs text-gray-500">
                    {{ $t('common.offline') }}
                  </p>
                </div>
              </div>
            </div>

            <div 
              ref="messageContainerRef" 
              class="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-2"
              @scroll="handleScroll"
            >
              <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                <Loader size="sm" />
              </div>
              
              <div v-if="chatMessages.length > 0" class="flex flex-1 flex-col justify-start">
                <div class="flex flex-col gap-3">
                  <ChatMessage
                    v-for="message in chatMessages"
                    :key="message.id"
                    :message="message"
                    :user="user"
                  />
                </div>
              </div>

              <div v-else-if="selectedChatId != null && chatMessages.length === 0" class="h-full w-full flex items-center justify-center">
                <p class="text-gray-400 font-light">{{ $t("pages.chats.emptyMessages") }}</p>
              </div>

              <div v-else-if="selectedChatId === null" class="h-full w-full flex items-center justify-center">
                <p class="text-gray-400 font-light">{{ $t('pages.chats.selectChat') }}</p>
              </div>
            </div>

            <SendMessageBar
              v-if="selectedChatId"
              v-model:newMessage="newMessage"
              @sendMessage="sendMessage"
            />
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