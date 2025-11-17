<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatContentUnion, ChatMessage as ChatMessageType } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'

import { ArrowLeft } from 'lucide-vue-next'

const { t } = useI18n()
const API_HOST = import.meta.env.VITE_API_HOST

const chats = ref<ChatListItem[]>([])
const chatMessages = ref<ChatContentUnion[]>([])
const selectedChatId = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isMobile = ref(false)
const mobileMode = ref<'chats' | 'chat'>('chats')
const store = useUserStore()
const user = ref<UserRead | null>()

const newMessage = ref<string>('')

// get current active chat
const currentChat = computed(() => {
  if (!selectedChatId.value) return null
  return chats.value.find(chat => chat.id === selectedChatId.value)
})

// get user initial
const chatUserInitial = computed(() => {
  return currentChat.value?.another_user.username.charAt(0).toUpperCase() || ''
})

// scroll to bottom when updated chat messages list
watch(chatMessages, async () => {
  await nextTick()
  setTimeout(() => {
    scrollToBottom()
  }, 100)
}, { deep: true })

// handler update chats data
const handleChatUpdated = (updateData: any) => {
  const chatIndex = chats.value.findIndex(chat => chat.id === updateData.chat_id)
  
  if (chatIndex !== -1) {
    const chat = chats.value[chatIndex]
    
    chat.last_message = {
      id: chat.last_message?.id,
      sender_id: chat.last_message?.sender_id || updateData.last_message_sender || '',
      text: updateData.last_message,
      is_read: chat.last_message?.is_read || false,
      created_at: updateData.last_message_time || new Date().toISOString(),
      chat_room_id: updateData.chat_id,
      message_type: 'text' as const
    }
    
    chat.unread_count = updateData.unread_count || 0
    
    chats.value.splice(chatIndex, 1)
    chats.value.unshift(chat)
  } else {
    loadChats()
  }
}

function backToChats() {
  if (mobileMode.value === 'chat') {
    mobileMode.value = 'chats'
    localStorage.removeItem('selectedChatId')
  }
}

onMounted(async () => {
  try {
    isLoading.value = true
    await store.fetchUser()
    user.value = await store.getUser()
    
    // subscribe to new messages
    chatsService.onNewMessage((message: ChatMessageType) => {
      if (selectedChatId.value === message.chat_room_id) {
        const messageExists = chatMessages.value.some(m => m.id === message.id)
        if (!messageExists) {
          chatMessages.value.push(message)
        }
      }
    })

    chatsService.onChatUpdated(handleChatUpdated)

    // load chats and subscribe to chats data update
    await loadChats()
    await chatsService.subscribeChatList()
    
    // restore last opened chat
    await restoreLastChat()
  }
  catch (error) {
    errorMessage.value = t('pages.chats.errorLoadingChats')
  }
  finally {
    isLoading.value = false
  }

  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  chatsService.unsubscribeChatList()
  chatsService.onNewMessage(null)
  chatsService.onChatUpdated(null)
  chatsService.onChatNotification(null)
})

async function loadChats() {
  try {
    chats.value = await chatsService.getChats()
  } catch (error) {
    errorMessage.value = t('pages.chats.errorLoadingChats')
  }
}

async function restoreLastChat() {
  const savedChatId = localStorage.getItem('selectedChatId')
  if (!savedChatId) return

  const existingChat = chats.value.find(c => c.id === savedChatId)
  if (!existingChat) {
    localStorage.removeItem('selectedChatId')
    return
  }

  await loadChatMessages(savedChatId)
  if (window.innerWidth < 768) {
    mobileMode.value = 'chat'
  }
}

function scrollToBottom() {
  const el = messageContainerRef.value
  if (!el) return
  
  const attemptScroll = (attempts = 0) => {
    if (attempts > 5) return
    
    const shouldScroll = el.scrollHeight - el.scrollTop - el.clientHeight > 10
    
    if (shouldScroll) {
      el.scrollTop = el.scrollHeight
      
      setTimeout(() => {
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 10
        if (!isAtBottom) {
          attemptScroll(attempts + 1)
        }
      }, 50)
    }
  }
  
  attemptScroll()
}

async function loadChatMessages(chatId: string) {
  try {
    isLoading.value = true
    errorMessage.value = null
    
    // join chat room
    await chatsService.joinChat(chatId)
    selectedChatId.value = chatId
    
    // load messages
    chatMessages.value = await chatsService.getChatMessages(chatId)
    localStorage.setItem('selectedChatId', chatId)
    
    await nextTick()
    setTimeout(() => {
      scrollToBottom()
    }, 150)
    
    if (isMobile.value) {
      mobileMode.value = 'chat'
    }
  }
  catch (e) {
    console.error('Error loading messages:', e)
    if (e instanceof ZodError) {
      errorMessage.value = t('pages.chats.errorDataStructure')
    }
    else {
      errorMessage.value = t('pages.chats.errorLoadingMessages')
    }
  }
  finally {
    isLoading.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedChatId.value) return
  try {
    const success = await chatsService.sendMessage(newMessage.value.trim(), selectedChatId.value)
    if (success) {
      newMessage.value = ''
    } else {
      errorMessage.value = t('pages.chats.errorSendMessage')
    }
  }
  catch (error) {
    console.error('Ошибка отправки сообщения:', error)
    errorMessage.value = t('pages.chats.errorSendMessage')
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <div v-if="isLoading" class="flex flex-1 items-center justify-center text-gray-300">
      <Loader/>
    </div>

    <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ errorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <!-- chats list -->
      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="h-full lg:max-w-sm flex flex-col md:pr-5 transition-all duration-300"
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

      <!-- chat screen -->
      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chat')"
        class="flex flex-1 transition-all duration-300"
        :class="[
          isMobile && mobileMode === 'chat'
            ? 'fixed inset-0 z-10 w-full bg-background'
            : 'flex-1 w-9/12 border-1 border-dark-400 rounded-xl',
        ]"
      >
        <div
          class="flex flex-1 flex-col px-2 md:rounded-xl w-full"
          :class="{
            'pb-16': isMobile && mobileMode === 'chat',
            'pt-16': isMobile && mobileMode === 'chat',
          }"
        >
          <div class="flex flex-grow flex-col overflow-y-auto lg:pb-2 w-full">
            <!-- chat header -->
            <div v-if="isMobile && mobileMode === 'chat'" class="flex items-center gap-2 mb-2 px-2 sticky top-0 bg-background py-2 z-10">
              <button class="text-xl font-bold flex-shrink-0" @click="backToChats">
                <ArrowLeft />
              </button>
              
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="h-8 w-8 flex items-center justify-center flex-shrink-0">
                  <img
                    v-if="currentChat?.another_user.avatar_url"
                    :src="`${API_HOST}${currentChat.another_user.avatar_url}`"
                    class="h-8 w-8 border-2 border-dark-600 rounded-full object-cover"
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

            <!-- chat content -->
            <div ref="messageContainerRef" class="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-2">
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

            <!-- send messages bar -->
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