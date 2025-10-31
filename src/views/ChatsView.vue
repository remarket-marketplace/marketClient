<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { ChatContentUnion } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { Icon } from '@iconify/vue'
import { nextTick, onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'

const { t } = useI18n()

const chats = ref<any[]>([])
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

// Вычисляем текущий активный чат
const currentChat = computed(() => {
  if (!selectedChatId.value) return null
  return chats.value.find(chat => chat.id === selectedChatId.value)
})

// Получаем инициалы для аватарки
const chatUserInitial = computed(() => {
  return currentChat.value?.another_user.username.charAt(0).toUpperCase() || ''
})

const API_HOST = import.meta.env.VITE_API_HOST

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

    chatsService.onNewMessage((message) => {
      if (selectedChatId.value === message.chat_room_id) {
        const messageExists = chatMessages.value.some(m => m.id === message.id)
        if (!messageExists) {
          chatMessages.value.push(message)
          // Прокрутка при получении нового сообщения
          scrollToBottom()
        }
      }
    })

    // Загружаем список чатов
    chats.value = await chatsService.getChats()

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

async function restoreLastChat() {
  const savedChatId = localStorage.getItem('selectedChatId')
  if (!savedChatId)
    return

  // Проверяем, существует ли чат
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
  nextTick(() => {
    const el = messageContainerRef.value
    if (el)
      el.scrollTop = el.scrollHeight
  })
}

async function loadChatMessages(chatId: string) {
  try {
    isLoading.value = true
    errorMessage.value = null

    // Подключаемся к комнате чата
    await chatsService.connectChat(chatId)

    selectedChatId.value = chatId
    chatMessages.value = await chatsService.getChatMessages(chatId)

    // сохраняем открытый чат, для сохранения при перезагрузке
    localStorage.setItem('selectedChatId', chatId)

    await nextTick() 
    scrollToBottom()

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
  if (!newMessage.value.trim() || !selectedChatId.value)
    return

  try {
    await chatsService.sendMessage(newMessage.value.trim(), selectedChatId.value)
    // Очистка инпута после успешной отправки
    newMessage.value = ''
  }
  catch (error) {
    errorMessage.value = t('pages.chats.errorSendMessage')
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col">

    <!-- лоадер -->
    <div v-if="isLoading" class="flex flex-1 items-center justify-center text-gray-300">
      <Loader/>
    </div>

    <!-- ошибки -->
    <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ errorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="h-full lg:max-w-sm flex flex-col md:pr-5"
        :class="[
          isMobile && mobileMode === 'chats'
            ? 'absolute inset-0 z-20 w-screen'
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
            <div v-if="chats.length > 0" class="flex flex-col gap-3">
                <ChatItem
                  v-for="chat in chats"
                  :key="chat.id"
                  :chat="chat"
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
        class="flex flex-1" :class="[
          isMobile && mobileMode === 'chat'
            ? 'absolute inset-0 z-20 h-full w-screen'
            : 'flex-1 w-9/12 border-1 border-dark-400 rounded-xl',
        ]"
      >
        <div
          class="flex flex-1 flex-col px-2 md:rounded-xl"
          :class="{
            'pb-16': isMobile && mobileMode === 'chat',
            'pt-16': isMobile && mobileMode === 'chat',
          }"
        >
          <div class="flex flex-grow flex-col overflow-y-auto lg:pb-2">
            <!-- Шапка чата с кнопкой назад и информацией о пользователе -->
            <div v-if="isMobile && mobileMode === 'chat'" class="flex items-center gap-2 mb-2 px-2">
              <button class="text-xl font-bold flex-shrink-0" @click="backToChats">
                <Icon icon="mdi:arrow-left" class="text-3xl" />
              </button>
              
              <!-- Аватар и имя пользователя -->
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
                  <!-- Можно добавить статус онлайн, если есть в данных -->
                  <p v-if="currentChat?.another_user.is_online" class="text-xs text-green-500">
                    онлайн
                  </p>
                </div>
              </div>
            </div>

            <!-- main chat content -->
            <div ref="messageContainerRef" class="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-2">
              <div v-if="chatMessages.length > 0" class="flex flex-1 flex-col justify-start">
                <div class="flex flex-col gap-3 pr-2">
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
</style>