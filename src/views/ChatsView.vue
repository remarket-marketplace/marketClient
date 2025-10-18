<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatMessage from '@/components/ChatMessage.vue'
import { useUserStore } from '@/stores/user'
import type { ChatContentUnion } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { Icon } from '@iconify/vue'
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'

const { t } = useI18n()
const API_HOST = import.meta.env.VITE_API_HOST

const chats = ref<any[]>([])
const chatMessages = ref<ChatContentUnion[]>([])
const selectedChatId = ref<string | null>(null)
const newMessage = ref('')
const messageContainerRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isMobile = ref(false)
const mobileMode = ref<'chats' | 'chat'>('chats')
const store = useUserStore()
const user = ref<UserRead | null>()

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

    // Инициализируем подключение к сокету без присоединения к комнате
    await chatsService.connectChat()
    console.warn('Chat service connected')

    // Подписываемся на новые сообщения
    chatsService.onNewMessage((message) => {
      console.warn('Received new message:', message)
      console.warn('Current chat:', selectedChatId.value)
      if (selectedChatId.value === message.chat_room_id) {
        const messageExists = chatMessages.value.some(m => m.id === message.id)
        if (!messageExists) {
          chatMessages.value.push(message)
          scrollToBottom() // Вызов прокрутки
        }
      }
    })

    // Загружаем список чатов
    chats.value = await chatsService.getChats()
    console.warn('Chats loaded:', chats.value.length)

    await restoreLastChat() // восстанавливаем последний чат при загрузке
  }
  catch (error) {
    console.error('Error in component mount:', error)
    errorMessage.value = t('chats.errorLoadingChats')
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
    console.warn('Saved chat not found, clearing storage')
    localStorage.removeItem('selectedChatId')
    return
  }

  console.warn('Restoring last opened chat:', savedChatId)
  await loadChatMessages(savedChatId)

  if (window.innerWidth < 768) {
    mobileMode.value = 'chat'
  }
}

function scrollToBottom() {
  // nextTick гарантирует, что сообщение уже добавлено в DOM
  nextTick(() => {
    const el = messageContainerRef.value
    if (el)
      // Прокручиваем контейнер до его полной высоты
      el.scrollTop = el.scrollHeight
  })
}

async function loadChatMessages(chatId: string) {
  try {
    isLoading.value = true
    errorMessage.value = null
    console.warn('Loading chat messages for:', chatId)

    // Подключаемся к комнате чата
    await chatsService.connectChat(chatId)
    console.warn('Connected to chat room:', chatId)

    selectedChatId.value = chatId
    chatMessages.value = await chatsService.getChatMessages(chatId)
    console.warn('Messages loaded:', chatMessages.value.length)

    // сохраняем открытый чат, для сохранения при перезагрузке
    localStorage.setItem('selectedChatId', chatId)

    scrollToBottom()

    if (isMobile.value) {
      mobileMode.value = 'chat'
    }
  }
  catch (e) {
    console.error('Error loading messages:', e)
    if (e instanceof ZodError) {
      errorMessage.value = t('chats.errorDataStructure')
    }
    else {
      errorMessage.value = t('chats.errorLoadingMessages')
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
    console.warn('Sending message to chat:', selectedChatId.value)
    await chatsService.sendMessage(newMessage.value.trim(), selectedChatId.value)
    console.warn('Message sent successfully')

    newMessage.value = ''
  }
  catch (error) {
    console.error('Error in sendMessage:', error)
    errorMessage.value = t('chats.errorSendMessage')
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <div v-if="isLoading" class="flex flex-1 items-center justify-center text-gray-300">
      <div class="h-10 w-10 animate-spin border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ errorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <div
        v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="h-full max-w-sm flex flex-col md:pr-5"
        :class="[
          isMobile && mobileMode === 'chats'
            ? 'absolute inset-0 z-20 w-screen'
            : 'w-3/12',
        ]"
      >
        <div
          class="h-full flex flex-col border-dark-600 p-4 lg:border-1 md:rounded-3xl"
          :class="{
            'pb-20': isMobile && mobileMode === 'chats',
            'pt-16': isMobile && mobileMode === 'chats',
          }"
        >
          <p class="my-4 text-2xl text-white font-semibold">
            {{ $t('chats.title') }}
          </p>

          <div class="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div v-if="chats.length > 0" class="flex flex-col gap-3">
              <div
                v-for="chat in chats"
                :key="chat.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg py-3 transition hover:bg-dark-800/50"
                @click="loadChatMessages(chat.id)"
              >
                <div class="h-12 w-12 flex items-center justify-center">
                  <img
                    v-if="chat.another_user.avatar_url"
                    :src="`${API_HOST}${chat.another_user.avatar_url}`"
                    class="h-12 w-12 border-2 border-dark-600 rounded-full object-cover"
                    :alt="chat.another_user.username"
                  >
                  <div
                    v-else
                    class="h-12 w-12 flex items-center justify-center rounded-full bg-gray-700 text-lg text-white font-bold uppercase"
                  >
                    {{ chat.another_user.username.charAt(0) }}
                  </div>
                </div>
                <div class="flex flex-col truncate">
                  <p class="truncate text-white font-semibold">
                    {{ chat.another_user.username }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else>
              <p class="text-sm text-gray-400 font-light">
                {{ $t('chats.emptyChats') }}
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
          class="flex flex-1 flex-col p-4 md:rounded-xl"
          :class="{
            'pb-20': isMobile && mobileMode === 'chat',
            'pt-16': isMobile && mobileMode === 'chat',
          }"
        >
          <div class="flex flex-grow flex-col gap-3 overflow-y-auto">
            <div v-if="isMobile && mobileMode === 'chat'" class="my-4">
              <button class="text-xl font-bold" @click="backToChats">
                <Icon icon="mdi:arrow-left" class="text-3xl" />
              </button>
            </div>

            <div ref="messageContainerRef" class="no-scrollbar flex flex-1 flex-col overflow-y-auto">
              <div v-if="chatMessages.length > 0" class="flex flex-1 flex-col justify-end">
                <div class="flex flex-col gap-3 pr-2">
                  <ChatMessage
                    v-for="message in chatMessages"
                    :key="message.id"
                    :message="message"
                    :user="user"
                  />
                </div>
              </div>

              <div v-else class="h-full w-full flex items-center justify-center">
                <p>{{ $t("chats.emptyChats") }}</p>
              </div>
            </div>

            <div class="flex flex-none">
              <input
                v-model="newMessage" type="text" class="flex-1 rounded-l-2xl rounded-r-none bg-dark-600 border border-dark-700 p-3 outline-none" :placeholder="$t('chats.messagePlaceholder')"
                @keyup.enter="sendMessage"
              >
              <button class="rounded-l-none rounded-r-2xl bg-blue-500 px-4 text-sm font-bold" @click="sendMessage">
                <p>{{ $t("chats.send") }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hidden {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.scrollbar-hidden::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>