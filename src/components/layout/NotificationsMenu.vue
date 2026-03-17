<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import {
  Bell,
  CheckCheck,
  MessageCircle,
  ShoppingBag,
  Tag,
  CircleDot,
  Star,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-vue-next'
import { useNotificationStore, type InboxNotificationItem } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { formatCurrencyAmount } from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const unreadTotal = computed(() => notificationStore.unreadTotal)
const notifications = computed(() => notificationStore.sortedItems)

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function markAllAsRead() {
  notificationStore.markAllAsRead()
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getNotificationTitle(item: InboxNotificationItem): string {
  const message = item.message

  switch (message.message_type) {
    case 'purchase_message': {
      const currentUsername = user.value?.username ?? ''
      const isSeller = message.product.seller.username === currentUsername
      return isSeller
        ? t('common.notifications.types.newSale')
        : t('common.notifications.types.newPurchase')
    }
    case 'price_offer_message':
      return t('common.notifications.types.newPriceOffer')
    case 'update_deal_status_message':
      return t('common.notifications.types.dealStatusUpdated')
    case 'review_message':
      return t('common.notifications.types.newReview')
    case 'image_message':
      return t('common.notifications.types.newImageMessage')
    case 'text_message':
      return message.is_admin_message
        ? t('common.notifications.types.newSupportMessage')
        : t('common.notifications.types.newChatMessage')
    default:
      return t('common.notifications.types.generic')
  }
}

function resolveMessageByI18nKey(item: InboxNotificationItem): string | null {
  if (item.message.message_type !== 'text_message') return null
  const i18nKey = item.message.data?.i18n_key
  if (!i18nKey || typeof i18nKey !== 'string') return null

  const translated = t(i18nKey, item.message.data ?? {})
  return translated === i18nKey ? null : translated
}

function getNotificationBody(item: InboxNotificationItem): string {
  const message = item.message
  switch (message.message_type) {
    case 'purchase_message':
      return message.product.title
    case 'price_offer_message':
      return t('common.notifications.body.priceOffer', {
        product: message.product.title,
        price: formatCurrencyAmount(message.offered_price),
      })
    case 'update_deal_status_message':
      return t('common.notifications.body.dealStatus', {
        product: message.product.title,
        status: t(`common.dealStatuses.${message.new_status}`),
      })
    case 'review_message':
      return message.review.body || t('pages.chats.withoutReviewText')
    case 'image_message':
      return t('pages.chats.imageMessage')
    case 'text_message': {
      const translated = resolveMessageByI18nKey(item)
      if (translated) return translated
      return message.text || t('common.notifications.body.empty')
    }
    default:
      return t('common.notifications.body.empty')
  }
}

function getIconComponent(item: InboxNotificationItem) {
  switch (item.message.message_type) {
    case 'purchase_message':
      return ShoppingBag
    case 'price_offer_message':
      return Tag
    case 'update_deal_status_message':
      return CircleDot
    case 'review_message':
      return Star
    case 'image_message':
      return ImageIcon
    case 'text_message':
      return item.message.is_admin_message ? ShieldAlert : MessageCircle
    default:
      return Bell
  }
}

function openNotification(item: InboxNotificationItem) {
  notificationStore.markAsRead(item.id)
  closeMenu()
  void router.push({ name: 'chats', query: { chatId: item.chat_id } })
}

function handleOutsideClick(event: MouseEvent) {
  if (!isOpen.value || !rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  closeMenu()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
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
      class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-dark-700 bg-dark-800/80 text-gray-200 transition hover:border-dark-500 hover:text-white"
      @click="toggleMenu"
    >
      <Bell class="h-4.5 w-4.5" />
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
        class="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-2xl border border-dark-700 bg-dark-900/98 shadow-2xl backdrop-blur"
      >
        <div class="flex items-center justify-between border-b border-dark-700 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-white">{{ t('common.notifications.title') }}</p>
            <p class="text-xs text-gray-400">{{ t('common.notifications.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-dark-600 px-2 py-1 text-[11px] text-gray-300 transition hover:border-dark-500 hover:text-white disabled:opacity-60"
            :disabled="unreadTotal === 0"
            @click="markAllAsRead"
          >
            <CheckCheck class="h-3.5 w-3.5" />
            {{ t('common.notifications.markAllRead') }}
          </button>
        </div>

        <div v-if="notifications.length === 0" class="px-4 py-8 text-center">
          <p class="text-sm text-gray-300">{{ t('common.notifications.empty') }}</p>
        </div>

        <div v-else class="max-h-[360px] overflow-y-auto">
          <button
            v-for="item in notifications"
            :key="item.id"
            type="button"
            class="group flex w-full items-start gap-3 border-b border-dark-800/80 px-4 py-3 text-left transition hover:bg-dark-800/80"
            @click="openNotification(item)"
          >
            <div
              class="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-dark-600 bg-dark-800 text-gray-300 group-hover:text-white"
            >
              <component :is="getIconComponent(item)" class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-white">
                  {{ getNotificationTitle(item) }}
                </p>
                <span
                  v-if="!item.is_read"
                  class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400"
                />
              </div>
              <p class="mt-0.5 truncate text-xs text-gray-400">
                {{ item.chat_title || t('common.notifications.chatFallback') }}
              </p>
              <p class="mt-1 line-clamp-2 text-xs text-gray-300">
                {{ getNotificationBody(item) }}
              </p>
              <p class="mt-1 text-[11px] text-gray-500">{{ formatDate(item.created_at) }}</p>
            </div>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
