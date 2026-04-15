<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import {
  Bell,
  CheckCheck,
  MoreHorizontal,
  Settings,
  Trash2,
  MessageCircle,
  ShoppingBag,
  Tag,
  CircleDot,
  Star,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'
import type { InboxNotification } from '@/validation/user/inboxNotifications'
import { formatCurrencyAmount } from '@/utils/currency'
import ConfirmWindow from '@/components/ConfirmWindow.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isActionsMenuOpen = ref(false)
const showUnreadOnly = ref(false)
const isClearConfirmOpen = ref(false)

const DAY_MS = 24 * 60 * 60 * 1000
const MESSAGE_PREVIEW_MAX_LENGTH = 20
const DISPUTE_REASON_PREVIEW_MAX_LENGTH = 80

type NotificationBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'
type NotificationBadge = {
  label: string
  tone: NotificationBadgeTone
}
type NotificationGroupKey = 'today' | 'yesterday' | 'earlier'

const unreadTotal = computed(() => notificationStore.unreadTotal)
const notifications = computed(() => notificationStore.sortedItems)
const filteredNotifications = computed(() => (
  showUnreadOnly.value
    ? notifications.value.filter((item) => !item.is_read)
    : notifications.value
))

function normalizeBodyParams(item: InboxNotification): Record<string, unknown> {
  const source = item.body_i18n_params ?? {}
  const params: Record<string, unknown> = { ...source }

  const statusKey = params.status_key
  if (typeof statusKey === 'string') {
    params.status = t(statusKey)
    delete params.status_key
  }

  const priceAmount = params.price_amount
  if (typeof priceAmount === 'number') {
    params.price = formatCurrencyAmount(priceAmount)
    delete params.price_amount
  }

  return params
}

function toggleMenu() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    void notificationStore.loadInbox()
  } else {
    isActionsMenuOpen.value = false
  }
}

function closeMenu() {
  isOpen.value = false
  isActionsMenuOpen.value = false
}

function markAllAsRead() {
  isActionsMenuOpen.value = false
  void notificationStore.markAllAsRead()
}

function requestClearNotificationsList() {
  isActionsMenuOpen.value = false
  isClearConfirmOpen.value = true
}

function confirmClearNotificationsList() {
  isClearConfirmOpen.value = false
  void notificationStore.clearInbox()
}

function cancelClearNotificationsList() {
  isClearConfirmOpen.value = false
}

function openNotificationsSettings() {
  isActionsMenuOpen.value = false
  closeMenu()
  void router.push({ name: 'settings', query: { section: 'notifications' } })
}

function toggleActionsMenu() {
  isActionsMenuOpen.value = !isActionsMenuOpen.value
}

function getDateGroupKey(value: string): NotificationGroupKey {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'earlier'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - DAY_MS

  if (timestamp >= todayStart) return 'today'
  if (timestamp >= yesterdayStart) return 'yesterday'
  return 'earlier'
}

function getDateGroupLabel(key: NotificationGroupKey): string {
  switch (key) {
    case 'today':
      return t('pages.chats.today')
    case 'yesterday':
      return t('pages.chats.yesterday')
    default:
      return t('common.notifications.earlier')
  }
}

const notificationGroups = computed(() => {
  const groups: Record<NotificationGroupKey, InboxNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }

  for (const item of filteredNotifications.value) {
    const key = getDateGroupKey(item.created_at)
    groups[key].push(item)
  }

  return (['today', 'yesterday', 'earlier'] as NotificationGroupKey[])
    .map((key) => ({
      key,
      label: getDateGroupLabel(key),
      items: groups[key],
    }))
    .filter((group) => group.items.length > 0)
})

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getNotificationTitle(item: InboxNotification): string {
  const translated = t(item.title_i18n_key)
  return translated === item.title_i18n_key
    ? t('common.notifications.types.generic')
    : translated
}

function isMessagePreviewEvent(item: InboxNotification): boolean {
  return item.event_type === 'new_chat_message' || item.event_type === 'new_support_message'
}

function truncateWithEllipsis(value: string, maxLength: number): string {
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function applyMessagePreviewLimit(item: InboxNotification, value: string): string {
  return isMessagePreviewEvent(item)
    ? truncateWithEllipsis(value, MESSAGE_PREVIEW_MAX_LENGTH)
    : value
}

function getNotificationBody(item: InboxNotification): string {
  if (item.event_type === 'new_review') {
    return ''
  }

  if (item.event_type === 'dispute_resolved') {
    const params = item.body_i18n_params ?? {}
    const payload = item.payload ?? {}

    const product = typeof params.product === 'string' && params.product.trim().length > 0
      ? params.product.trim()
      : typeof payload.product_title === 'string' && payload.product_title.trim().length > 0
        ? payload.product_title.trim()
        : ''

    const reasonRaw = typeof params.reason === 'string' && params.reason.trim().length > 0
      ? params.reason.trim()
      : typeof payload.dispute_reason === 'string' && payload.dispute_reason.trim().length > 0
        ? payload.dispute_reason.trim()
        : ''

    const reason = reasonRaw
      ? truncateWithEllipsis(reasonRaw, DISPUTE_REASON_PREVIEW_MAX_LENGTH)
      : ''

    if (product && reason) return `${product} • ${reason}`
    if (reason) return reason
    if (product) return product
  }

  if (item.event_type === 'deal_status_updated') {
    const params = item.body_i18n_params ?? {}
    if (typeof params.product === 'string' && params.product.trim().length > 0) {
      return params.product
    }
    const payload = item.payload ?? {}
    if (typeof payload.product_title === 'string' && payload.product_title.trim().length > 0) {
      return payload.product_title
    }
  }

  if (item.body_i18n_key) {
    const translated = t(item.body_i18n_key, normalizeBodyParams(item))
    if (translated !== item.body_i18n_key) {
      return applyMessagePreviewLimit(item, translated)
    }
  }

  const payload = item.payload ?? {}
  if (typeof payload.product_title === 'string' && payload.product_title.trim().length > 0) {
    return applyMessagePreviewLimit(item, payload.product_title)
  }
  if (typeof payload.text === 'string' && payload.text.trim().length > 0) {
    return applyMessagePreviewLimit(item, payload.text)
  }
  return t('common.notifications.body.empty')
}

function getNotificationMeta(item: InboxNotification): string {
  const payload = item.payload ?? {}
  if (typeof payload.sender_username === 'string' && payload.sender_username.trim().length > 0) {
    return payload.sender_username
  }
  if (typeof payload.product_title === 'string' && payload.product_title.trim().length > 0) {
    return payload.product_title
  }
  return t('common.notifications.chatFallback')
}

function getStatusInfo(item: InboxNotification): { key: string; value: string } | null {
  const bodyParams = item.body_i18n_params ?? {}
  const statusKeyFromBody = bodyParams.status_key
  if (typeof statusKeyFromBody === 'string' && statusKeyFromBody.length > 0) {
    const statusValue = statusKeyFromBody.split('.').pop() ?? ''
    return { key: statusKeyFromBody, value: statusValue }
  }

  const payload = item.payload ?? {}
  const productStatus = payload.product_status
  if (typeof productStatus === 'string' && productStatus.length > 0) {
    return { key: `common.productStatuses.${productStatus}`, value: productStatus }
  }

  const dealStatus = payload.new_status
  if (typeof dealStatus === 'string' && dealStatus.length > 0) {
    return { key: `common.dealStatuses.${dealStatus}`, value: dealStatus }
  }

  const offerStatus = payload.offer_status
  if (typeof offerStatus === 'string' && offerStatus.length > 0) {
    return { key: `pages.chats.priceOfferStatuses.${offerStatus}`, value: offerStatus }
  }

  return null
}

function getStatusTone(statusValue: string): NotificationBadgeTone {
  switch (statusValue) {
    case 'active':
    case 'accepted':
    case 'confirmed':
    case 'completed':
      return 'success'
    case 'pending':
    case 'moderation':
      return 'warning'
    case 'rejected':
    case 'cancelled':
    case 'disputed':
    case 'deleted':
    case 'expired':
      return 'danger'
    case 'refunded':
      return 'accent'
    default:
      return 'info'
  }
}

function getContextBadge(item: InboxNotification): NotificationBadge | null {
  switch (item.event_type) {
    case 'dispute_resolved':
      return { label: t('common.notifications.labels.resolved'), tone: 'success' }
    case 'product_status_updated':
      return { label: t('common.notifications.labels.product'), tone: 'neutral' }
    case 'new_price_offer':
    case 'price_offer_status_updated':
      return { label: t('common.notifications.labels.priceOffer'), tone: 'info' }
    case 'seller_new_product':
      return { label: t('common.notifications.labels.newProduct'), tone: 'info' }
    default:
      return null
  }
}

function getStatusBadge(item: InboxNotification): NotificationBadge | null {
  const statusInfo = getStatusInfo(item)
  if (!statusInfo) return null

  const translatedStatus = t(statusInfo.key)
  const label = translatedStatus === statusInfo.key
    ? statusInfo.value
    : translatedStatus

  return {
    label,
    tone: getStatusTone(statusInfo.value),
  }
}

function getNotificationBadges(item: InboxNotification): NotificationBadge[] {
  const badges: NotificationBadge[] = []
  const contextBadge = getContextBadge(item)
  const statusBadge = getStatusBadge(item)

  if (contextBadge) {
    badges.push(contextBadge)
  }
  if (statusBadge) {
    badges.push(statusBadge)
  }

  return badges
}

function getBadgeClasses(tone: NotificationBadgeTone): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
    case 'warning':
      return 'border-amber-400/35 bg-amber-500/10 text-amber-200'
    case 'danger':
      return 'border-red-400/35 bg-red-500/10 text-red-200'
    case 'accent':
      return 'border-purple-400/35 bg-purple-500/10 text-purple-200'
    case 'info':
      return 'border-sky-400/35 bg-sky-500/10 text-sky-200'
    default:
      return 'border-white/20 bg-white/[0.05] text-gray-200'
  }
}

function getIconComponent(item: InboxNotification) {
  switch (item.event_type) {
    case 'dispute_resolved':
      return ShieldAlert
    case 'new_purchase':
    case 'new_sale':
      return ShoppingBag
    case 'new_price_offer':
    case 'price_offer_status_updated':
      return Tag
    case 'deal_status_updated':
      return CircleDot
    case 'new_review':
      return Star
    case 'new_support_message':
    case 'product_status_updated':
      return ShieldAlert
    case 'new_image_message':
      return ImageIcon
    case 'new_chat_message':
      return MessageCircle
    default:
      return Bell
  }
}

function shouldShowUnreadDot(item: InboxNotification): boolean {
  if (item.is_read) return false
  if (item.event_type === 'new_purchase') return false
  return true
}

function openNotification(item: InboxNotification) {
  void notificationStore.markAsRead(item.id)
  closeMenu()

  if (item.target_url) {
    void router.push(item.target_url)
    return
  }

  const chatId = item.payload?.chat_id
  if (typeof chatId === 'string' && chatId.length > 0) {
    void router.push({ name: 'chats', query: { chatId } })
  }
}

function handleOutsideClick(event: MouseEvent) {
  if (!isOpen.value || !rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  closeMenu()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (isActionsMenuOpen.value) {
    isActionsMenuOpen.value = false
    return
  }
  closeMenu()
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="relative flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-transparent text-gray-200 transition-colors duration-200 hover:border-gray-600 hover:text-white focus:outline-none"
      @click="toggleMenu"
    >
      <Bell class="h-3.5 w-3.5 text-current opacity-80" />
      <span
        v-if="unreadTotal > 0"
        class="absolute -right-1 -top-1 inline-flex min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white"
      >
        {{ unreadTotal > 99 ? '99+' : unreadTotal }}
      </span>
    </button>

    <transition
      enter-active-class="transition duration-120 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed left-2 right-2 top-16 z-50 w-auto overflow-hidden rounded-2xl border border-dark-700 bg-dark-900/98 shadow-2xl backdrop-blur md:absolute md:left-auto md:right-0 md:top-11 md:w-[340px]"
      >
        <div class="flex items-center justify-between gap-3 border-b border-dark-700 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white">{{ t('common.notifications.title') }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-dark-700/90 bg-dark-800/70 px-2 py-1 text-[11px] text-gray-300 transition hover:border-dark-500 hover:text-white disabled:opacity-60"
              :disabled="unreadTotal === 0"
              @click="markAllAsRead"
            >
              <CheckCheck class="h-3.5 w-3.5" />
              {{ t('common.notifications.markAllRead') }}
            </button>

            <div class="relative">
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-dark-700/90 bg-dark-800/70 text-gray-400 transition hover:border-dark-500 hover:text-white"
                :aria-label="t('common.notifications.actions')"
                :title="t('common.notifications.actions')"
                @click.stop="toggleActionsMenu"
              >
                <MoreHorizontal class="h-3.5 w-3.5" />
              </button>

              <transition
                enter-active-class="transition duration-120 ease-out"
                enter-from-class="translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="translate-y-1 opacity-0"
              >
                <div
                  v-if="isActionsMenuOpen"
                  class="absolute right-0 top-9 z-20 w-[180px] overflow-hidden rounded-lg border border-dark-700 bg-dark-900/98 py-1 shadow-xl"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 transition hover:bg-dark-800/80 hover:text-white"
                    @click="openNotificationsSettings"
                  >
                    <Settings class="h-3.5 w-3.5" />
                    <span>{{ t('common.settings') }}</span>
                  </button>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 transition hover:bg-dark-800/80 hover:text-white disabled:opacity-50"
                    :disabled="notifications.length === 0"
                    @click="requestClearNotificationsList"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>{{ t('common.notifications.clearList') }}</span>
                  </button>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="border-b border-dark-800/80 px-4 py-2">
          <div class="inline-flex rounded-lg border border-dark-700/80 bg-dark-800/55 p-0.5">
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[11px] font-medium transition"
              :class="showUnreadOnly ? 'text-gray-400 hover:text-gray-200' : 'bg-dark-700/80 text-white'"
              @click="showUnreadOnly = false"
            >
              {{ t('common.all') }}
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[11px] font-medium transition"
              :class="showUnreadOnly ? 'bg-dark-700/80 text-white' : 'text-gray-400 hover:text-gray-200'"
              @click="showUnreadOnly = true"
            >
              {{ t('common.filters.unread') }}
            </button>
          </div>
        </div>

        <div v-if="filteredNotifications.length === 0" class="px-4 py-8 text-center">
          <p class="text-sm text-gray-300">
            {{ showUnreadOnly ? t('common.notifications.emptyUnread') : t('common.notifications.empty') }}
          </p>
        </div>

        <div v-else class="max-h-[360px] overflow-y-auto">
          <template v-for="group in notificationGroups" :key="group.key">
            <div class="border-b border-dark-800/70 bg-dark-900/85 px-4 py-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                {{ group.label }}
              </p>
            </div>

            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="group flex w-full items-start gap-3 border-b border-dark-800/75 px-4 py-3.5 text-left transition-colors hover:bg-dark-800/55"
              @click="openNotification(item)"
            >
              <div
                class="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-dark-700 bg-dark-800/85 text-gray-300 transition-colors group-hover:border-dark-500 group-hover:text-white"
              >
                <component :is="getIconComponent(item)" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start gap-2">
                  <p class="truncate text-[15px] font-semibold leading-5 text-white">
                    {{ getNotificationTitle(item) }}
                  </p>
                  <span
                    v-if="shouldShowUnreadDot(item)"
                    class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400"
                  />
                </div>
                <div v-if="getNotificationBadges(item).length" class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    v-for="(badge, badgeIndex) in getNotificationBadges(item)"
                    :key="`${item.id}-${badge.label}-${badgeIndex}`"
                    class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 tracking-[0.01em]"
                    :class="getBadgeClasses(badge.tone)"
                  >
                    {{ badge.label }}
                  </span>
                </div>
                <p
                  v-if="getNotificationBody(item)"
                  class="mt-1.5 line-clamp-2 break-all text-[13px] leading-[1.35] text-gray-300"
                >
                  {{ getNotificationBody(item) }}
                </p>
                <div class="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span class="truncate max-w-[130px]">{{ getNotificationMeta(item) }}</span>
                  <span class="text-gray-600">•</span>
                  <span class="whitespace-nowrap">{{ formatDate(item.created_at) }}</span>
                </div>
              </div>
            </button>
          </template>
        </div>
      </div>
    </transition>

    <ConfirmWindow
      :is-open="isClearConfirmOpen"
      :title="t('common.notifications.clearConfirmTitle')"
      :message="t('common.notifications.clearConfirmMessage')"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      @confirm="confirmClearNotificationsList"
      @cancel="cancelClearNotificationsList"
    />
  </div>
</template>
