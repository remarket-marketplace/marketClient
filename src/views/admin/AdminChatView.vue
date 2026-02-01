<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { adminService } from '@/api/admin/AdminService'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const API_HOST = import.meta.env.VITE_API_HOST

const chatMessages = ref<ChatMessageUnion[]>([])
const messageContainerRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const isLoadingMoreMessages = ref(false)
const errorMessage = ref<string | null>(null)
const store = useUserStore()
const user = ref<UserRead | null>(null)
const newMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(0)
const perPage = ref(30)
const hasMoreMessages = ref(true)

// Информация о чате
const currentChatId = ref<string | null>(null)
const currentChatData = ref<{ username: string; avatar_url: string | null; is_active: boolean } | null>(null)
const chatParticipants = ref<{ buyer?: any; seller?: any; support_user?: any } | null>(null)
const senderLabels = computed<Record<string, string>>(() => {
    const labels: Record<string, string> = {}
    if (chatParticipants.value?.buyer) labels[chatParticipants.value.buyer.id] = `${chatParticipants.value.buyer.username} (${t('common.buyer')})`
    if (chatParticipants.value?.seller) labels[chatParticipants.value.seller.id] = `${chatParticipants.value.seller.username} (${t('common.seller')})`
    if (chatParticipants.value?.support_user) labels[chatParticipants.value.support_user.id] = `${chatParticipants.value.support_user.username} (${t('common.admin')})`
    return labels
})
const senderRoles = computed<Record<string, 'buyer' | 'seller' | 'admin'>>(() => {
    const roles: Record<string, 'buyer' | 'seller' | 'admin'> = {}
    if (chatParticipants.value?.buyer) roles[chatParticipants.value.buyer.id] = 'buyer'
    if (chatParticipants.value?.seller) roles[chatParticipants.value.seller.id] = 'seller'
    if (chatParticipants.value?.support_user) roles[chatParticipants.value.support_user.id] = 'admin'
    return roles
})

const chatUserInitial = computed(() =>
    currentChatData.value?.username.charAt(0).toUpperCase() || ''
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
            if (currentChatId.value === message.chat_room_id) {
                if (!chatMessages.value.some(m => m.id === message.id)) {
                    chatMessages.value.push(message)
                    nextTick(scrollToBottom)
                }
            }
        })

        const chatId = route.params.chatId as string
        if (chatId) {
            await loadChatMessages(chatId)
        }
    } catch {
        errorMessage.value = t('pages.chats.errorLoadingChats')
    } finally {
        isLoading.value = false
    }
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
    if (!currentChatId.value) return

    isLoadingMoreMessages.value = true
    const el = messageContainerRef.value
    const oldHeight = el?.scrollHeight || 0

    const response = await chatsService.getChatMessages(
        currentChatId.value,
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
    currentChatId.value = chatId

    chatParticipants.value = await adminService.getChatParticipants(chatId)
    if (chatParticipants.value) {
        const buyer = chatParticipants.value.buyer?.username
        const seller = chatParticipants.value.seller?.username
        if (buyer && seller) {
            currentChatData.value = {
                username: `${buyer} / ${seller}`,
                avatar_url: null,
                is_active: false
            }
        }
    }

    // Получаем информацию о чате из сообщений
    const response = await chatsService.getChatMessages(chatId, 1, perPage.value)
    chatMessages.value = response.messages
    totalPages.value = response.totalPages
    hasMoreMessages.value = 1 < totalPages.value

    // Пытаемся получить информацию о чате из первого сообщения
    if (response.messages && response.messages.length > 0) {
        const firstMessage = response.messages[0]
        if (firstMessage && 'sender_id' in firstMessage) {
            // Установим временное имя, которое может быть заменено позже
            currentChatData.value = {
                username: 'User',
                avatar_url: null,
                is_active: false
            }
        }
    }

    await nextTick()
    scrollToBottom()

    isLoading.value = false
}

async function sendMessage() {
    if (!newMessage.value.trim() || !currentChatId.value) return
    const success = await chatsService.sendMessage(
        newMessage.value.trim(),
        currentChatId.value
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
            <div class="h-full w-full flex flex-col min-h-0 lg:pb-4">
                <div class="flex items-center gap-3 sticky top-0 bg-background px-4 py-2 lg:py-3 lg:px-6 z-10 flex-none rounded-t-3xl md:rounded-3xl">
                    <button class="text-xl font-bold flex-shrink-0" @click="router.back()">
                        <ArrowLeft />
                    </button>
                    <div v-if="currentChatData" class="flex items-center gap-3 flex-1">
                        <div class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                            <img v-if="currentChatData.avatar_url"
                                :src="`${API_HOST}${currentChatData.avatar_url}`"
                                class="h-8 w-8 lg:h-10 lg:w-10 border-2 border-dark-600 rounded-full object-cover"
                                :alt="currentChatData.username">
                            <div v-else
                                class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-gray-700 text-mainText font-bold uppercase">
                                {{ chatUserInitial }}
                            </div>
                        </div>
                        <div class="flex flex-col truncate flex-1">
                            <p class="truncate text-mainText font-semibold text-lg">
                                {{ currentChatData.username }}
                            </p>
                            <p v-if="currentChatData.is_active" class="text-xs text-green-500">
                                {{ $t('common.online') }}
                            </p>
                            <p v-else class="text-xs text-gray-500">
                                {{ $t('common.offline') }}
                            </p>
                        </div>
                    </div>
                </div>

                <div ref="messageContainerRef" class="flex flex-1 flex-col overflow-y-auto pb-2 px-2 lg:px-4"
                    @scroll="handleScroll">
                    <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                        <Loader size="sm" />
                    </div>

                    <div v-if="chatMessages.length > 0" class="flex flex-1 flex-col justify-start">
                        <div class="flex flex-col gap-3 py-4">
                            <ChatMessage
                              v-for="message in chatMessages"
                              :key="message.id"
                              :message="message"
                              :user="user"
                              :showAdminBadge="true"
                              :sender-labels="senderLabels"
                              :sender-roles="senderRoles"
                              :force-show-sender="true"
                            />
                        </div>
                    </div>

                    <div v-else-if="currentChatId != null && chatMessages.length === 0"
                        class="h-full w-full flex items-center justify-center">
                        <p class="text-gray-400 font-light">{{ $t("pages.chats.emptyMessages") }}</p>
                    </div>

                    <div v-else
                        class="h-full w-full flex items-center justify-center">
                        <p class="text-gray-400 font-light">{{ $t('pages.chats.selectChat') }}</p>
                    </div>
                </div>

                <SendMessageBar v-if="currentChatId" v-model:newMessage="newMessage" @sendMessage="sendMessage" />
            </div>
        </div>
    </div>
</template>
