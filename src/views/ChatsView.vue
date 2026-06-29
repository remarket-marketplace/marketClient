<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import ChatItem from '@/components/chats/ChatItem.vue'
import ChatMessage from '@/components/chats/ChatMessage.vue'
import FloatingDateHeader from '@/components/chats/FloatingDateHeader.vue'
import NewPurchaseMessage from '@/components/chats/NewPurchaseMessage.vue'
import PendingChatMessage from '@/components/chats/PendingChatMessage.vue'
import SendMessageBar from '@/components/chats/SendMessageBar.vue'
import SupportFaqAssistant from '@/components/chats/SupportFaqAssistant.vue'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatMessageUnion, ChatUpdateSchema, PurchaseMessage } from '@/validation/chat/chatMessage'
import type { MessagesReadPayload } from '@/validation/chat/chatMessage'
import type { LocalPendingChatMessage } from '@/validation/chat/localPendingMessage'
import type { UserRead } from '@/validation/user/userRead'
import { nextTick, onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Headphones } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { formatChatTime, getChatTimestamp, parseChatDate } from '@/utils/chatDate'
import { createBottomPinController } from '@/utils/chatScroll'
import { getChatTimelineSpacingClass } from '@/utils/chatTimelineSpacing'
import { formatLastSeen } from '@/utils/presence'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const chatStore = useChatStore()
const chats = ref<ChatListItem[]>([])
const chatMessages = ref<ChatMessageUnion[]>([])
const latestDealMessage = ref<PurchaseMessage | null>(null)
const localPendingMessages = ref<LocalPendingChatMessage[]>([])
const liveDealStatusOverrides = ref<Record<string, string>>({})
type DealStatusTimelineEvent = {
  id: string
  deal_id: string
  status: string
  created_at: string
}
const liveDealStatusEventsById = ref<Record<string, DealStatusTimelineEvent>>({})
const selectedChatId = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const latestDealSummaryRef = ref<HTMLElement | null>(null)
const composerOverlayRef = ref<HTMLElement | null>(null)
const bottomPin = createBottomPinController(() => messageContainerRef.value)
const isPageLoading = ref(false)
const isChatLoading = ref(false)
const isChatPinning = ref(false)
const isLoadingMoreMessages = ref(false)
const pageErrorMessage = ref<string | null>(null)
const sendErrorMessage = ref<string | null>(null)
const isMobile = ref(false)
const isDealSummaryCollapsed = ref(false)
const mobileMode = ref<'chats' | 'chat'>('chats')
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
let deferredDealSummaryMeasureTimeoutIds: number[] = []
let localPendingMessageSequence = 0
let latestDealSummaryResizeObserver: ResizeObserver | null = null
let composerOverlayResizeObserver: ResizeObserver | null = null
const latestDealSummaryHeightPx = ref(0)
const composerOverlayHeightPx = ref(0)

const currentPage = ref(1)
const totalPages = ref(0)
const perPage = ref(15)
const hasMoreMessages = ref(true)
const totalMessagesInChat = ref(0)
const routeChatAvailabilityRetryDelaysMs = [0, 250, 500, 900] as const
const routeChatRefreshRetryDelaysMs = [350, 900, 1700] as const
const isMessageLimitLockedByServer = ref(false)
const topLoadThresholdPx = 8
const previousMessageScrollTop = ref(0)
const hasUserScrolledAwayFromTop = ref(false)
const bottomAutoScrollThresholdPx = 120
const floatingDateMergeStartDistancePx = 56
const floatingDateMergeEndDistancePx = 8
const floatingDateMaxOffsetPx = 14
const dealScopedSupportChatAccessIds = ref(new Set<string>())
const supportAccessStorageKey = 'dealScopedSupportAccessChatIds'

const routeChatId = computed(() => {
  if (typeof route.query.chatId === 'string' && route.query.chatId.length > 0) {
    return route.query.chatId
  }
  if (typeof route.params.chatId === 'string' && route.params.chatId.length > 0) {
    return route.params.chatId
  }
  return null
})

const supportContextFromQuery = computed(() => {
  const rawSupportContext = route.query.supportContext
  if (Array.isArray(rawSupportContext)) return (rawSupportContext[0] ?? '').trim()
  if (typeof rawSupportContext === 'string') return rawSupportContext.trim()
  return ''
})
const appliedSupportContextValue = ref<string | null>(null)

function clearSupportContextQuery() {
  if (!Object.prototype.hasOwnProperty.call(route.query, 'supportContext')) return
  void router.replace({
    query: {
      ...route.query,
      supportContext: undefined,
    },
  })
}

function grantDealScopedSupportAccess(chatId: string) {
  if (dealScopedSupportChatAccessIds.value.has(chatId)) return
  const next = new Set(dealScopedSupportChatAccessIds.value)
  next.add(chatId)
  dealScopedSupportChatAccessIds.value = next
  persistDealScopedSupportAccess()
}

function revokeDealScopedSupportAccess(chatId: string) {
  if (!dealScopedSupportChatAccessIds.value.has(chatId)) return
  const next = new Set(dealScopedSupportChatAccessIds.value)
  next.delete(chatId)
  dealScopedSupportChatAccessIds.value = next
  persistDealScopedSupportAccess()
}

function persistDealScopedSupportAccess() {
  if (typeof window === 'undefined') return
  try {
    const ids = Array.from(dealScopedSupportChatAccessIds.value).filter(
      (id) => typeof id === 'string' && id.length > 0,
    )
    window.sessionStorage.setItem(supportAccessStorageKey, JSON.stringify(ids))
  } catch (error) {
    console.warn('Failed to persist support access state', error)
  }
}

function hydrateDealScopedSupportAccess() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(supportAccessStorageKey)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return

    const restoredIds = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (restoredIds.length === 0) return

    dealScopedSupportChatAccessIds.value = new Set(restoredIds)
  } catch (error) {
    console.warn('Failed to restore support access state', error)
  }
}

function resolveSupportTicketStatus(chat: ChatListItem | null | undefined): 'open' | 'closed' {
  if (!chat) return 'open'

  const statusCandidates = [
    chat.support_ticket_status,
    chat.support_status,
  ]

  for (const candidate of statusCandidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim().toLowerCase()
    if (normalized === 'closed' || normalized === 'open') {
      return normalized
    }
  }

  if (typeof chat.is_closed === 'boolean') {
    return chat.is_closed ? 'closed' : 'open'
  }

  if (typeof chat.is_resolved === 'boolean') {
    return chat.is_resolved ? 'closed' : 'open'
  }

  return 'open'
}

const supportCaseClosedTextMarkers = [
  'обращение закрыто администратором',
  'обращение закрыто',
  'жалоба успешно обработана',
  'support case closed',
  'case closed by administrator',
  'request closed by administrator',
] as const
const supportCaseReopenedTextMarkers = [
  'обращение переоткрыто администратором',
  'обращение снова открыто',
  'обращение открыто',
  'case reopened by administrator',
  'support case reopened',
] as const

function isSupportCaseClosedByText(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false
  return supportCaseClosedTextMarkers.some((marker) => normalized.includes(marker))
}

function isSupportCaseReopenedByText(text: string | null | undefined): boolean {
  if (typeof text !== 'string') return false
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false
  return supportCaseReopenedTextMarkers.some((marker) => normalized.includes(marker))
}

function resolveSupportTicketStatusFromMessage(message: ChatMessageUnion): 'open' | 'closed' | null {
  if (message.message_type !== 'text_message') return null

  const rawData = message.data as Record<string, unknown> | null | undefined
  const statusCandidates = [
    rawData?.support_ticket_status,
    rawData?.support_status,
    rawData?.status,
  ]

  for (const candidate of statusCandidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim().toLowerCase()
    if (normalized === 'closed' || normalized === 'open') {
      return normalized
    }
  }

  if (typeof rawData?.is_closed === 'boolean') {
    return rawData.is_closed ? 'closed' : 'open'
  }
  if (typeof rawData?.is_resolved === 'boolean') {
    return rawData.is_resolved ? 'closed' : 'open'
  }

  if (isSupportCaseClosedByText(message.text)) return 'closed'
  if (isSupportCaseReopenedByText(message.text)) return 'open'
  return null
}

function resolveSupportTicketStatusFromMessages(messages: ChatMessageUnion[]): 'open' | 'closed' | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message) continue
    const status = resolveSupportTicketStatusFromMessage(message)
    if (status) return status
  }

  return null
}

function markSupportCaseClosedLocally(chatId: string) {
  const chat = chats.value.find((item) => item.id === chatId)
  if (!chat || chat.chat_type !== 'support_chat') return

  chat.support_ticket_status = 'closed'
  chat.support_status = 'closed'
  chat.is_closed = true
  chat.is_resolved = true
  revokeDealScopedSupportAccess(chatId)

  chatStore.updateChatFromSocket({
    chat_id: chatId,
    unread_count: chat.unread_count ?? 0,
    support_ticket_status: 'closed',
    support_status: 'closed',
    is_closed: true,
    is_resolved: true,
  })
}

function markSupportCaseOpenedLocally(chatId: string) {
  const chat = chats.value.find((item) => item.id === chatId)
  if (!chat || chat.chat_type !== 'support_chat') return

  chat.support_ticket_status = 'open'
  chat.support_status = 'open'
  chat.is_closed = false
  chat.is_resolved = false
  grantDealScopedSupportAccess(chatId)

  chatStore.updateChatFromSocket({
    chat_id: chatId,
    unread_count: chat.unread_count ?? 0,
    support_ticket_status: 'open',
    support_status: 'open',
    is_closed: false,
    is_resolved: false,
  })
}

function syncSupportAccessWithChatStatuses() {
  let hasChanges = false
  const next = new Set(dealScopedSupportChatAccessIds.value)

  for (const chatId of next) {
    const chat = chats.value.find((item) => item.id === chatId)
    // Do not drop session on refresh when chat list is temporarily incomplete.
    if (!chat) {
      continue
    }
    if (chat.chat_type !== 'support_chat') {
      next.delete(chatId)
      hasChanges = true
      continue
    }

    if (resolveSupportTicketStatus(chat) === 'closed') {
      next.delete(chatId)
      hasChanges = true
    }
  }

  if (!hasChanges) return
  dealScopedSupportChatAccessIds.value = next
  persistDealScopedSupportAccess()
}

function applySupportContextDraftIfNeeded() {
  const context = supportContextFromQuery.value
  if (!context) return
  if (appliedSupportContextValue.value === context) return
  if (currentChat.value?.chat_type !== 'support_chat' || !selectedChatId.value) return

  markSupportCaseOpenedLocally(selectedChatId.value)

  if (!newMessage.value.trim()) {
    newMessage.value = context
  }

  appliedSupportContextValue.value = context
  clearSupportContextQuery()
}

watch(
  () => chatStore.chats,
  (nextChats) => {
    chats.value = nextChats.slice()
  },
  { immediate: true },
)

function getLastMessageTimestamp(chat: ChatListItem): number {
  return getChatTimestamp(chat.last_message?.created_at)
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

type ChatTimelineMessage = ChatMessageUnion | LocalPendingChatMessage
type PriceOfferChatMessage = Extract<ChatMessageUnion, { message_type: 'price_offer_message' }>
type EchoComparableServerMessage = Extract<ChatMessageUnion, { message_type: 'text_message' | 'image_message' }>

function isLocalPendingMessage(message: ChatTimelineMessage): message is LocalPendingChatMessage {
  return 'status' in message
}

function getMessageTimestamp(message: { created_at: string }): number {
  return getChatTimestamp(message.created_at)
}

function normalizeMessagesChronological(messages: ChatMessageUnion[]): ChatMessageUnion[] {
  return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))
}

function isDealStatusUpdateMessage(
  message: ChatMessageUnion,
): message is Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }> {
  return message.message_type === 'update_deal_status_message'
}

function shouldShowDealStatusMessageInTimeline(
  message: Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>,
): boolean {
  return message.new_status === 'disputed'
}

function isEchoComparableServerMessage(message: ChatMessageUnion): message is EchoComparableServerMessage {
  return message.message_type === 'text_message' || message.message_type === 'image_message'
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
    if (isDealStatusUpdateMessage(message) && !shouldShowDealStatusMessageInTimeline(message)) {
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

function getPurchaseMessageTimestamp(message: PurchaseMessage | null): number {
  if (!message) return 0
  return getMessageTimestamp(message)
}

function getLatestPurchaseMessageFromMessages(messages: ChatMessageUnion[]): PurchaseMessage | null {
  const purchaseMessages = messages.filter(
    (message): message is PurchaseMessage => message.message_type === 'purchase_message',
  )
  if (purchaseMessages.length === 0) return null

  return purchaseMessages.reduce((latest, current) => (
    getPurchaseMessageTimestamp(current) >= getPurchaseMessageTimestamp(latest) ? current : latest
  ))
}

function pickLatestPurchaseMessage(
  currentMessage: PurchaseMessage | null,
  candidateMessage: PurchaseMessage | null,
): PurchaseMessage | null {
  if (!candidateMessage) return currentMessage
  if (!currentMessage) return candidateMessage
  return getPurchaseMessageTimestamp(candidateMessage) >= getPurchaseMessageTimestamp(currentMessage)
    ? candidateMessage
    : currentMessage
}

const resolvedLatestDealMessage = computed<PurchaseMessage | null>(() => (
  pickLatestPurchaseMessage(
    latestDealMessage.value,
    getLatestPurchaseMessageFromMessages(chatMessages.value),
  )
))

function mergeChatMessages(messages: ChatMessageUnion[]) {
  if (messages.length === 0) return

  const existingMessageIds = new Set(chatMessages.value.map((message) => message.id))
  const newMessages = messages.filter((message) => !existingMessageIds.has(message.id))
  if (newMessages.length === 0) return

  chatMessages.value = normalizeMessagesChronological([
    ...chatMessages.value,
    ...newMessages,
  ])
}

function waitMs(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

function createLocalPendingMessageId(kind: 'text' | 'image'): string {
  localPendingMessageSequence += 1
  return `local-${kind}-${Date.now()}-${localPendingMessageSequence}`
}

function createLocalPendingCreatedAt(timestampMs: number): string {
  // Keep optimistic messages in the same UTC format backend returns (ISO 8601).
  // This prevents timezone drift between local pending messages and server echoes.
  return new Date(timestampMs).toISOString()
}

function createLocalTextPendingMessage(chatId: string, senderId: string, text: string): LocalPendingChatMessage {
  const createdAtMs = Date.now()
  return {
    id: createLocalPendingMessageId('text'),
    chat_room_id: chatId,
    created_at: createLocalPendingCreatedAt(createdAtMs),
    client_created_at_ms: createdAtMs,
    message_type: 'text_message',
    sender_id: senderId,
    text,
    status: 'sending',
    error_code: null,
    echo_timeout_id: null,
  }
}

function createLocalImagePendingMessage(
  chatId: string,
  senderId: string,
  files: File[],
): LocalPendingChatMessage {
  const createdAtMs = Date.now()
  return {
    id: createLocalPendingMessageId('image'),
    chat_room_id: chatId,
    created_at: createLocalPendingCreatedAt(createdAtMs),
    client_created_at_ms: createdAtMs,
    message_type: 'image_message',
    sender_id: senderId,
    text: '',
    files: [...files],
    preview_urls: files.map((file) => URL.createObjectURL(file)),
    status: 'sending',
    error_code: null,
    echo_timeout_id: null,
  }
}

function clearLocalPendingEchoTimeout(message: LocalPendingChatMessage) {
  if (message.echo_timeout_id !== null) {
    clearTimeout(message.echo_timeout_id)
    message.echo_timeout_id = null
  }
}

function cleanupLocalPendingMessage(message: LocalPendingChatMessage) {
  clearLocalPendingEchoTimeout(message)
  if (message.message_type === 'image_message') {
    message.preview_urls.forEach((url) => URL.revokeObjectURL(url))
  }
}

function removeLocalPendingMessage(messageId: string) {
  const index = localPendingMessages.value.findIndex((message) => message.id === messageId)
  if (index === -1) return

  const [message] = localPendingMessages.value.splice(index, 1)
  if (message) {
    cleanupLocalPendingMessage(message)
  }
}

function updateLocalPendingMessage(
  messageId: string,
  updater: (message: LocalPendingChatMessage) => void,
) {
  const message = localPendingMessages.value.find((item) => item.id === messageId)
  if (!message) return
  updater(message)
}

function markLocalPendingMessageFailed(messageId: string, errorCode?: string) {
  updateLocalPendingMessage(messageId, (message) => {
    clearLocalPendingEchoTimeout(message)
    message.status = 'failed'
    message.error_code = errorCode || 'SERVER_ERROR'
  })
}

function scheduleLocalPendingMessageEchoFallback(messageId: string) {
  updateLocalPendingMessage(messageId, (message) => {
    clearLocalPendingEchoTimeout(message)
    message.echo_timeout_id = window.setTimeout(() => {
      removeLocalPendingMessage(messageId)
    }, 3000)
  })
}

function getImageMessageCount(
  message: Extract<ChatMessageUnion, { message_type: 'image_message' }>,
): number {
  const images = message.data?.images
  return Array.isArray(images) ? images.length : 0
}

function isMatchingServerEcho(
  pendingMessage: LocalPendingChatMessage,
  serverMessage: EchoComparableServerMessage,
): boolean {
  if (pendingMessage.chat_room_id !== serverMessage.chat_room_id) return false
  if (pendingMessage.sender_id !== serverMessage.sender_id) return false
  if (pendingMessage.message_type !== serverMessage.message_type) return false

  const pendingAgeMs = Date.now() - pendingMessage.client_created_at_ms
  if (pendingAgeMs < -1_000 || pendingAgeMs > 300_000) return false

  if (pendingMessage.message_type === 'text_message' && serverMessage.message_type === 'text_message') {
    return pendingMessage.text.trim() === serverMessage.text.trim()
  }

  if (pendingMessage.message_type === 'image_message' && serverMessage.message_type === 'image_message') {
    return pendingMessage.files.length === getImageMessageCount(serverMessage)
  }

  return false
}

function resolveLocalPendingMessageEcho(serverMessage: ChatMessageUnion) {
  if (!user.value) return
  if (!isEchoComparableServerMessage(serverMessage)) return
  if (serverMessage.sender_id !== user.value.id) return

  const candidate = [...localPendingMessages.value]
    .filter((message) => message.status === 'sending')
    .filter((message) => isMatchingServerEcho(message, serverMessage))
    .sort((a, b) => (
      Math.abs(getMessageTimestamp(a) - getMessageTimestamp(serverMessage))
      - Math.abs(getMessageTimestamp(b) - getMessageTimestamp(serverMessage))
    ))[0]

  if (candidate) {
    removeLocalPendingMessage(candidate.id)
  }
}

type ChatTimelineItem = {
  message: ChatTimelineMessage
  index: number
  dateKey: string | null
  dateLabel: string | null
  showDateDivider: boolean
  spacingClass: string
  isLocal: boolean
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

function parseMessageDateKey(message: ChatTimelineMessage): string | null {
  const parsed = parseChatDate(message.created_at)
  if (!parsed) return null

  const messageDayStart = toLocalDayStart(parsed)
  const todayStart = toLocalDayStart(new Date())

  // Messages from future should not generate a floating date label.
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

function formatPendingMessageDate(dateInput: string | Date): string {
  return formatChatTime(dateInput, locale.value)
}

const selectedChatLocalPendingMessages = computed<LocalPendingChatMessage[]>(() => {
  if (!selectedChatId.value) return []
  return localPendingMessages.value.filter((message) => message.chat_room_id === selectedChatId.value)
})

const timelineMessages = computed<ChatTimelineMessage[]>(() => {
  const normalizedServerMessages = normalizeTimelineServerMessages(chatMessages.value)
  const latestDealId = resolvedLatestDealMessage.value?.deal_id ?? null
  const filteredServerMessages = latestDealId
    ? normalizedServerMessages.filter((message) => (
      message.message_type !== 'purchase_message' || message.deal_id !== latestDealId
    ))
    : normalizedServerMessages

  return [...filteredServerMessages, ...selectedChatLocalPendingMessages.value]
})

const chatTimelineItems = computed<ChatTimelineItem[]>(() => {
  let previousDateKey: string | null = null

  return timelineMessages.value.map((message, index) => {
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
      spacingClass: getChatTimelineSpacingClass(timelineMessages.value, index),
      isLocal: isLocalPendingMessage(message),
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
  const floatingTop = containerTop + floatingDateTopOffsetPx.value
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

  // Avoid duplicating the floating label when inline date divider is already visible at the top.
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

const sortedChats = computed(() => {
  return [...chats.value].sort((a, b) => (
    getLastMessageTimestamp(b) - getLastMessageTimestamp(a)
  ))
})

const currentChat = computed(() =>
  chats.value.find(chat => chat.id === selectedChatId.value) || null
)

watch(
  [() => currentChat.value?.id, supportContextFromQuery],
  () => {
    applySupportContextDraftIfNeeded()
  },
  { immediate: true },
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
  if (!currentChat.value) return ''
  if (currentChat.value.chat_type === 'support_chat') {
    return t('common.online')
  }
  return formatLastSeen(
    currentChat.value.another_user.last_seen_at,
    currentChat.value.another_user.is_active,
    locale.value,
    t('common.offline'),
    t('common.online'),
  )
})

const isChatDisplayOnline = computed(() => {
  if (!currentChat.value) return false
  if (currentChat.value.chat_type === 'support_chat') {
    return true
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

const canWriteToCurrentSupportChat = computed(() => {
  if (!isSupportChat.value) return true
  if (!selectedChatId.value) return false
  if (resolveSupportTicketStatus(currentChat.value) === 'closed') return false
  return dealScopedSupportChatAccessIds.value.has(selectedChatId.value)
})
const isSupportAccessMissing = computed(() => (
  isSupportChat.value && !canWriteToCurrentSupportChat.value
))

const isComposerDisabled = computed(() => (
  isSendLocked.value || isSupportAccessMissing.value
))

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

const dealStatusOverrides = computed<Record<string, string>>(() => {
  const statuses: Record<string, string> = {}

  if (resolvedLatestDealMessage.value) {
    statuses[resolvedLatestDealMessage.value.deal_id] = resolvedLatestDealMessage.value.deal_status
  }

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

const latestDealStatus = computed(() => {
  if (!resolvedLatestDealMessage.value) return null
  return (
    dealStatusOverrides.value[resolvedLatestDealMessage.value.deal_id]
    ?? resolvedLatestDealMessage.value.deal_status
  )
})

const latestDealStatusTimeline = computed<DealStatusTimelineEvent[]>(() => {
  if (!resolvedLatestDealMessage.value) return []

  const currentDeal = resolvedLatestDealMessage.value
  const timelineById: Record<string, DealStatusTimelineEvent> = {
    [`purchase-${currentDeal.deal_id}`]: {
      id: `purchase-${currentDeal.deal_id}`,
      deal_id: currentDeal.deal_id,
      status: currentDeal.deal_status,
      created_at: currentDeal.created_at,
    },
  }

  for (const message of chatMessages.value) {
    if (message.message_type !== 'update_deal_status_message') continue
    if (message.deal_id !== currentDeal.deal_id) continue
    timelineById[message.id] = {
      id: message.id,
      deal_id: message.deal_id,
      status: message.new_status,
      created_at: message.created_at,
    }
  }

  for (const event of Object.values(liveDealStatusEventsById.value)) {
    if (event.deal_id !== currentDeal.deal_id) continue
    timelineById[event.id] = event
  }

  return Object.values(timelineById).sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))
})

const latestDealHasReview = computed(() => {
  if (!resolvedLatestDealMessage.value) return false
  return (
    resolvedLatestDealMessage.value.has_review
    || reviewedDealIds.value.includes(resolvedLatestDealMessage.value.deal_id)
  )
})
const isLatestDealSummaryCollapsible = computed(() => resolvedLatestDealMessage.value !== null)
const floatingDateTopOffsetPx = computed(() => {
  const baseTopPaddingPx = isMobile.value ? 6 : 12
  const gapBelowDealPx = isMobile.value ? 8 : 10
  if (!resolvedLatestDealMessage.value) {
    return baseTopPaddingPx
  }

  return latestDealSummaryHeightPx.value + baseTopPaddingPx + gapBelowDealPx
})
const latestDealTimelinePaddingStyle = computed(() => {
  const baseTopPaddingPx = 8
  if (!resolvedLatestDealMessage.value) {
    return { paddingTop: `${baseTopPaddingPx}px` }
  }

  return {
    paddingTop: `${Math.max(baseTopPaddingPx, latestDealSummaryHeightPx.value + baseTopPaddingPx)}px`,
  }
})
const composerOverlaySpacerStyle = computed(() => {
  const fallbackHeightPx = isMobile.value ? 108 : 120
  const measuredHeightPx = composerOverlayHeightPx.value > 0
    ? Math.ceil(composerOverlayHeightPx.value + 8)
    : fallbackHeightPx

  return {
    height: `${measuredHeightPx}px`,
  }
})

function messageHasDealMetadata(message: ChatTimelineMessage): boolean {
  if (message.message_type !== 'text_message' && message.message_type !== 'image_message') {
    return false
  }
  if (!('data' in message)) {
    return false
  }

  const data = message.data
  return Boolean(
    data
    && (
      typeof data.deal_id === 'string'
      || typeof data.scope_vpn_order_id === 'string'
    ),
  )
}

const hasDealSignals = computed(() => {
  if (resolvedLatestDealMessage.value) {
    return true
  }
  return chatMessages.value.some(message => (
    message.message_type === 'purchase_message'
    || message.message_type === 'price_offer_message' && Boolean(message.accepted_deal_id)
    || messageHasDealMetadata(message)
  ))
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
  if (currentChat.value?.another_user.id) {
    participants.add(currentChat.value.another_user.id)
  }
  return Array.from(participants)
})

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

function toggleLatestDealSummaryCollapse() {
  if (!isLatestDealSummaryCollapsible.value) return
  isDealSummaryCollapsed.value = !isDealSummaryCollapsed.value
}

function updateLatestDealSummaryHeight() {
  latestDealSummaryHeightPx.value = latestDealSummaryRef.value?.offsetHeight ?? 0
}

function reconnectLatestDealSummaryObserver() {
  latestDealSummaryResizeObserver?.disconnect()
  latestDealSummaryResizeObserver = null

  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    updateLatestDealSummaryHeight()
    return
  }

  const element = latestDealSummaryRef.value
  if (!element) {
    latestDealSummaryHeightPx.value = 0
    return
  }

  latestDealSummaryResizeObserver = new ResizeObserver(() => {
    updateLatestDealSummaryHeight()
  })
  latestDealSummaryResizeObserver.observe(element)
  updateLatestDealSummaryHeight()
}

function updateComposerOverlayHeight() {
  composerOverlayHeightPx.value = composerOverlayRef.value?.offsetHeight ?? 0
}

function reconnectComposerOverlayObserver() {
  composerOverlayResizeObserver?.disconnect()
  composerOverlayResizeObserver = null

  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    updateComposerOverlayHeight()
    return
  }

  const element = composerOverlayRef.value
  if (!element) {
    composerOverlayHeightPx.value = 0
    return
  }

  composerOverlayResizeObserver = new ResizeObserver(() => {
    updateComposerOverlayHeight()
  })
  composerOverlayResizeObserver.observe(element)
  updateComposerOverlayHeight()
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

function clearDeferredBottomPinTimers() {
  for (const timeoutId of deferredBottomPinTimeoutIds) {
    clearTimeout(timeoutId)
  }
  deferredBottomPinTimeoutIds = []
}

function clearDeferredDealSummaryMeasureTimers() {
  for (const timeoutId of deferredDealSummaryMeasureTimeoutIds) {
    clearTimeout(timeoutId)
  }
  deferredDealSummaryMeasureTimeoutIds = []
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

function scheduleDeferredDealSummaryMeasurement(chatId: string) {
  clearDeferredDealSummaryMeasureTimers()

  const delays = [0, 40, 120, 260, 520]
  for (const delay of delays) {
    const timeoutId = window.setTimeout(async () => {
      if (selectedChatId.value !== chatId) return
      await nextTick()
      reconnectLatestDealSummaryObserver()
      updateLatestDealSummaryHeight()
    }, delay)

    deferredDealSummaryMeasureTimeoutIds.push(timeoutId)
  }
}

let unsubscribeNewMessage: (() => void) | null = null
let unsubscribeDealStatusUpdate: (() => void) | null = null
let unsubscribeChatUpdated: (() => void) | null = null
let unsubscribeChatNotification: (() => void) | null = null
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
  chatStore.setActive(selectedChatId.value)
  isMessageLimitLockedByServer.value = false
  sendErrorMessage.value = null
  floatingDateLabel.value = null
  resetFloatingDateMergeVisuals()
  isFloatingDateVisible.value = false
  isDealSummaryCollapsed.value = false
  latestDealMessage.value = null
  latestDealSummaryHeightPx.value = 0
  liveDealStatusOverrides.value = {}
  liveDealStatusEventsById.value = {}
  clearDeferredBottomPinTimers()
  clearDeferredDealSummaryMeasureTimers()
  if (floatingDateHideTimerId !== null) {
    clearTimeout(floatingDateHideTimerId)
    floatingDateHideTimerId = null
  }
})

watch([hasReplyFromAnotherUser, hasDealSignals], ([hasReply, hasDeal]) => {
  if (hasReply || hasDeal) {
    isMessageLimitLockedByServer.value = false
  }
})

watch(
  () => [resolvedLatestDealMessage.value?.deal_id ?? null, isDealSummaryCollapsed.value],
  () => {
    void nextTick(() => {
      reconnectLatestDealSummaryObserver()
    })
  },
  { immediate: true },
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

watch(
  () => composerOverlayRef.value,
  () => {
    void nextTick(() => {
      reconnectComposerOverlayObserver()
    })
  },
  { flush: 'post' },
)

watch(
  routeChatId,
  async (chatId) => {
    if (!chatId) return
    if (selectedChatId.value === chatId) return
    if (isPageLoading.value) return

    await ensureChatAvailableForRoute(chatId)
    await loadChatMessages(chatId, { settleToBottomAfterRouteOpen: true })
  }
)

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  hydrateDealScopedSupportAccess()

  try {
    isPageLoading.value = true
    await store.fetchUser()
    user.value = await store.getUser()

    if (!chatsService.isConnected()) {
      await chatsService.connectChatsWebsocket()
    }

    unsubscribeChatUpdated = chatsService.onChatUpdated((update) => {
      applyIncomingChatUpdate(update)
    })
    unsubscribeChatNotification = chatsService.onChatNotification((update) => {
      applyIncomingChatUpdate(update)
    })

    unsubscribeDealStatusUpdate = chatsService.onDealStatusUpdate(message => {
      if (selectedChatId.value !== message.chat_room_id) return
      liveDealStatusOverrides.value = {
        ...liveDealStatusOverrides.value,
        [message.deal_id]: message.new_status,
      }
      liveDealStatusEventsById.value = {
        ...liveDealStatusEventsById.value,
        [message.id]: {
          id: message.id,
          deal_id: message.deal_id,
          status: message.new_status,
          created_at: message.created_at,
        },
      }
    })

    unsubscribeNewMessage = chatsService.onNewMessage(message => {
      resolveLocalPendingMessageEcho(message)
      const supportStatusFromMessage = resolveSupportTicketStatusFromMessage(message)
      if (supportStatusFromMessage === 'closed') {
        markSupportCaseClosedLocally(message.chat_room_id)
      } else if (supportStatusFromMessage === 'open') {
        markSupportCaseOpenedLocally(message.chat_room_id)
      }
      if (selectedChatId.value === message.chat_room_id) {
        if (!chatMessages.value.some(m => m.id === message.id)) {
          const shouldStickToBottom = isNearBottom()
          chatMessages.value.push(message)
          if (message.message_type === 'purchase_message') {
            latestDealMessage.value = pickLatestPurchaseMessage(
              resolvedLatestDealMessage.value,
              message,
            )
          }
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

    const initialRouteChatId = routeChatId.value
    if (initialRouteChatId) {
      await ensureChatAvailableForRoute(initialRouteChatId)
      await loadChatMessages(initialRouteChatId, { settleToBottomAfterRouteOpen: true })
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
  unsubscribeDealStatusUpdate?.()
  unsubscribeChatUpdated?.()
  unsubscribeChatNotification?.()
  unsubscribeMessagesRead?.()
  latestDealSummaryResizeObserver?.disconnect()
  latestDealSummaryResizeObserver = null
  composerOverlayResizeObserver?.disconnect()
  composerOverlayResizeObserver = null
  localPendingMessages.value.forEach(cleanupLocalPendingMessage)
  localPendingMessages.value = []
  clearDeferredBottomPinTimers()
  clearDeferredDealSummaryMeasureTimers()
  bottomPin.stop()
  if (floatingDateRafId !== null) {
    cancelAnimationFrame(floatingDateRafId)
    floatingDateRafId = null
  }
  if (floatingDateHideTimerId !== null) {
    clearTimeout(floatingDateHideTimerId)
    floatingDateHideTimerId = null
  }
  chatStore.setActive(null)
  window.removeEventListener('resize', checkMobile)
})

async function loadChats() {
  chats.value = await chatsService.getChats()
  syncSupportAccessWithChatStatuses()
  chatStore.setChats(chats.value)
}

function applyIncomingChatUpdate(update: ChatUpdateSchema) {
  const chatIndex = chats.value.findIndex((chat) => chat.id === update.chat_id)
  if (chatIndex === -1) {
    return
  }

  const chat = chats.value[chatIndex]
  const previousSupportStatus = resolveSupportTicketStatus(chat)
  const isActiveChat = selectedChatId.value === update.chat_id
  const unreadCount = isActiveChat ? 0 : update.unread_count

  if (update.last_message && chat) {
    if (
      (
        update.last_message.message_type !== 'update_deal_status_message'
        || update.last_message.new_status === 'disputed'
      )
      && shouldApplyLastMessage(chat.last_message ?? null, update.last_message)
    ) {
      chat.last_message = update.last_message
    }
  }

  if (chat && typeof unreadCount === 'number') {
    chat.unread_count = unreadCount
    if (isActiveChat && update.unread_count > 0) {
      void chatsService.markChatRead(update.chat_id)
    }
  }

  if (chat) {
    const statusCandidate = typeof update.support_ticket_status === 'string'
      ? update.support_ticket_status
      : typeof update.support_status === 'string'
        ? update.support_status
        : null

    if (statusCandidate) {
      const normalizedStatus = statusCandidate.trim().toLowerCase() === 'closed' ? 'closed' : 'open'
      chat.support_ticket_status = normalizedStatus
      chat.support_status = normalizedStatus
    }
    if (typeof update.is_closed === 'boolean') {
      chat.is_closed = update.is_closed
    }
    if (typeof update.is_resolved === 'boolean') {
      chat.is_resolved = update.is_resolved
    }

    const nextSupportStatus = resolveSupportTicketStatus(chat)
    const didJustCloseCase = previousSupportStatus !== 'closed' && nextSupportStatus === 'closed'
    if (chat.chat_type === 'support_chat' && didJustCloseCase) {
      revokeDealScopedSupportAccess(chat.id)
    }
  }

  chatStore.updateChatFromSocket(update)
}

async function ensureChatAvailableForRoute(chatId: string): Promise<void> {
  for (const delayMs of routeChatAvailabilityRetryDelaysMs) {
    if (selectedChatId.value === chatId || chats.value.some((chat) => chat.id === chatId)) {
      return
    }

    if (delayMs > 0) {
      await waitMs(delayMs)
      if (selectedChatId.value === chatId || chats.value.some((chat) => chat.id === chatId)) {
        return
      }
    }

    await loadChats()
  }
}

async function refreshRouteOpenedChat(chatId: string): Promise<void> {
  for (const delayMs of routeChatRefreshRetryDelaysMs) {
    await waitMs(delayMs)
    if (selectedChatId.value !== chatId) return

    const response = await chatsService.getChatMessages(chatId, 1, perPage.value)
    if (selectedChatId.value !== chatId) return

    mergeChatMessages(response.messages)

    const latestDealCandidate = response.latestDealMessage ?? getLatestPurchaseMessageFromMessages(response.messages)
    latestDealMessage.value = pickLatestPurchaseMessage(latestDealMessage.value, latestDealCandidate)

    if (response.total > 0) {
      totalMessagesInChat.value = Math.max(totalMessagesInChat.value, response.total)
      totalPages.value = Math.max(totalPages.value, response.totalPages)
      hasMoreMessages.value = currentPage.value < totalPages.value
    }

    if (resolvedLatestDealMessage.value) {
      scheduleDeferredDealSummaryMeasurement(chatId)
      return
    }
  }
}

function scrollToBottom() {
  bottomPin.scrollNow()
}

function pinChatToBottom() {
  return bottomPin.pinFor(1200)
}

function handleSupportFaqUpdated() {
  void nextTick(() => {
    void bottomPin.pinFor(260)
  })
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
  const openedFromDealSupportContext = supportContextFromQuery.value.length > 0

  if (selectedChatId.value === chatId) {
    if (isMobile.value) {
      mobileMode.value = 'chat'
    }
    return
  }

  clearDeferredBottomPinTimers()
  isChatLoading.value = true
  isChatPinning.value = false
  let shouldScrollToBottom = false
  try {
    hasUserScrolledAwayFromTop.value = false
    previousMessageScrollTop.value = 0
    chatMessages.value = []
    isDealSummaryCollapsed.value = false
    latestDealMessage.value = null
    liveDealStatusOverrides.value = {}
    liveDealStatusEventsById.value = {}
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
    chatMessages.value = normalizeMessagesChronological(response.messages)
    const statusFromMessages = resolveSupportTicketStatusFromMessages(chatMessages.value)
    if (openedFromDealSupportContext) {
      markSupportCaseOpenedLocally(chatId)
    } else if (statusFromMessages === 'closed') {
      markSupportCaseClosedLocally(chatId)
    } else if (statusFromMessages === 'open') {
      markSupportCaseOpenedLocally(chatId)
    }
    latestDealMessage.value = response.latestDealMessage ?? getLatestPurchaseMessageFromMessages(chatMessages.value)
    if (resolvedLatestDealMessage.value) {
      scheduleDeferredDealSummaryMeasurement(chatId)
    }
    totalMessagesInChat.value = response.total
    totalPages.value = response.totalPages
    hasMoreMessages.value = 1 < totalPages.value
    chatStore.resetUnread(chatId)
    void chatsService.markChatRead(chatId)
    if (!chats.value.some((chat) => chat.id === chatId)) {
      void ensureChatAvailableForRoute(chatId)
    }

    if (isMobile.value) mobileMode.value = 'chat'
    shouldScrollToBottom = true
    scheduleFloatingDateLabelUpdate()
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
        if (resolvedLatestDealMessage.value) {
          reconnectLatestDealSummaryObserver()
          updateLatestDealSummaryHeight()
          scheduleDeferredDealSummaryMeasurement(chatId)
        }
        scheduleFloatingDateLabelUpdate()
        if (options.settleToBottomAfterRouteOpen) {
          scheduleDeferredBottomPin(chatId)
          void refreshRouteOpenedChat(chatId)
        }
      } finally {
        isChatPinning.value = false
      }
    }
  }
}

function applySendLockState(errorCode?: string) {
  if (errorCode === 'MESSAGE_LIMIT_WAIT_FOR_SELLER_REPLY') {
    isMessageLimitLockedByServer.value = true
    sendErrorMessage.value = null
    return
  }

  if (errorCode === 'SUPPORT_CASE_CLOSED') {
    sendErrorMessage.value = t('pages.chats.supportDealOnlyNotice')
  }
}

function markLocalSendFailed(messageId: string, errorCode?: string) {
  applySendLockState(errorCode)
  markLocalPendingMessageFailed(messageId, errorCode)
}

async function sendLocalTextMessage(message: LocalPendingChatMessage): Promise<{ success: boolean; errorCode?: string }> {
  if (message.message_type !== 'text_message') {
    return { success: false, errorCode: 'SERVER_ERROR' }
  }

  const result = await chatsService.sendMessage(message.text, message.chat_room_id)
  if (!result.success) {
    markLocalSendFailed(message.id, result.errorCode)
    return { success: false, errorCode: result.errorCode }
  }

  if (result.message) {
    const shouldStickToBottom = isNearBottom()
    removeLocalPendingMessage(message.id)

    if (!chatMessages.value.some((item) => item.id === result.message?.id)) {
      chatMessages.value.push(result.message)
      totalMessagesInChat.value = Math.max(
        totalMessagesInChat.value + 1,
        chatMessages.value.length,
      )
    }

    nextTick(() => {
      if (shouldStickToBottom) {
        void bottomPin.pinFor(320)
      }
    })

    chatStore.resetUnread(message.chat_room_id)
    void chatsService.markChatRead(message.chat_room_id)
    return { success: true }
  }

  scheduleLocalPendingMessageEchoFallback(message.id)
  return { success: true }
}

async function sendLocalImageMessage(message: LocalPendingChatMessage): Promise<{ success: boolean; errorCode?: string }> {
  if (message.message_type !== 'image_message') {
    return { success: false, errorCode: 'SERVER_ERROR' }
  }

  const result = await chatsService.sendImages(message.chat_room_id, message.files)
  if (!result.success) {
    markLocalSendFailed(message.id, result.errorCode)
    return { success: false, errorCode: result.errorCode }
  }

  scheduleLocalPendingMessageEchoFallback(message.id)
  return { success: true }
}

async function retryLocalPendingMessage(messageId: string) {
  const message = localPendingMessages.value.find((item) => item.id === messageId)
  if (!message) return

  message.status = 'sending'
  message.error_code = null
  clearLocalPendingEchoTimeout(message)
  sendErrorMessage.value = null

  if (message.message_type === 'text_message') {
    await sendLocalTextMessage(message)
    return
  }

  await sendLocalImageMessage(message)
}

async function sendMessage(payload: { files: File[] }) {
  if (!selectedChatId.value || isSendLocked.value || !user.value) return
  if (isSupportAccessMissing.value) {
    sendErrorMessage.value = t('pages.chats.supportDealOnlyNotice')
    return
  }

  const rawText = newMessage.value.trim()
  const files = payload.files ?? []
  if (!rawText && files.length === 0) return

  const chatId = selectedChatId.value
  const senderId = user.value.id
  const text = rawText

  const pendingTextMessage = text ? createLocalTextPendingMessage(chatId, senderId, text) : null
  const pendingImageMessage = files.length > 0
    ? createLocalImagePendingMessage(chatId, senderId, files)
    : null

  if (pendingTextMessage) {
    localPendingMessages.value.push(pendingTextMessage)
  }
  if (pendingImageMessage) {
    localPendingMessages.value.push(pendingImageMessage)
  }

  newMessage.value = ''
  sendErrorMessage.value = null
  nextTick(() => {
    void bottomPin.pinFor(320)
  })

  if (pendingTextMessage) {
    const textResult = await sendLocalTextMessage(pendingTextMessage)
    if (!textResult.success) {
      if (pendingImageMessage) {
        markLocalSendFailed(pendingImageMessage.id, textResult.errorCode)
      }
      return
    }
  }

  if (pendingImageMessage) {
    await sendLocalImageMessage(pendingImageMessage)
  }
}
</script>


<template>
  <div class="h-full w-full flex flex-col overflow-x-hidden overscroll-none md:pt-6">
    <div v-if="isPageLoading" class="flex flex-1 items-center justify-center text-[var(--text-body)]">
      <Loader />
    </div>

    <div v-else-if="pageErrorMessage" class="flex flex-1 items-center justify-center text-[var(--text-danger)]">
      {{ pageErrorMessage }}
    </div>

    <div v-else class="w-full flex flex-1 overflow-hidden">
      <div v-if="!isMobile || (isMobile && mobileMode === 'chats')"
        class="md:h-full lg:max-w-sm flex flex-col md:pr-5 transition-all duration-300 min-h-0" :class="[
          isMobile && mobileMode === 'chats'
            ? 'fixed inset-x-0 top-0 bottom-14 z-10 w-full bg-background'
            : 'w-3/12',
        ]">
        <div class="h-full flex flex-col border-[rgb(var(--palette-dark-600))] lg:border-1 md:rounded-3xl" :class="{
          'pt-[calc(var(--app-mobile-header-height)+0.5rem)]': isMobile && mobileMode === 'chats',
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
              <p class="text-sm text-[var(--text-muted)] font-light">
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
            : 'flex-1 w-9/12 border-1 border-[rgb(var(--palette-dark-400))] rounded-3xl overflow-hidden',
        ]">
        <div class="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 md:rounded-xl" :class="{
          'pb-16': isMobile && mobileMode === 'chat',
          'pt-[calc(var(--app-mobile-header-height)+0.5rem)]': isMobile && mobileMode === 'chat',
        }">
          <div class="flex w-full min-w-0 flex-grow flex-col overflow-hidden">
            <div v-if="currentChat"
              class="sticky top-0 z-10 mx-1 flex items-center gap-2 bg-background px-2 py-1.5 lg:mx-2 lg:border-b lg:border-[rgb(var(--palette-dark-700))] lg:px-3 lg:py-3">
              <button v-if="isMobile" class="flex h-7 w-7 flex-shrink-0 items-center justify-center"
                @click="backToChats">
                <ArrowLeft />
              </button>
              <button v-if="currentChat" type="button"
                class="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg transition bg-[var(--transparent)] border-0 p-0"
                :class="isSupportChat ? 'cursor-default' : 'cursor-pointer focus:outline-none'"
                :disabled="isSupportChat" @click="openChatProfile">
                <!-- Аватар чата -->
                <div class="h-7 w-7 lg:h-10 lg:w-10 flex items-center justify-center flex-shrink-0">
                  <!-- Для чата поддержки - иконка на синем фоне -->
                  <div v-if="isSupportChat"
                    class="h-7 w-7 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-[rgb(var(--palette-blue-500)/0.2)] border-2 border-[rgb(var(--palette-blue-500)/0.3)]">
                    <Headphones class="w-4 h-4 lg:w-5 lg:h-5 text-[var(--text-link)]" />
                  </div>
                  <!-- Для обычного чата - фото или инициалы -->
                  <UserAvatar v-else :avatar-url="chatDisplayAvatarUrl" :alt="chatDisplayName"
                    class="h-7 w-7 lg:h-10 lg:w-10 border-2 border-[rgb(var(--palette-dark-600))] rounded-full object-cover" />
                </div>

                <!-- Информация о чате -->
                <div class="flex min-w-0 flex-col justify-center">
                  <!-- Имя чата -->
                  <p v-if="isSupportChat" class="truncate font-semibold text-base text-[var(--text-link)] lg:text-lg">
                    {{ chatDisplayName }}
                  </p>
                  <div v-else class="w-full min-w-0 truncate">
                    <StyledUsername :username="chatDisplayName" :style-id="currentChat?.another_user.nickname_style_id"
                      class="text-base font-semibold leading-tight lg:text-lg" />
                  </div>
                  <p class="mt-0.5 text-[11px] leading-none"
                    :class="isChatDisplayOnline ? 'text-[var(--text-success-strong)]' : 'text-[var(--text-meta)]'">
                    {{ chatDisplayStatus }}
                  </p>
                </div>
              </button>
            </div>

            <div class="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
              <FloatingDateHeader
                :label="floatingDateDisplayLabel"
                :opacity="floatingDateOpacity"
                :offset-y="floatingDateOffsetY"
              />
              <div v-if="currentChat && resolvedLatestDealMessage"
                class="pointer-events-none absolute inset-x-0 top-0 z-10 px-1.5 pt-1.5 lg:px-4 lg:pt-3">
                <div ref="latestDealSummaryRef"
                  class="message-compose-shell pointer-events-auto flex items-start rounded-[22px] border border-[rgb(var(--palette-white)/0.1)] bg-background/90 px-2 py-1.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 lg:rounded-[26px] lg:px-3 lg:py-2.5">
                  <NewPurchaseMessage :product="resolvedLatestDealMessage.product" :deal-id="resolvedLatestDealMessage.deal_id"
                    :deal-status="latestDealStatus" :has_review="latestDealHasReview" layout="summary"
                    :created-at="resolvedLatestDealMessage.created_at"
                    :deal-status-timeline="latestDealStatusTimeline"
                    :collapsed="isDealSummaryCollapsed" :collapsible="isLatestDealSummaryCollapsible"
                    @toggle-collapse="toggleLatestDealSummaryCollapse" />
                </div>
              </div>
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

                    <div v-if="chatTimelineItems.length > 0" class="flex min-w-0 flex-1 flex-col justify-start">
                      <div class="flex min-w-0 flex-col pb-18" :style="latestDealTimelinePaddingStyle">
                        <template v-for="item in chatTimelineItems" :key="item.message.id">
                          <div
                            v-if="item.showDateDivider && item.dateLabel"
                            class="flex justify-center py-2"
                            data-chat-date-divider
                            :data-chat-date-key="item.dateKey ?? ''"
                          >
                            <span class="rounded-full border border-[rgb(var(--palette-dark-600)/0.7)] bg-[rgb(var(--palette-dark-900)/0.7)] px-3 py-1 text-xs font-medium text-mainText/90">
                              {{ item.dateLabel }}
                            </span>
                          </div>

                          <div :class="item.spacingClass" :data-chat-message-index="item.index"
                            :data-chat-date-key="item.dateKey ?? ''">
                            <PendingChatMessage v-if="item.isLocal" :message="item.message as LocalPendingChatMessage"
                              :format-date="formatPendingMessageDate" @retry="retryLocalPendingMessage" />
                            <ChatMessage v-else :message="item.message as ChatMessageUnion" :user="user"
                              :showAdminBadge="shouldShowAdminBadge" :chat-participant-ids="chatParticipantIds"
                              :deal-status-overrides="dealStatusOverrides" :reviewed-deal-ids="reviewedDealIds" />
                          </div>
                        </template>
                      </div>
                    </div>

                    <div v-else-if="selectedChatId != null && chatMessages.length === 0 && !(isSupportChat && isSupportAccessMissing)"
                      class="h-full w-full flex items-center justify-center">
                      <div v-if="isSupportChat"
                        class="flex flex-col items-center justify-center gap-4 text-center px-4">
                        <div class="text-4xl">💬</div>
                        <p class="text-lg text-mainText font-semibold">{{ $t("pages.chats.emptySupport") }}</p>
                        <p class="text-[var(--text-muted)] text-sm">{{ $t("pages.chats.emptySupportDesc") }}</p>
                      </div>
                      <p v-else class="text-[var(--text-muted)] font-light">{{ $t("pages.chats.emptyMessages") }}</p>
                    </div>

                    <div v-else-if="selectedChatId === null" class="h-full w-full flex items-center justify-center">
                      <p class="text-[var(--text-muted)] font-light">{{ $t('pages.chats.selectChat') }}</p>
                    </div>

                    <div v-if="selectedChatId && isSupportChat && isSupportAccessMissing" class="px-1.5 pb-32 md:pb-28 lg:px-4">
                      <SupportFaqAssistant :chat-id="selectedChatId" @faq-updated="handleSupportFaqUpdated" />
                    </div>

                  </div>
                </template>

                <div
                  v-if="selectedChatId"
                  aria-hidden="true"
                  class="w-full flex-none"
                  :style="composerOverlaySpacerStyle"
                />
              </div>

              <div ref="composerOverlayRef" v-if="selectedChatId"
                class="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-[var(--transparent)] px-1 pb-1 pt-0 md:pb-2">
                <div v-if="lockReminderText" class="pointer-events-auto mx-1 mb-2 rounded-xl border px-3 py-2 text-sm"
                  :class="lockReminderType === 'sender'
                    ? 'border-[rgb(var(--palette-amber-400)/0.4)] bg-[rgb(var(--palette-amber-500)/0.1)] text-[var(--text-warning)]'
                    : 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'">
                  {{ lockReminderText }}
                </div>
                <div v-if="sendErrorMessage"
                  class="pointer-events-auto mx-1 mb-2 rounded-xl border border-[rgb(var(--palette-red-500)/0.4)] bg-[rgb(var(--palette-red-500)/0.1)] px-3 py-2 text-sm text-[var(--text-danger)]">
                  {{ sendErrorMessage }}
                </div>
                <div v-if="isSupportAccessMissing"
                  class="pointer-events-auto mx-1 mb-2 rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-900)/0.65)] px-3 py-2 text-sm text-[var(--text-meta)]">
                  {{ $t('pages.chats.supportDealOnlyNotice') }}
                </div>
                <div class="pointer-events-auto">
                  <SendMessageBar
                    v-model:newMessage="newMessage"
                    :disabled="isComposerDisabled"
                    :placeholder="isSupportAccessMissing ? $t('pages.chats.faqInputPlaceholder') : undefined"
                    @sendMessage="sendMessage"
                  />
                </div>
              </div>

              <div v-if="isChatPinning" class="absolute inset-0 z-10 flex items-center justify-center bg-background">
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
