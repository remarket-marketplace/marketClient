<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import FloatingDateHeader from '@/components/chats/FloatingDateHeader.vue'
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
import { adminService } from '@/api/admin/AdminService'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { createBottomPinController } from '@/utils/chatScroll'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

// Состояние списка чатов
const chats = ref<ChatListItem[]>([])
const chatsCurrentPage = ref(1)
const chatsTotalPages = ref(1)
const chatsPerPage = ref(20)
const isLoadingChats = ref(false)
const isLoadingMoreChats = ref(false)
const hasMoreChats = ref(true)

// Состояние сообщений
const chatMessages = ref<ChatMessageUnion[]>([])
const selectedChatId = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const bottomPin = createBottomPinController(() => messageContainerRef.value)
const chatsContainerRef = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const isChatLoading = ref(false)
const isChatPinning = ref(false)
const isLoadingMoreMessages = ref(false)
const errorMessage = ref<string | null>(null)
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
const mobileMode = ref<'chats' | 'chat'>(typeof route.query.chatId === 'string' ? 'chat' : 'chats')
const store = useUserStore()
const user = ref<UserRead | null>(null)
const newMessage = ref('')
const floatingDateLabel = ref<string | null>(null)
const floatingDateOpacity = ref(1)
const floatingDateOffsetY = ref(0)
const isFloatingDateVisible = ref(false)
let floatingDateRafId: number | null = null
let floatingDateHideTimerId: number | null = null
let deferredBottomPinTimeoutIds: number[] = []

const messagesCurrentPage = ref(1)
const messagesTotalPages = ref(0)
const messagesPerPage = ref(15)
const hasMoreMessages = ref(true)
const topLoadThresholdPx = 8
const bottomAutoScrollThresholdPx = 120
const previousMessageScrollTop = ref(0)
const hasUserScrolledAwayFromTop = ref(false)
const floatingDateTopOffsetPx = 8
const floatingDateMergeStartDistancePx = 56
const floatingDateMergeEndDistancePx = 8
const floatingDateMaxOffsetPx = 14

// Все чаты для админа - только support_chat типы
const searchQuery = ref('')
const sortBy = ref('activity_desc')
const presenceFilter = ref('all')
const unreadFilter = ref('all')

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

const filteredChats = computed(() => {
    return chats.value.filter(chat => {
        const username = chat.another_user?.username ?? ''
        const lastMessageText =
            chat.last_message && 'text' in chat.last_message ? chat.last_message.text : ''

        const matchesQuery = normalizedQuery.value
            ? [username, lastMessageText, chat.id].join(' ').toLowerCase().includes(normalizedQuery.value)
            : true

        const matchesPresence =
            presenceFilter.value === 'all'
                ? true
                : presenceFilter.value === 'online'
                    ? !!chat.another_user?.is_active
                    : !chat.another_user?.is_active

        const matchesUnread =
            unreadFilter.value === 'all' ? true : (chat.unread_count ?? 0) > 0

        return matchesQuery && matchesPresence && matchesUnread
    })
})

const sortedChats = computed(() => {
    const data = [...filteredChats.value]
    switch (sortBy.value) {
        case 'activity_asc':
            return data.sort((a, b) => {
                const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
                const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
                return dateA - dateB
            })
        case 'unread_desc':
            return data.sort((a, b) => (b.unread_count ?? 0) - (a.unread_count ?? 0))
        case 'unread_asc':
            return data.sort((a, b) => (a.unread_count ?? 0) - (b.unread_count ?? 0))
        case 'name_desc':
            return data.sort((a, b) => (b.another_user?.username ?? '').localeCompare(a.another_user?.username ?? ''))
        case 'name_asc':
            return data.sort((a, b) => (a.another_user?.username ?? '').localeCompare(b.another_user?.username ?? ''))
        default:
            return data.sort((a, b) => {
                const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
                const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
                return dateB - dateA
            })
    }
})

const currentChat = computed(() =>
    chats.value.find(chat => chat.id === selectedChatId.value) || null
)

type PriceOfferChatMessage = Extract<ChatMessageUnion, { message_type: 'price_offer_message' }>

function getMessageTimestamp(message: ChatMessageUnion): number {
    const createdAt = message.created_at
    if (!createdAt) return 0
    const timestamp = new Date(createdAt).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
}

function normalizeMessagesChronological(messages: ChatMessageUnion[]): ChatMessageUnion[] {
    return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))
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

type ChatTimelineItem = {
    message: ChatMessageUnion
    index: number
    dateKey: string | null
    dateLabel: string | null
    showDateDivider: boolean
}

const msPerDay = 24 * 60 * 60 * 1000

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
            continue
        }

        if (message.message_type === 'update_deal_status_message') {
            statuses[message.deal_id] = message.new_status
        }
    }

    return statuses
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
        }
    })
})

const floatingDateDisplayLabel = computed(() => {
    if (!floatingDateLabel.value) return null
    if (isMobile.value) return floatingDateLabel.value
    return isFloatingDateVisible.value ? floatingDateLabel.value : null
})

function resetFloatingDateMergeVisuals() {
    floatingDateOpacity.value = 1
    floatingDateOffsetY.value = 0
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function updateFloatingDateMergeVisuals(container: HTMLElement, dateKey: string | null) {
    resetFloatingDateMergeVisuals()
    if (!isMobile.value || !dateKey) return

    const containerTop = container.getBoundingClientRect().top
    const dividerNodes = container.querySelectorAll<HTMLElement>(
        `[data-chat-date-divider][data-chat-date-key="${dateKey}"]`
    )
    if (!dividerNodes.length) return

    let nearestVisibleDivider: HTMLElement | null = null
    let nearestTop = Number.POSITIVE_INFINITY

    for (const divider of dividerNodes) {
        const rect = divider.getBoundingClientRect()
        if (rect.bottom <= containerTop + 1) continue
        if (rect.top < nearestTop) {
            nearestVisibleDivider = divider
            nearestTop = rect.top
        }
    }

    if (!nearestVisibleDivider) return

    const dividerTop = nearestVisibleDivider.getBoundingClientRect().top
    const floatingTop = containerTop + floatingDateTopOffsetPx
    const distanceToDivider = dividerTop - floatingTop
    const range = floatingDateMergeStartDistancePx - floatingDateMergeEndDistancePx
    if (range <= 0) return

    const progress = clamp(
        (distanceToDivider - floatingDateMergeEndDistancePx) / range,
        0,
        1
    )

    floatingDateOpacity.value = progress
    floatingDateOffsetY.value = (1 - progress) * floatingDateMaxOffsetPx
}

function updateFloatingDateLabel() {
    const container = messageContainerRef.value
    if (
        !container
        || !selectedChatId.value
        || isChatLoading.value
        || isChatPinning.value
        || chatTimelineItems.value.length === 0
    ) {
        floatingDateLabel.value = null
        resetFloatingDateMergeVisuals()
        return
    }

    const messageNodes = container.querySelectorAll<HTMLElement>('[data-chat-message-index]')
    if (!messageNodes.length) {
        floatingDateLabel.value = null
        resetFloatingDateMergeVisuals()
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
        resetFloatingDateMergeVisuals()
        return
    }

    // Prevent overlap with the inline date divider when it is already visible at the top.
    if (!isMobile.value && activeNode && activeItem.showDateDivider) {
        const activeNodeTop = activeNode.getBoundingClientRect().top
        const isDividerVisibleNearTop = activeNodeTop <= containerTop + 44
        if (isDividerVisibleNearTop) {
            floatingDateLabel.value = null
            resetFloatingDateMergeVisuals()
            return
        }
    }

    updateFloatingDateMergeVisuals(container, activeItem.dateKey)
    if (isMobile.value && floatingDateOpacity.value <= 0.02) {
        floatingDateLabel.value = null
        return
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
    if (!selectedChatId.value || chatTimelineItems.value.length === 0) return
    isFloatingDateVisible.value = true

    if (floatingDateHideTimerId !== null) {
        clearTimeout(floatingDateHideTimerId)
    }
    floatingDateHideTimerId = window.setTimeout(() => {
        isFloatingDateVisible.value = false
        floatingDateHideTimerId = null
    }, 900)
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

function openChatProfile() {
    const username = currentChat.value?.another_user?.username
    if (!username) return
    router.push({ name: 'profile', params: { username } })
}

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
            if (selectedChatId.value !== chatId) return
            await nextTick()
            bottomPin.scrollNow()
            syncScrollStateFromContainer()
            scheduleFloatingDateLabelUpdate()
        }, delay)

        deferredBottomPinTimeoutIds.push(timeoutId)
    }
}

function goToAdminHome() {
    router.push('/admin')
}

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

let unsubscribeNewMessage: (() => void) | null = null
let unsubscribeChatUpdated: (() => void) | null = null

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

        unsubscribeChatUpdated = chatsService.onChatUpdated(update => {
            const chatIndex = chats.value.findIndex(c => c.id === update.chat_id)
            if (chatIndex === -1) return

            const chat = chats.value[chatIndex]
            if (!chat) return
            const isActiveChat = selectedChatId.value === update.chat_id
            const previousLastMessageId = chat.last_message?.id ?? null
            const incomingLastMessageId = update.last_message?.id ?? null
            const hasNewLastMessage = Boolean(
                incomingLastMessageId && incomingLastMessageId !== previousLastMessageId
            )

            if (update.last_message) {
                if (shouldApplyLastMessage(chat.last_message ?? null, update.last_message)) {
                    chat.last_message = update.last_message
                    // Перемещаем чат наверх только когда пришло именно новое сообщение.
                    if (hasNewLastMessage) {
                        chats.value.splice(chatIndex, 1)
                        chats.value.unshift(chat)
                    }
                }
            }

            if (typeof update.unread_count === 'number') {
                chat.unread_count = isActiveChat ? 0 : update.unread_count
                if (isActiveChat && update.unread_count > 0) {
                    void chatsService.markChatRead(update.chat_id)
                }
            }
        })

        unsubscribeNewMessage = chatsService.onNewMessage(message => {
            if (selectedChatId.value === message.chat_room_id) {
                if (!chatMessages.value.some(m => m.id === message.id)) {
                    const shouldStickToBottom = isNearBottom()
                    chatMessages.value.push(message)
                    nextTick(() => {
                        if (shouldStickToBottom) {
                            void bottomPin.pinFor(320)
                        }
                    })

                    const activeChat = chats.value.find(c => c.id === message.chat_room_id)
                    if (activeChat) activeChat.unread_count = 0
                    void chatsService.markChatRead(message.chat_room_id)
                }
            }
        })

        await loadChats()

        const chatIdFromQuery = route.query.chatId as string | undefined
        if (chatIdFromQuery) {
            const exists = await ensureChatLoaded(chatIdFromQuery)
            if (exists) {
                await loadChatMessages(chatIdFromQuery, { settleToBottomAfterRouteOpen: true })
            } else if (isMobile.value) {
                mobileMode.value = 'chats'
                updateUrlChatId(null)
            }
        }
    } catch {
        errorMessage.value = t('pages.chats.errorLoadingChats')
    } finally {
        isLoading.value = false
    }
})

onUnmounted(() => {
    unsubscribeNewMessage?.()
    unsubscribeChatUpdated?.()
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

watch([searchQuery, sortBy, presenceFilter, unreadFilter], () => {
    if (chatsContainerRef.value) chatsContainerRef.value.scrollTop = 0
})

watch(selectedChatId, () => {
    floatingDateLabel.value = null
    resetFloatingDateMergeVisuals()
    isFloatingDateVisible.value = false
    clearDeferredBottomPinTimers()
    if (floatingDateHideTimerId !== null) {
        clearTimeout(floatingDateHideTimerId)
        floatingDateHideTimerId = null
    }
})

watch(
    () => route.query.chatId,
    async (chatIdQuery) => {
        const chatId = typeof chatIdQuery === 'string' ? chatIdQuery : null
        if (!chatId) return
        if (selectedChatId.value === chatId) return
        if (isLoading.value) return

        const exists = await ensureChatLoaded(chatId)
        if (!exists) return

        await loadChatMessages(chatId, { settleToBottomAfterRouteOpen: true })
    }
)

watch(
    () => [
        chatTimelineItems.value.length,
        selectedChatId.value,
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

// Загрузка чатов с пагинацией
async function loadChats() {
    isLoadingChats.value = true

    const response = await adminService.getAdminChats(1, chatsPerPage.value)
    chats.value = response.chats
    chatsCurrentPage.value = response.currentPage
    chatsTotalPages.value = response.totalPages
    hasMoreChats.value = response.currentPage < response.totalPages

    isLoadingChats.value = false
}

async function ensureChatLoaded(chatId: string): Promise<boolean> {
    if (chats.value.some(chat => chat.id === chatId)) {
        return true
    }

    while (hasMoreChats.value) {
        const response = await adminService.getAdminChats(
            chatsCurrentPage.value + 1,
            chatsPerPage.value
        )

        if (response.chats.length === 0) {
            hasMoreChats.value = false
            break
        }

        chats.value.push(...response.chats)
        chatsCurrentPage.value = response.currentPage
        chatsTotalPages.value = response.totalPages
        hasMoreChats.value = response.currentPage < response.totalPages

        if (chats.value.some(chat => chat.id === chatId)) {
            return true
        }
    }

    return false
}

// Infinity scroll для чатов
async function handleChatsScroll() {
    const el = chatsContainerRef.value
    if (!el || isLoadingMoreChats.value || !hasMoreChats.value) return

    // Проверяем, достигли ли конца списка
    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (scrollBottom < 100) {
        await loadMoreChats()
    }
}

async function loadMoreChats() {
    if (isLoadingMoreChats.value || !hasMoreChats.value) return

    isLoadingMoreChats.value = true

    const response = await adminService.getAdminChats(
        chatsCurrentPage.value + 1,
        chatsPerPage.value
    )

    if (response.chats.length > 0) {
        chats.value.push(...response.chats)
        chatsCurrentPage.value = response.currentPage
        chatsTotalPages.value = response.totalPages
        hasMoreChats.value = response.currentPage < response.totalPages
    } else {
        hasMoreChats.value = false
    }

    isLoadingMoreChats.value = false
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

async function handleMessagesScroll() {
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
    if (!selectedChatId.value) return

    isLoadingMoreMessages.value = true
    const el = messageContainerRef.value
    const oldHeight = el?.scrollHeight || 0

    const response = await chatsService.getChatMessages(
        selectedChatId.value,
        messagesCurrentPage.value + 1,
        messagesPerPage.value
    )

    if (response.messages.length) {
        chatMessages.value.unshift(...normalizeMessagesChronological(response.messages))
        messagesCurrentPage.value++
        messagesTotalPages.value = response.totalPages
        hasMoreMessages.value = messagesCurrentPage.value < messagesTotalPages.value
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
    if (selectedChatId.value === chatId) {
        if (isMobile.value) {
            mobileMode.value = 'chat'
        }
        return
    }

    clearDeferredBottomPinTimers()
    isLoading.value = true
    isChatLoading.value = true
    isChatPinning.value = false
    let shouldScrollToBottom = false

    try {
        hasUserScrolledAwayFromTop.value = false
        previousMessageScrollTop.value = 0
        chatMessages.value = []
        messagesCurrentPage.value = 1
        hasMoreMessages.value = true

        await chatsService.joinChat(chatId)
        selectedChatId.value = chatId
        updateUrlChatId(chatId)

        const response = await chatsService.getChatMessages(chatId, 1, messagesPerPage.value)
        chatMessages.value = normalizeMessagesChronological(response.messages)
        messagesTotalPages.value = response.totalPages
        hasMoreMessages.value = 1 < messagesTotalPages.value
        scheduleFloatingDateLabelUpdate()

        const chat = chats.value.find(c => c.id === chatId)
        if (chat) chat.unread_count = 0
        void chatsService.markChatRead(chatId)

        if (isMobile.value) mobileMode.value = 'chat'
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
    if (!selectedChatId.value) return

    const text = newMessage.value.trim()
    const files = payload.files ?? []
    if (!text && files.length === 0) return

    let hasSentAnyMessage = false

    if (text) {
        const textResult = await chatsService.sendMessage(
            text,
            selectedChatId.value,
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
        const imagesResult = await chatsService.sendImages(selectedChatId.value, files)
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
    <!-- Добавляем md:pt-6 обратно -->
    <div class="h-full w-full flex flex-col overscroll-none md:pt-6">
        <div v-if="isLoading && chats.length === 0" class="flex flex-1 items-center justify-center text-gray-300">
            <Loader />
        </div>

        <div v-else-if="errorMessage" class="flex flex-1 items-center justify-center text-red-500">
            {{ errorMessage }}
        </div>

        <div v-else class="w-full h-full flex flex-1 min-h-0 overflow-hidden">
            <!-- Список чатов -->
            <div v-if="!isMobile || (isMobile && mobileMode === 'chats')"
                class="h-full lg:max-w-sm flex flex-col md:pr-5 transition-all duration-300 min-h-0" :class="[
                    isMobile && mobileMode === 'chats'
                        ? 'fixed inset-x-0 bottom-0 top-14 z-10 w-full bg-background'
                        : 'w-3/12',
                ]">
                <div class="h-full flex flex-col border-dark-600 lg:border-1 md:rounded-3xl">
                    <div v-if="isMobile" class="px-4 pt-3">
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-700/40 px-3 py-2 text-xs text-gray-200"
                            @click="goToAdminHome"
                        >
                            <ArrowLeft class="h-4 w-4" />
                            <span>{{ $t('common.back') }}</span>
                        </button>
                    </div>
                    <p class="my-4 text-2xl px-4 text-mainText font-semibold">
                        {{ $t('pages.admin.supportChats.supportChats') }}
                    </p>

                    <div class="px-4 pb-3 flex flex-col gap-2">
                        <SearchField v-model="searchQuery" :placeholder="$t('common.search')" />
                        <div class="grid grid-cols-1 gap-2">
                            <CustomSelect
                                v-model="sortBy"
                                :options="[
                                    { value: 'activity_desc', label: t('common.sortOptions.activityNew') },
                                    { value: 'activity_asc', label: t('common.sortOptions.activityOld') },
                                    { value: 'unread_desc', label: t('common.sortOptions.unreadHigh') },
                                    { value: 'unread_asc', label: t('common.sortOptions.unreadLow') },
                                    { value: 'name_asc', label: t('common.sortOptions.nameAsc') },
                                    { value: 'name_desc', label: t('common.sortOptions.nameDesc') },
                                ]"
                                :placeholder="$t('common.sortBy')"
                            />
                            <div class="grid grid-cols-2 gap-2">
                                <CustomSelect
                                    v-model="presenceFilter"
                                    :options="[
                                        { value: 'all', label: t('common.all') },
                                        { value: 'online', label: t('common.online') },
                                        { value: 'offline', label: t('common.offline') },
                                    ]"
                                    :placeholder="$t('common.filters.online')"
                                />
                                <CustomSelect
                                    v-model="unreadFilter"
                                    :options="[
                                        { value: 'all', label: t('common.all') },
                                        { value: 'unread', label: t('common.filters.unread') },
                                    ]"
                                    :placeholder="$t('common.filters.unread')"
                                />
                            </div>
                        </div>
                    </div>

                    <div ref="chatsContainerRef" class="scrollbar-hidden flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
                        @scroll="handleChatsScroll">
                        <div v-if="sortedChats.length > 0" class="flex flex-col">
                            <ChatItem v-for="chat in sortedChats" :key="chat.id" :chat="chat"
                                :selected-chat-id="selectedChatId" :show-support-as-user="true"
                                @load-chat-messages="(n: string) => loadChatMessages(n)" />

                            <!-- Loader для infinity scroll чатов -->
                            <div v-if="isLoadingMoreChats" class="flex justify-center py-4">
                                <Loader size="sm" />
                            </div>
                        </div>
                        <div v-else class="h-full w-full flex items-center justify-center">
                            <p class="text-sm text-gray-400 font-light">
                                {{ $t('pages.admin.noSupportChats') }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- chat window -->
            <div v-if="!isMobile || (isMobile && mobileMode === 'chat')"
                class="h-full flex flex-1 min-h-0 transition-all duration-300" :class="[
                    isMobile && mobileMode === 'chat'
                        ? 'fixed inset-x-0 bottom-0 top-14 z-10 w-full bg-background'
                        : 'flex-1 min-w-0 border-1 border-dark-400 rounded-3xl',
                ]">
                <div class="h-full w-full flex flex-col min-h-0 px-2 md:rounded-xl">
                    <div class="flex flex-1 flex-col min-h-0 w-full">
                        <!-- chat title -->
                        <div v-if="currentChat"
                            class="flex items-center gap-2 sticky top-0 bg-background px-2 py-2 lg:py-3 lg:px-3 z-10 lg:border-b border-dark-700">
                            <button v-if="isMobile" class="text-xl font-bold flex-shrink-0" @click="backToChats">
                                <ArrowLeft />
                            </button>
                            <button
                                type="button"
                                class="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg transition cursor-pointer bg-transparent border-0 p-0 focus:outline-none"
                                @click="openChatProfile"
                            >
                                <div class="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                                    <UserAvatar
                                        :avatar-url="currentChat?.another_user.avatar_url"
                                        :alt="currentChat?.another_user.username || ''"
                                        class="h-8 w-8 lg:h-10 lg:w-10 border-2 border-dark-600 rounded-full object-cover"
                                    />
                                </div>
                                <div class="flex min-w-0 flex-col">
                                    <div class="w-full min-w-0 truncate">
                                        <StyledUsername
                                            :username="currentChat?.another_user.username || ''"
                                            :style-id="currentChat?.another_user.nickname_style_id"
                                            class="text-lg font-semibold"
                                        />
                                    </div>
                                    <p v-if="currentChat?.another_user.is_active" class="text-xs text-green-500">
                                        {{ $t('common.online') }}
                                    </p>
                                    <p v-else class="text-xs text-gray-500">
                                        {{ $t('common.offline') }}
                                    </p>
                                </div>
                            </button>
                        </div>

                        <!-- message -->
                        <div class="relative flex flex-1 min-h-0 flex-col overflow-hidden">
                            <FloatingDateHeader
                                :label="floatingDateDisplayLabel"
                                :opacity="floatingDateOpacity"
                                :offset-y="floatingDateOffsetY"
                            />
                            <div ref="messageContainerRef" class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-2"
                                @scroll="handleMessagesScroll"
                                @wheel.passive="cancelChatPinning"
                                @touchstart.passive="cancelChatPinning"
                                @mousedown="cancelChatPinning">
                                <div v-if="isChatLoading" class="flex h-full w-full items-center justify-center">
                                    <Loader />
                                </div>

                                <template v-else>
                                    <div :class="isChatPinning ? 'opacity-0 pointer-events-none' : 'opacity-100'">
                                        <div v-if="isLoadingMoreMessages" class="flex justify-center py-2">
                                            <Loader size="sm" />
                                        </div>

                                        <div v-if="chatTimelineItems.length > 0" class="flex flex-1 flex-col justify-start min-h-0">
                                            <div class="flex flex-col pt-2 pb-18">
                                                <template v-for="item in chatTimelineItems" :key="item.message.id">
                                                    <div
                                                        v-if="item.showDateDivider && item.dateLabel"
                                                        class="flex justify-center py-2"
                                                        data-chat-date-divider
                                                        :data-chat-date-key="item.dateKey ?? ''"
                                                    >
                                                        <span class="rounded-full border border-dark-600/70 bg-dark-900/70 px-3 py-1 text-xs font-medium text-mainText/90">
                                                            {{ item.dateLabel }}
                                                        </span>
                                                    </div>

                                                    <div
                                                        class="mb-3"
                                                        :data-chat-message-index="item.index"
                                                        :data-chat-date-key="item.dateKey ?? ''"
                                                    >
                                                        <ChatMessage
                                                            :message="item.message"
                                                            :user="user"
                                                            :showAdminBadge="false"
                                                            :deal-status-overrides="dealStatusOverrides"
                                                            :reviewed-deal-ids="reviewedDealIds"
                                                        />
                                                    </div>
                                                </template>
                                            </div>
                                        </div>

                                        <div v-else-if="selectedChatId != null && chatMessages.length === 0"
                                            class="h-full w-full flex items-center justify-center">
                                            <p class="text-gray-400 font-light">{{ $t("pages.chats.emptyMessages") }}</p>
                                        </div>

                                        <div v-else-if="selectedChatId === null"
                                            class="h-full w-full flex items-center justify-center">
                                            <p class="text-gray-400 font-light">{{ $t('pages.admin.selectSupportChat') }}</p>
                                        </div>
                                    </div>
                                </template>

                                <div
                                    v-if="selectedChatId"
                                    aria-hidden="true"
                                    class="w-full flex-none md:h-[108px]"
                                    :class="isMobile ? 'h-[180px]' : 'h-[124px]'"
                                />
                            </div>

                            <div
                                v-if="selectedChatId"
                                class="pointer-events-none absolute inset-x-0 z-20 bg-transparent px-1 pb-2 pt-0 md:bottom-0"
                                :class="isMobile ? 'bottom-14' : 'bottom-0'"
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

<style scoped>
:deep(header) {
    z-index: 20 !important;
}

:deep(.mobile-nav-glass) {
    z-index: 20 !important;
}
</style>
