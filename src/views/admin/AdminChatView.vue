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
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

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


let unsubscribeNewMessage: (() => void) | null = null

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

        const dealId = route.params.dealId as string
        if (dealId)
            await loadChatMessages(dealId)
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
})

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

    const response = await chatsService.getChatMessagesByDealId(chatId, 1, perPage.value)
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
    <div class="h-full w-full flex items-center flex-col md:pt-6">
        <div v-if="isLoading" class="flex flex-1 items-center justify-center text-gray-300">
            <Loader />
        </div>

        <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
            {{ errorMessage }}
        </div>

        <div v-else class="w-full flex justify-center flex-1 overflow-hidden md:w-3/4">
            <div class="flex flex-1 w-full">
                <div class="flex flex-1 flex-col px-2 w-full min-h-0">
                    <div v-if="currentChat" class="flex items-center gap-2 px-2 py-2">
                        <p class="text-lg font-semibold">
                            {{ currentChat.another_user.username }}
                        </p>
                    </div>

                    <div ref="messageContainerRef" class="no-scrollbar flex flex-1 flex-col overflow-y-auto"
                        @scroll="handleScroll">
                        <ChatMessage v-for="message in chatMessages" :key="message.id" :message="message"
                            :user="user" />
                    </div>

                    <SendMessageBar v-if="selectedChatId" v-model:newMessage="newMessage" @sendMessage="sendMessage" />
                </div>
            </div>
        </div>
    </div>
</template>
