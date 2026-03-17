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
import { useNotificationStore } from '@/stores/notification'
import type { InboxNotification } from '@/validation/user/inboxNotifications'
import { formatCurrencyAmount } from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const unreadTotal = computed(() => notificationStore.unreadTotal)
const notifications = computed(() => notificationStore.sortedItems)

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
  }
}

function closeMenu() {
  isOpen.value = false
}

function markAllAsRead() {
  void notificationStore.markAllAsRead()
}

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

function getNotificationBody(item: InboxNotification): string {
  if (item.body_i18n_key) {
    const translated = t(item.body_i18n_key, normalizeBodyParams(item))
    if (translated !== item.body_i18n_key) {
      return translated
    }
  }

  const payload = item.payload ?? {}
  if (typeof payload.product_title === 'string' && payload.product_title.trim().length > 0) {
    return payload.product_title
  }
  if (typeof payload.text === 'string' && payload.text.trim().length > 0) {
    return payload.text
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

function getIconComponent(item: InboxNotification) {
  switch (item.event_type) {
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
      class="relative flex h-8 w-8 items-center justify-center rounded-md border border-dark-700 bg-dark-600 text-mainText transition hover:border-dark-500 focus:outline-none"
      @click="toggleMenu"
    >
      <Bell class="h-3.5 w-3.5 text-mainText/70" />
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
        <div class="flex items-center justify-between border-b border-dark-700 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-white">{{ t('common.notifications.title') }}</p>
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
                {{ getNotificationMeta(item) }}
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
