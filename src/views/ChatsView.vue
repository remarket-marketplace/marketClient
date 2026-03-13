<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import type { MessagesReadPayload } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Headphones } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { createBottomPinController } from '@/utils/chatScroll'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const chatStore = useChatStore()
const chats = ref<ChatListItem[]>([])
const chatMessages = ref<ChatMessageUnion[]>([])
const selectedChatId = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const bottomPin = createBottomPinController(() => messageContainerRef.value)
const isPageLoading = ref(false)
const isChatLoading = ref(false)
const isChatPinning = ref(false)
const isLoadingMoreMessages = ref(false)
const pageErrorMessage = ref<string | null>(null)
const sendErrorMessage = ref<string | null>(null)
const isMobile = ref(false)
const mobileMode = ref<'chats' | 'chat'>('chats')
const store = useUserStore()
const user = ref<UserRead | null>(null)
const newMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(0)
const perPage = ref(15)
const hasMoreMessages = ref(true)
const totalMessagesInChat = ref(0)
const isMessageLimitLockedByServer = ref(false)
const topLoadThresholdPx = 8
const previousMessageScrollTop = ref(0)
const hasUserScrolledAwayFromTop = ref(false)
const bottomAutoScrollThresholdPx = 120

function getLastMessageTimestamp(chat: ChatListItem): number {
  const createdAt = chat.last_message?.created_at
  if (!createdAt) return 0
  const timestamp = new Date(createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function shouldApplyLastMessage(
  currentMessage?: ChatMessageUnion | null,
  incomingMessage?: ChatMessageUnion | null,
): boolean {
  if (!incomingMessage) return false
  if (!currentMessage) return true

  const currentTs = getMessageTimestamp(currentMessage)
  const incomingTs = getMessageTimestamp(incomingMessage)

  if (incomingTs > currentTs) return true
  if (incomingTs < currentTs) return false
  return incomingMessage.id === currentMessage.id
}

function getMessageTimestamp(message: ChatMessageUnion): number {
  const createdAt = message.created_at
  if (!createdAt) return 0
  const timestamp = new Date(createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const sortedChats = computed(() => {
  return [...chats.value].sort((a, b) => (
    getLastMessageTimestamp(b) - getLastMessageTimestamp(a)
  ))
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

// Проверяем, является ли текущий чат чатом поддержки
const isSupportChat = computed(() => {
  return currentChat.value?.chat_type === 'support_chat'
})

// Показываем админ бейдж только для обычных чатов, не для поддержки
const shouldShowAdminBadge = computed(() => {
  return !isSupportChat.value
})

type TextMessage = Extract<ChatMessageUnion, { message_type: 'text_message' }>
const textMessagesInChat = computed<TextMessage[]>(() =>
  chatMessages.value.filter(
    (message): message is TextMessage => message.message_type === 'text_message'
  )
)

const hasDealSignals = computed(() => {
  const lastMessageType = currentChat.value?.last_message?.message_type
  if (lastMessageType === 'purchase_message' || lastMessageType === 'update_deal_status_message') {
    return true
  }
  return chatMessages.value.some(message =>
    message.message_type === 'purchase_message' || message.message_type === 'update_deal_status_message'
  )
})

const isChatHistoryFullyLoaded = computed(() => {
  if (totalMessagesInChat.value <= 0) return false
  return chatMessages.value.length >= totalMessagesInChat.value
})

const singleSenderWaitState = computed<'sender' | 'recipient' | null>(() => {
  if (!selectedChatId.value || !user.value || isSupportChat.value) return null
  if (hasDealSignals.value) return null
  if (!isChatHistoryFullyLoaded.value) return null

  const textMessages = textMessagesInChat.value
  if (textMessages.length === 0) return null

  // Restriction applies only to simple direct chats with text-only history.
  if (textMessages.length !== chatMessages.value.length) return null

  const uniqueSenders = new Set(textMessages.map(message => message.sender_id))
  if (uniqueSenders.size !== 1) return null

  const [onlySenderId] = Array.from(uniqueSenders)
  if (!onlySenderId) return null
  return onlySenderId === user.value.id ? 'sender' : 'recipient'
})

const hasReplyFromAnotherUser = computed(() => {
  if (!user.value) return false
  return textMessagesInChat.value.some(message => message.sender_id !== user.value?.id)
})

const isSendLocked = computed(() => {
  if (!selectedChatId.value || isSupportChat.value) return false
  if (hasDealSignals.value) return false
  if (singleSenderWaitState.value === 'sender') return true
  return isMessageLimitLockedByServer.value
})

const lockReminderType = computed<'sender' | 'recipient' | null>(() => {
  if (!selectedChatId.value || isSupportChat.value) return null
  if (isSendLocked.value) return 'sender'
  if (singleSenderWaitState.value === 'recipient') return 'recipient'
  return null
})

const lockReminderText = computed(() => {
  if (lockReminderType.value === 'sender') {
    return t('pages.chats.waitReplyReminderSender')
  }
  if (lockReminderType.value === 'recipient') {
    return t('pages.chats.waitReplyReminderRecipient')
  }
  return null
})

const chatParticipantIds = computed<string[]>(() => {
  const participants = new Set<string>()
  if (user.value?.id) {
    participants.add(user.value.id)
  }
  for (const message of chatMessages.value) {
    if ('sender_id' in message) {
      participants.add(message.sender_id)
      continue
    }
    if (message.message_type === 'price_offer_message') {
      participants.add(message.buyer_id)
      participants.add(message.seller_id)
    }
  }
  return Array.from(participants)
})

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

function openChatProfile() {
  if (!currentChat.value || isSupportChat.value) return
  const username = currentChat.value.another_user?.username
  if (!username) return
  router.push({ name: 'profile', params: { username } })
}

function updateUrlChatId(chatId: string | null) {
  router.replace({
    query: {
      ...route.query,
      support: undefined,
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
let unsubscribeMessagesRead: (() => void) | null = null

function applyMessagesReadUpdate(update: MessagesReadPayload) {
  if (update.chat_id === selectedChatId.value && update.message_ids.length > 0) {
    const readIds = new Set(update.message_ids)
    for (const message of chatMessages.value) {
      if (
        (message.message_type === 'text_message' || message.message_type === 'image_message')
        && readIds.has(message.id)
      ) {
        message.is_read = true
      }
    }
  }

  chatStore.markMessagesRead(update.chat_id, update.message_ids)
}

watch(selectedChatId, () => {
  isMessageLimitLockedByServer.value = false
  sendErrorMessage.value = null
})

watch([hasReplyFromAnotherUser, hasDealSignals], ([hasReply, hasDeal]) => {
  if (hasReply || hasDeal) {
    isMessageLimitLockedByServer.value = false
  }
})

watch(
  () => route.query.chatId,
  async (chatIdQuery) => {
    const chatId = typeof chatIdQuery === 'string' ? chatIdQuery : null
    if (!chatId) return
    if (selectedChatId.value === chatId) return
    if (isPageLoading.value) return

    const exists = chats.value.some(chat => chat.id === chatId)
    if (!exists) {
      await loadChats()
    }

    if (chats.value.some(chat => chat.id === chatId)) {
      await loadChatMessages(chatId)
    }
  }
)

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  try {
    isPageLoading.value = true
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
        if (shouldApplyLastMessage(chat.last_message ?? null, update.last_message)) {
          chat.last_message = update.last_message
        }
      }
      if (chat) {
        if (typeof update.unread_count === 'number') {
          chat.unread_count = update.unread_count
        }
      }
      chatStore.updateChatFromSocket(update)
    })

    unsubscribeNewMessage = chatsService.onNewMessage(message => {
      if (selectedChatId.value === message.chat_room_id) {
        if (!chatMessages.value.some(m => m.id === message.id)) {
          const shouldStickToBottom = isNearBottom()
          chatMessages.value.push(message)
          totalMessagesInChat.value = Math.max(
            totalMessagesInChat.value + 1,
            chatMessages.value.length
          )
          nextTick(() => {
            if (shouldStickToBottom) {
              void bottomPin.pinFor(320)
            }
          })
          chatStore.resetUnread(message.chat_room_id)
          chatsService.markChatRead(message.chat_room_id)
        }
      }
    })
    unsubscribeMessagesRead = chatsService.onMessagesRead(applyMessagesReadUpdate)

    await loadChats()

    const chatIdFromQuery = route.query.chatId as string | undefined
    if (chatIdFromQuery) {
      const exists = chats.value.some(c => c.id === chatIdFromQuery)
      if (exists) {
        await loadChatMessages(chatIdFromQuery)
      }
      return
    }

    const supportFromQuery = route.query.support as string | undefined
    if (supportFromQuery === '1' || supportFromQuery === 'true') {
      const supportChat = chats.value.find(chat => chat.chat_type === 'support_chat')
      if (supportChat) {
        await loadChatMessages(supportChat.id)
      }
    }
  } catch {
    pageErrorMessage.value = t('pages.chats.errorLoadingChats')
  } finally {
    isPageLoading.value = false
  }
})

onUnmounted(() => {
  unsubscribeNewMessage?.()
  unsubscribeChatUpdated?.()
  unsubscribeMessagesRead?.()
  bottomPin.stop()
  window.removeEventListener('resize', checkMobile)
})

async function loadChats() {
  chats.value = await chatsService.getChats()
  chatStore.setChats(chats.value)
}

function scrollToBottom() {
  bottomPin.scrollNow()
}

function pinChatToBottom() {
  return bottomPin.pinFor(1200)
}

function isNearBottom() {
  const el = messageContainerRef.value
  if (!el) return true
  const distanceToBottom = el.scrollHeight - el.clientHeight - el.scrollTop
  return distanceToBottom <= bottomAutoScrollThresholdPx
}

function cancelChatPinning() {
  if (!isChatPinning.value) return
  bottomPin.stop()
  isChatPinning.value = false
}

async function handleScroll() {
  const el = messageContainerRef.value
  if (!el || isChatLoading.value || isChatPinning.value || isLoadingMoreMessages.value || !hasMoreMessages.value) return

  const currentScrollTop = el.scrollTop
  if (currentScrollTop > topLoadThresholdPx) {
    hasUserScrolledAwayFromTop.value = true
  }

  const isUserScrollingUp = currentScrollTop < (previousMessageScrollTop.value - 1)
  previousMessageScrollTop.value = currentScrollTop

  if (!hasUserScrolledAwayFromTop.value) return
  if (isUserScrollingUp && currentScrollTop <= topLoadThresholdPx) {
    await loadMoreMessages()
  }
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
  totalMessagesInChat.value = response.total

  if (response.messages.length) {
    chatMessages.value.unshift(...response.messages)
    currentPage.value++
    totalPages.value = response.totalPages
    hasMoreMessages.value = currentPage.value < totalPages.value
    await nextTick()
    if (el) {
      el.scrollTop = el.scrollHeight - oldHeight
      previousMessageScrollTop.value = el.scrollTop
    }
  } else {
    hasMoreMessages.value = false
  }

  isLoadingMoreMessages.value = false
}

async function loadChatMessages(chatId: string) {
  isChatLoading.value = true
  isChatPinning.value = false
  let shouldScrollToBottom = false
  try {
    hasUserScrolledAwayFromTop.value = false
    previousMessageScrollTop.value = 0
    chatMessages.value = []
    currentPage.value = 1
    hasMoreMessages.value = true
    totalMessagesInChat.value = 0
    sendErrorMessage.value = null
    isMessageLimitLockedByServer.value = false

    await chatsService.joinChat(chatId)
    selectedChatId.value = chatId
    chatStore.setActive(chatId)
    updateUrlChatId(chatId)

    const response = await chatsService.getChatMessages(chatId, 1, perPage.value)
    chatMessages.value = response.messages
    totalMessagesInChat.value = response.total
    totalPages.value = response.totalPages
    hasMoreMessages.value = 1 < totalPages.value
    chatStore.resetUnread(chatId)
    void chatsService.markChatRead(chatId)

    if (isMobile.value) mobileMode.value = 'chat'
    shouldScrollToBottom = true
  } finally {
    if (shouldScrollToBottom) {
      isChatPinning.value = true
    }
    isChatLoading.value = false
    if (shouldScrollToBottom) {
      try {
        await nextTick()
        await nextTick()
        await pinChatToBottom()
        await nextTick()
        const container = messageContainerRef.value
        if (container) {
          previousMessageScrollTop.value = container.scrollTop
          hasUserScrolledAwayFromTop.value = container.scrollTop > topLoadThresholdPx
        }
      } finally {
        isChatPinning.value = false
      }
    }
  }
}

async function sendMessage(payload: { files: File[] }) {
  if (!selectedChatId.value || isSendLocked.value) return

  const text = newMessage.value.trim()
  const files = payload.files ?? []
  if (!text && files.length === 0) return

  let hasSentAnyMessage = false

  if (text) {
    const result = await chatsService.sendMessage(
      text,
      selectedChatId.value
    )
    if (!result.success) {
      if (result.errorCode === 'MESSAGE_LIMIT_WAIT_FOR_SELLER_REPLY') {
        isMessageLimitLockedByServer.value = true
        sendErrorMessage.value = null
        return
      }

      sendErrorMessage.value = result.errorCode
        ? t(`errors.${result.errorCode}`)
        : t('errors.SERVER_ERROR')
      return
    }

    hasSentAnyMessage = true
    newMessage.value = ''
  }

  if (files.length > 0) {
    const imagesResult = await chatsService.sendImages(selectedChatId.value, files)
    if (!imagesResult.success) {
      if (imagesResult.errorCode === 'MESSAGE_LIMIT_WAIT_FOR_SELLER_REPLY') {
        isMessageLimitLockedByServer.value = true
        sendErrorMessage.value = null
        return
      }

      sendErrorMessage.value = imagesResult.errorCode
        ? t(`errors.${imagesResult.errorCode}`)
        : t('errors.SERVER_ERROR')
      return
    }

    hasSentAnyMessage = true
  }

  if (hasSentAnyMessage) {
    sendErrorMessage.value = null
    nextTick(() => {
      void bottomPin.pinFor(320)
    })
  }
}
</script>


<template>
  <div class="h-full w-full flex flex-col overflow-x-hidden overscroll-none md:pt-6">
    <div v-if="isPageLoading" class="flex flex-1 items-center justify-center text-gray-300">
      <Loader />
    </div>

    <div v-else-if="pageErrorMessage" class="flex flex-1 items-center justify-center text-red-500">
      {{ pageErrorMessage }}
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

          <div class="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
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
        <div class="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 md:rounded-xl" :class="{
          'pb-16': isMobile && mobileMode === 'chat',
          'pt-16': isMobile && mobileMode === 'chat',
        }">
          <div class="flex w-full min-w-0 flex-grow flex-col overflow-hidden">
            <div v-if="currentChat"
              class="flex items-center gap-2 sticky top-0 bg-background px-2 py-2 lg:py-3 lg:px-3 z-10 lg:border-b border-dark-700">
              <button v-if="isMobile" class="text-xl font-bold flex-shrink-0" @click="backToChats">
                <ArrowLeft />
              </button>
              <button
                v-if="currentChat"
                type="button"
                class="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg transition bg-transparent border-0 p-0"
                :class="isSupportChat ? 'cursor-default' : 'cursor-pointer focus:outline-none'"
                :disabled="isSupportChat"
                @click="openChatProfile"
              >
                <!-- Аватар чата -->
                <div class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                  <!-- Для чата поддержки - иконка на синем фоне -->
                  <div v-if="isSupportChat"
                    class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-blue-500/20 border-2 border-blue-500/30">
                    <Headphones class="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <!-- Для обычного чата - фото или инициалы -->
                  <UserAvatar
                    v-else
                    :avatar-url="chatDisplayAvatarUrl"
                    :alt="chatDisplayName"
                    class="h-8 w-8 lg:h-10 lg:w-10 border-2 border-dark-600 rounded-full object-cover"
                  />
                </div>

                <!-- Информация о чате -->
                <div class="flex min-w-0 flex-col">
                  <!-- Имя чата -->
                  <p v-if="isSupportChat" class="truncate font-semibold text-lg text-blue-500">
                    {{ chatDisplayName }}
                  </p>
                  <div v-else class="w-full min-w-0 truncate">
                    <StyledUsername
                      :username="chatDisplayName"
                      :style-id="currentChat?.another_user.nickname_style_id"
                      class="text-lg font-semibold"
                    />
                  </div>
                  <!-- Статус онлайн -->
                  <p v-if="chatDisplayStatus" class="text-xs text-green-500">
                    {{ $t('common.online') }}
                  </p>
                  <p v-else class="text-xs text-gray-500">
                    {{ $t('common.offline') }}
                  </p>
                </div>
              </button>
            </div>

            <div class="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
              <div ref="messageContainerRef" class="no-scrollbar flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain pb-2"
                @scroll="handleScroll"
                @wheel.passive="cancelChatPinning"
                @touchstart.passive="cancelChatPinning"
                @mousedown="cancelChatPinning">
                <div v-if="isChatLoading" class="flex h-full w-full items-center justify-center">
                  <Loader />
                </div>

                <template v-else>
                  <div :class="isChatPinning ? 'h-full opacity-0 pointer-events-none' : 'h-full opacity-100'">
                    <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                      <Loader size="sm" />
                    </div>

                    <div v-if="chatMessages.length > 0" class="flex min-w-0 flex-1 flex-col justify-start">
                      <div class="flex min-w-0 flex-col gap-3 pt-2 pb-18">
                        <ChatMessage
                          v-for="message in chatMessages"
                          :key="message.id"
                          :message="message"
                          :user="user"
                          :showAdminBadge="shouldShowAdminBadge"
                          :chat-participant-ids="chatParticipantIds"
                        />
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
                </template>

                <div
                  v-if="selectedChatId"
                  aria-hidden="true"
                  class="h-[124px] w-full flex-none md:h-[108px]"
                />
              </div>

              <div
                v-if="selectedChatId"
                class="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-transparent px-1 pb-2 pt-0"
              >
                <div
                  v-if="lockReminderText"
                  class="pointer-events-auto mx-1 mb-2 rounded-xl border px-3 py-2 text-sm"
                  :class="lockReminderType === 'sender'
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-blue-400/40 bg-blue-500/10 text-blue-200'"
                >
                  {{ lockReminderText }}
                </div>
                <div
                  v-if="sendErrorMessage"
                  class="pointer-events-auto mx-1 mb-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                >
                  {{ sendErrorMessage }}
                </div>
                <div class="pointer-events-auto">
                  <SendMessageBar
                    v-model:newMessage="newMessage"
                    :disabled="isSendLocked"
                    @sendMessage="sendMessage"
                  />
                </div>
              </div>

              <div
                v-if="isChatPinning"
                class="absolute inset-0 z-10 flex items-center justify-center bg-background"
              >
                <Loader />
              </div>
            </div>
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
