<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import FloatingDateHeader from '@/components/chats/FloatingDateHeader.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import type { MessagesReadPayload } from '@/validation/chat/chatMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { adminService } from '@/api/admin/AdminService'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { createBottomPinController } from '@/utils/chatScroll'
import { getChatTimelineSpacingClass } from '@/utils/chatTimelineSpacing'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const chatMessages = ref<ChatMessageUnion[]>([])
const liveDealStatusOverrides = ref<Record<string, string>>({})
const messageContainerRef = ref<HTMLElement | null>(null)
const bottomPin = createBottomPinController(() => messageContainerRef.value)
const isLoading = ref(false)
const isChatLoading = ref(false)
const isChatPinning = ref(false)
const isLoadingMoreMessages = ref(false)
const errorMessage = ref<string | null>(null)
const store = useUserStore()
const user = ref<UserRead | null>(null)
const newMessage = ref('')
const floatingDateLabel = ref<string | null>(null)
const isFloatingDateVisible = ref(false)
let floatingDateRafId: number | null = null
let floatingDateHideTimerId: number | null = null
let deferredBottomPinTimeoutIds: number[] = []

const currentPage = ref(1)
const totalPages = ref(0)
const perPage = ref(15)
const hasMoreMessages = ref(true)
const topLoadThresholdPx = 8
const bottomAutoScrollThresholdPx = 120
const previousMessageScrollTop = ref(0)
const hasUserScrolledAwayFromTop = ref(false)
const isMobile = ref(false)

// Информация о чате
const currentChatId = ref<string | null>(null)
const currentChatData = ref<{
    username: string
    avatar_url: string | null
    is_active: boolean
    nickname_style_id?: string | null
} | null>(null)

type ChatParticipantData = {
    id: string
    username: string
    avatar_url: string | null
    is_active: boolean
    nickname_style_id?: string | null
}

type ChatParticipantsData = {
    id: string
    buyer: ChatParticipantData | null
    seller: ChatParticipantData | null
    support_user: ChatParticipantData | null
}

const chatParticipants = ref<ChatParticipantsData | null>(null)

function getPrimaryChatParticipant() {
    return chatParticipants.value?.buyer
        ?? chatParticipants.value?.seller
        ?? chatParticipants.value?.support_user
        ?? null
}

function resolveSenderDisplayName(senderId: string): string {
    const participants = chatParticipants.value
    const matchedParticipant = [
        participants?.buyer,
        participants?.seller,
        participants?.support_user,
    ].find(participant => participant?.id === senderId)

    if (matchedParticipant?.username) {
        return matchedParticipant.username
    }

    if (senderId === user.value?.id) {
        return user.value?.username || t('common.admin')
    }

    return getPrimaryChatParticipant()?.username || currentChatData.value?.username || t('common.user')
}

const senderLabels = computed<Record<string, string>>(() => {
    const labels: Record<string, string> = {}
    if (chatParticipants.value?.buyer) labels[chatParticipants.value.buyer.id] = chatParticipants.value.buyer.username
    if (chatParticipants.value?.seller) labels[chatParticipants.value.seller.id] = chatParticipants.value.seller.username
    if (chatParticipants.value?.support_user) labels[chatParticipants.value.support_user.id] = chatParticipants.value.support_user.username

    for (const message of chatMessages.value) {
        if ('sender_id' in message && !labels[message.sender_id]) {
            labels[message.sender_id] = resolveSenderDisplayName(message.sender_id)
        }
    }

    return labels
})
const senderRoles = computed<Record<string, 'buyer' | 'seller' | 'admin'>>(() => {
    const roles: Record<string, 'buyer' | 'seller' | 'admin'> = {}
    if (chatParticipants.value?.buyer) roles[chatParticipants.value.buyer.id] = 'buyer'
    if (chatParticipants.value?.seller) roles[chatParticipants.value.seller.id] = 'seller'
    if (chatParticipants.value?.support_user) roles[chatParticipants.value.support_user.id] = 'admin'
    return roles
})

type PriceOfferChatMessage = Extract<ChatMessageUnion, { message_type: 'price_offer_message' }>

type ChatTimelineItem = {
    message: ChatMessageUnion
    index: number
    dateKey: string | null
    dateLabel: string | null
    showDateDivider: boolean
    spacingClass: string
}

const msPerDay = 24 * 60 * 60 * 1000

function getMessageTimestamp(message: ChatMessageUnion): number {
    const createdAt = message.created_at
    if (!createdAt) return 0
    const timestamp = new Date(createdAt).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
}

function normalizeMessagesChronological(messages: ChatMessageUnion[]): ChatMessageUnion[] {
    return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))
}

function isDealStatusUpdateMessage(
    message: ChatMessageUnion,
): message is Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }> {
    return message.message_type === 'update_deal_status_message'
}

function mergePriceOfferTimelineMessage(
    firstMessage: PriceOfferChatMessage,
    latestMessage: PriceOfferChatMessage,
): PriceOfferChatMessage {
    return {
        ...firstMessage,
        ...latestMessage,
        id: firstMessage.id,
        created_at: firstMessage.created_at,
        offer_message: latestMessage.offer_message ?? firstMessage.offer_message,
    }
}

function normalizeTimelineServerMessages(messages: ChatMessageUnion[]): ChatMessageUnion[] {
    const normalizedMessages: ChatMessageUnion[] = []
    const priceOfferIndexById = new Map<string, number>()

    for (const message of messages) {
        if (isDealStatusUpdateMessage(message)) {
            continue
        }

        if (message.message_type !== 'price_offer_message') {
            normalizedMessages.push(message)
            continue
        }

        const existingIndex = priceOfferIndexById.get(message.offer_id)
        if (existingIndex === undefined) {
            priceOfferIndexById.set(message.offer_id, normalizedMessages.length)
            normalizedMessages.push(message)
            continue
        }

        const existingMessage = normalizedMessages[existingIndex]
        if (!existingMessage || existingMessage.message_type !== 'price_offer_message') {
            priceOfferIndexById.set(message.offer_id, normalizedMessages.length)
            normalizedMessages.push(message)
            continue
        }

        normalizedMessages[existingIndex] = mergePriceOfferTimelineMessage(existingMessage, message)
    }

    return normalizedMessages
}

function toLocalDayStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function parseMessageDateKey(message: ChatMessageUnion): string | null {
    const parsed = new Date(message.created_at)
    if (Number.isNaN(parsed.getTime())) return null

    const messageDayStart = toLocalDayStart(parsed)
    const todayStart = toLocalDayStart(new Date())

    if (messageDayStart.getTime() > todayStart.getTime()) return null
    return toDateKey(messageDayStart)
}

function formatDateLabelByKey(dateKey: string): string | null {
    const [yearStr, monthStr, dayStr] = dateKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const day = Number(dayStr)
    if (!year || !month || !day) return null

    const date = new Date(year, month - 1, day)
    if (Number.isNaN(date.getTime())) return null

    const todayStart = toLocalDayStart(new Date())
    const diffDays = Math.round((todayStart.getTime() - date.getTime()) / msPerDay)
    const localeCode = locale.value.startsWith('ru') ? 'ru-RU' : 'en-US'

    if (diffDays === 0) return capitalizeDateLabel(t('pages.chats.today'))
    if (diffDays === 1) return capitalizeDateLabel(t('pages.chats.yesterday'))
    if (diffDays < 0) return null

    const formatted = new Intl.DateTimeFormat(localeCode, { day: 'numeric', month: 'long' }).format(date)
    return capitalizeDateLabel(formatted)
}

function capitalizeDateLabel(label: string): string {
    const localeCode = locale.value.startsWith('ru') ? 'ru-RU' : 'en-US'

    return label
        .split(' ')
        .map((token) => {
            const firstLetterIndex = token.search(/[A-Za-zА-Яа-яЁё]/)
            if (firstLetterIndex === -1) return token

            const prefix = token.slice(0, firstLetterIndex)
            const first = token.charAt(firstLetterIndex).toLocaleUpperCase(localeCode)
            const rest = token.slice(firstLetterIndex + 1)
            return `${prefix}${first}${rest}`
        })
        .join(' ')
}

const normalizedTimelineMessages = computed<ChatMessageUnion[]>(() => (
    normalizeTimelineServerMessages(chatMessages.value)
))

const dealStatusOverrides = computed<Record<string, string>>(() => {
    const statuses: Record<string, string> = {}

    for (const message of chatMessages.value) {
        if (message.message_type === 'purchase_message') {
            statuses[message.deal_id] = statuses[message.deal_id] ?? message.deal_status
        }
    }

    return {
        ...statuses,
        ...liveDealStatusOverrides.value,
    }
})

const reviewedDealIds = computed<string[]>(() => {
    const ids = new Set<string>()

    for (const message of chatMessages.value) {
        if (message.message_type === 'review_message') {
            ids.add(message.review.deal_id)
        }
    }

    return Array.from(ids)
})

const chatTimelineItems = computed<ChatTimelineItem[]>(() => {
    let previousDateKey: string | null = null

    return normalizedTimelineMessages.value.map((message, index) => {
        const dateKey = parseMessageDateKey(message)
        const dateLabel = dateKey ? formatDateLabelByKey(dateKey) : null
        const showDateDivider = Boolean(dateLabel && dateKey !== previousDateKey)
        previousDateKey = dateKey

        return {
            message,
            index,
            dateKey,
            dateLabel,
            showDateDivider,
            spacingClass: getChatTimelineSpacingClass(normalizedTimelineMessages.value, index),
        }
    })
})

function updateFloatingDateLabel() {
    const container = messageContainerRef.value
    if (
        !container
        || !currentChatId.value
        || isChatLoading.value
        || isChatPinning.value
        || chatTimelineItems.value.length === 0
    ) {
        floatingDateLabel.value = null
        return
    }

    const messageNodes = container.querySelectorAll<HTMLElement>('[data-chat-message-index]')
    if (!messageNodes.length) {
        floatingDateLabel.value = null
        return
    }

    const containerTop = container.getBoundingClientRect().top
    let activeIndex: number | null = null
    let activeNode: HTMLElement | null = null

    for (let i = 0; i < messageNodes.length; i++) {
        const node = messageNodes[i]
        if (!node) continue
        const rect = node.getBoundingClientRect()
        if (rect.bottom > containerTop + 1) {
            const index = Number(node.dataset.chatMessageIndex)
            if (Number.isFinite(index)) {
                activeIndex = index
                activeNode = node
            }
            break
        }
    }

    if (activeIndex === null) {
        const lastNode = messageNodes[messageNodes.length - 1]
        const lastIndex = Number(lastNode?.dataset.chatMessageIndex)
        if (Number.isFinite(lastIndex)) {
            activeIndex = lastIndex
            activeNode = lastNode ?? null
        }
    }

    const activeItem = activeIndex !== null ? chatTimelineItems.value[activeIndex] : null
    if (!activeItem?.dateLabel) {
        floatingDateLabel.value = null
        return
    }

    // Prevent overlap with the inline date divider when it is already visible at the top.
    if (activeNode && activeItem.showDateDivider) {
        const activeNodeTop = activeNode.getBoundingClientRect().top
        const isDividerVisibleNearTop = activeNodeTop <= containerTop + 44
        if (isDividerVisibleNearTop) {
            floatingDateLabel.value = null
            return
        }
    }

    floatingDateLabel.value = activeItem.dateLabel
}

function scheduleFloatingDateLabelUpdate() {
    if (floatingDateRafId !== null) return
    floatingDateRafId = requestAnimationFrame(() => {
        floatingDateRafId = null
        updateFloatingDateLabel()
    })
}

function showFloatingDateTemporarily() {
    if (!currentChatId.value || chatTimelineItems.value.length === 0) return
    isFloatingDateVisible.value = true

    if (floatingDateHideTimerId !== null) {
        clearTimeout(floatingDateHideTimerId)
    }
    floatingDateHideTimerId = window.setTimeout(() => {
        isFloatingDateVisible.value = false
        floatingDateHideTimerId = null
    }, 900)
}

function resolveCurrentChatData(participants: ChatParticipantsData) {
    const meId = user.value?.id ?? null
    const buyer = participants.buyer
    const seller = participants.seller
    const supportUser = participants.support_user

    if (meId && supportUser?.id === meId) {
        if (buyer) return buyer
        if (seller) return seller
    }

    if (meId && buyer?.id === meId) {
        if (supportUser) return supportUser
        if (seller) return seller
    }

    if (meId && seller?.id === meId) {
        if (supportUser) return supportUser
        if (buyer) return buyer
    }

    if (buyer && seller) {
        return {
            id: '',
            username: `${buyer.username} / ${seller.username}`,
            avatar_url: null,
            is_active: buyer.is_active || seller.is_active,
            nickname_style_id: buyer.nickname_style_id ?? seller.nickname_style_id ?? null,
        }
    }

    return buyer || seller || supportUser
}

function checkMobile() {
    isMobile.value = window.innerWidth < 768
}

function clearDeferredBottomPinTimers() {
    for (const timeoutId of deferredBottomPinTimeoutIds) {
        clearTimeout(timeoutId)
    }
    deferredBottomPinTimeoutIds = []
}

function syncScrollStateFromContainer() {
    const container = messageContainerRef.value
    if (!container) return
    previousMessageScrollTop.value = container.scrollTop
    hasUserScrolledAwayFromTop.value = container.scrollTop > topLoadThresholdPx
}

function scheduleDeferredBottomPin(chatId: string) {
    clearDeferredBottomPinTimers()

    const delays = [120, 260, 420, 680, 960]
    for (const delay of delays) {
        const timeoutId = window.setTimeout(async () => {
            if (currentChatId.value !== chatId) return
            await nextTick()
            bottomPin.scrollNow()
            syncScrollStateFromContainer()
            scheduleFloatingDateLabelUpdate()
        }, delay)

        deferredBottomPinTimeoutIds.push(timeoutId)
    }
}


let unsubscribeNewMessage: (() => void) | null = null
let unsubscribeDealStatusUpdate: (() => void) | null = null
let unsubscribeMessagesRead: (() => void) | null = null

function applyMessagesReadUpdate(update: MessagesReadPayload) {
    if (update.chat_id !== currentChatId.value || update.message_ids.length === 0) {
        return
    }

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

onMounted(async () => {
    checkMobile()
    window.addEventListener('resize', checkMobile)

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
                    const shouldStickToBottom = isNearBottom()
                    chatMessages.value.push(message)
                    nextTick(() => {
                        if (shouldStickToBottom) {
                            void bottomPin.pinFor(320)
                        }
                    })
                }
            }
        })
        unsubscribeDealStatusUpdate = chatsService.onDealStatusUpdate(message => {
            if (currentChatId.value !== message.chat_room_id) return
            liveDealStatusOverrides.value = {
                ...liveDealStatusOverrides.value,
                [message.deal_id]: message.new_status,
            }
        })
        unsubscribeMessagesRead = chatsService.onMessagesRead(applyMessagesReadUpdate)

        const chatId = route.params.chatId as string
        if (chatId) {
            await loadChatMessages(chatId, { settleToBottomAfterRouteOpen: true })
        }
    } catch {
        errorMessage.value = t('pages.chats.errorLoadingChats')
    } finally {
        isLoading.value = false
    }
})

onUnmounted(() => {
    unsubscribeNewMessage?.()
    unsubscribeDealStatusUpdate?.()
    unsubscribeMessagesRead?.()
    clearDeferredBottomPinTimers()
    bottomPin.stop()
    if (floatingDateRafId !== null) {
        cancelAnimationFrame(floatingDateRafId)
        floatingDateRafId = null
    }
    if (floatingDateHideTimerId !== null) {
        clearTimeout(floatingDateHideTimerId)
        floatingDateHideTimerId = null
    }
    window.removeEventListener('resize', checkMobile)
})

watch(currentChatId, () => {
    floatingDateLabel.value = null
    isFloatingDateVisible.value = false
    liveDealStatusOverrides.value = {}
    chatParticipants.value = null
    clearDeferredBottomPinTimers()
    if (floatingDateHideTimerId !== null) {
        clearTimeout(floatingDateHideTimerId)
        floatingDateHideTimerId = null
    }
})

watch(
    () => route.params.chatId,
    async (chatIdParam) => {
        const chatId = typeof chatIdParam === 'string' ? chatIdParam : null
        if (!chatId) return
        if (currentChatId.value === chatId) return
        if (isLoading.value) return

        await loadChatMessages(chatId, { settleToBottomAfterRouteOpen: true })
    }
)

watch(
    () => [
        chatTimelineItems.value.length,
        currentChatId.value,
        locale.value,
        isChatLoading.value,
        isChatPinning.value,
    ],
    () => {
        void nextTick(() => {
            scheduleFloatingDateLabelUpdate()
        })
    },
    { flush: 'post' }
)

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
    scheduleFloatingDateLabelUpdate()
    showFloatingDateTemporarily()
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
        chatMessages.value.unshift(...normalizeMessagesChronological(response.messages))
        currentPage.value++
        totalPages.value = response.totalPages
        hasMoreMessages.value = currentPage.value < totalPages.value
        await nextTick()
        if (el) {
            el.scrollTop = el.scrollHeight - oldHeight
            previousMessageScrollTop.value = el.scrollTop
        }
        scheduleFloatingDateLabelUpdate()
    } else {
        hasMoreMessages.value = false
    }

    isLoadingMoreMessages.value = false
}

async function loadChatMessages(
    chatId: string,
    options: { settleToBottomAfterRouteOpen?: boolean } = {},
) {
    clearDeferredBottomPinTimers()
    isLoading.value = true
    isChatLoading.value = true
    isChatPinning.value = false
    let shouldScrollToBottom = false

    try {
        hasUserScrolledAwayFromTop.value = false
        previousMessageScrollTop.value = 0
        chatMessages.value = []
        liveDealStatusOverrides.value = {}
        currentPage.value = 1
        hasMoreMessages.value = true
        currentChatData.value = null
        chatParticipants.value = null

        await chatsService.joinChat(chatId)
        currentChatId.value = chatId

        chatParticipants.value = await adminService.getChatParticipants(chatId)
        if (chatParticipants.value) {
            const resolved = resolveCurrentChatData(chatParticipants.value)
            if (resolved) {
                currentChatData.value = {
                    username: resolved.username,
                    avatar_url: resolved.avatar_url,
                    is_active: resolved.is_active,
                    nickname_style_id: resolved.nickname_style_id ?? null,
                }
            }
        }
        if (!currentChatData.value) {
            currentChatData.value = {
                username: t('common.user'),
                avatar_url: null,
                is_active: false,
                nickname_style_id: null,
            }
        }

        const response = await chatsService.getChatMessages(chatId, 1, perPage.value)
        chatMessages.value = normalizeMessagesChronological(response.messages)
        totalPages.value = response.totalPages
        hasMoreMessages.value = 1 < totalPages.value
        scheduleFloatingDateLabelUpdate()

        shouldScrollToBottom = true
    } finally {
        isLoading.value = false
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
                scheduleFloatingDateLabelUpdate()
                if (options.settleToBottomAfterRouteOpen) {
                    scheduleDeferredBottomPin(chatId)
                }
            } finally {
                isChatPinning.value = false
            }
        }
    }
}

async function sendMessage(payload: { files: File[] }) {
    if (!currentChatId.value) return

    const text = newMessage.value.trim()
    const files = payload.files ?? []
    if (!text && files.length === 0) return

    let hasSentAnyMessage = false

    if (text) {
        const textResult = await chatsService.sendMessage(
            text,
            currentChatId.value,
            { isAdminPanelMessage: true },
        )
        if (!textResult.success) return

        if (textResult.message && !chatMessages.value.some(m => m.id === textResult.message?.id)) {
            chatMessages.value.push(textResult.message)
        }

        newMessage.value = ''
        hasSentAnyMessage = true
    }

    if (files.length > 0) {
        const imagesResult = await chatsService.sendImages(currentChatId.value, files)
        if (!imagesResult.success) return

        hasSentAnyMessage = true
    }

    if (hasSentAnyMessage) {
        nextTick(() => {
            void bottomPin.pinFor(320)
        })
    }
}
</script>

<template>
    <div class="h-full w-full flex flex-col md:pt-6">
        <div v-if="isLoading" class="flex flex-1 items-center justify-center text-[var(--text-body)]">
            <Loader />
        </div>

        <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-[var(--text-danger)]">
            {{ errorMessage }}
        </div>

        <div v-else class="w-full flex flex-1 overflow-hidden">
            <div
                class="flex flex-1 min-h-0 transition-all duration-300"
                :class="isMobile
                    ? 'fixed inset-x-0 bottom-0 top-14 z-10 w-full bg-background'
                    : 'w-full flex-1 min-w-0 overflow-hidden rounded-3xl border border-[rgb(var(--palette-dark-400))]'"
            >
                <div
                    class="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 md:rounded-xl"
                >
                    <div class="flex w-full min-w-0 flex-grow flex-col overflow-hidden">
                        <div v-if="currentChatData"
                            class="sticky top-0 z-10 mx-1 flex items-center gap-2 bg-background px-2 py-1.5 lg:mx-2 lg:border-b lg:border-[rgb(var(--palette-dark-700))] lg:px-3 lg:py-3">
                            <button class="flex h-7 w-7 flex-shrink-0 items-center justify-center" @click="router.back()">
                                <ArrowLeft />
                            </button>
                            <div class="flex w-full min-w-0 items-center gap-3 flex-1">
                                <div class="h-7 w-7 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                                    <UserAvatar
                                        :avatar-url="currentChatData.avatar_url"
                                        :alt="currentChatData.username"
                                        class="h-7 w-7 lg:h-10 lg:w-10 border-2 border-[rgb(var(--palette-dark-600))] rounded-full object-cover"
                                    />
                                </div>
                                <div class="flex min-w-0 flex-col justify-center">
                                    <div class="w-full min-w-0 truncate">
                                        <StyledUsername
                                            :username="currentChatData.username"
                                            :style-id="currentChatData.nickname_style_id ?? 'default'"
                                            class="text-base font-semibold leading-tight lg:text-lg"
                                        />
                                    </div>
                                    <p v-if="currentChatData.is_active" class="text-xs text-[var(--text-success-strong)]">
                                        {{ $t('common.online') }}
                                    </p>
                                    <p v-else class="text-xs text-[var(--text-meta)]">
                                        {{ $t('common.offline') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
                            <FloatingDateHeader :label="isFloatingDateVisible ? floatingDateLabel : null" />
                            <div
                                ref="messageContainerRef"
                                class="no-scrollbar flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain pb-2"
                                @scroll="handleScroll"
                                @wheel.passive="cancelChatPinning"
                                @touchstart.passive="cancelChatPinning"
                                @mousedown="cancelChatPinning"
                            >
                                <div v-if="isChatLoading" class="flex h-full w-full items-center justify-center">
                                    <Loader />
                                </div>

                                <template v-else>
                                    <div :class="isChatPinning ? 'h-full opacity-0 pointer-events-none' : 'h-full opacity-100'">
                                        <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                                            <Loader size="sm" />
                                        </div>

                                        <div v-if="chatTimelineItems.length > 0" class="flex min-w-0 flex-1 flex-col justify-start">
                                            <div class="flex min-w-0 flex-col pb-18">
                                                <template v-for="item in chatTimelineItems" :key="item.message.id">
                                                    <div v-if="item.showDateDivider && item.dateLabel" class="flex justify-center py-2">
                                                        <span class="rounded-full border border-[rgb(var(--palette-dark-600)/0.7)] bg-[rgb(var(--palette-dark-900)/0.7)] px-3 py-1 text-xs font-medium text-mainText/90">
                                                            {{ item.dateLabel }}
                                                        </span>
                                                    </div>

                                                    <div
                                                        :class="item.spacingClass"
                                                        :data-chat-message-index="item.index"
                                                        :data-chat-date-key="item.dateKey ?? ''"
                                                    >
                                                        <ChatMessage
                                                            :message="item.message"
                                                            :user="user"
                                                            :showAdminBadge="true"
                                                            :sender-labels="senderLabels"
                                                            :sender-roles="senderRoles"
                                                            :force-show-sender="true"
                                                            :deal-status-overrides="dealStatusOverrides"
                                                            :reviewed-deal-ids="reviewedDealIds"
                                                        />
                                                    </div>
                                                </template>
                                            </div>
                                        </div>

                                        <div v-else-if="currentChatId != null && chatMessages.length === 0"
                                            class="h-full w-full flex items-center justify-center">
                                            <p class="text-[var(--text-muted)] font-light">{{ $t("pages.chats.emptyMessages") }}</p>
                                        </div>

                                        <div v-else class="h-full w-full flex items-center justify-center">
                                            <p class="text-[var(--text-muted)] font-light">{{ $t('pages.chats.selectChat') }}</p>
                                        </div>
                                    </div>
                                </template>

                                <div
                                    v-if="currentChatId"
                                    aria-hidden="true"
                                    class="h-[120px] w-full flex-none md:h-[108px]"
                                />
                            </div>

                            <div
                                v-if="currentChatId"
                                class="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-[var(--transparent)] px-1 pb-1 pt-0 md:pb-2"
                            >
                                <div class="pointer-events-auto">
                                    <SendMessageBar
                                        v-model:newMessage="newMessage"
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
