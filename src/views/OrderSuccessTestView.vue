<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import { productService } from '@/api/product/ProductService'
import { reviewService } from '@/api/review/ReviewService'
import AppModal from '@/components/AppModal.vue'
import Loader from '@/components/Loader.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import type { Product } from '@/validation/product/product'
import type { PurchaseMessage } from '@/validation/chat/chatMessage'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, HelpCircle, MessageCircle, Send, Star } from 'lucide-vue-next'
import { formatCurrencyAmount } from '@/utils/currency'
import { getShortDealId } from '@/utils/dealId'

const API_HOST = import.meta.env.VITE_API_HOST || ''
const partyPopperSrc = '/party-popper.webp'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const latestDealMessage = ref<PurchaseMessage | null>(null)
const loadError = ref<string | null>(null)
const hasReview = ref(false)
const sellerDealsCountOverride = ref<number | null>(null)

const showReviewModal = ref(false)
const reviewStars = ref(0)
const reviewText = ref('')
const reviewSubmitting = ref(false)
const reviewError = ref<string | null>(null)
const showSupportModal = ref(false)
const supportChatOpening = ref(false)
const supportChatCooldownActive = ref(false)
let supportChatCooldownTimer: ReturnType<typeof setTimeout> | null = null

const SUPPORT_TELEGRAM_URL = 'https://t.me/remarketgg'
const SUPPORT_EMAIL = 'support@re-market.net'

const dealId = computed(() => {
  const rawDealId = route.query.dealId
  if (Array.isArray(rawDealId)) return rawDealId[0] ?? null
  return latestDealMessage.value?.deal_id ?? rawDealId ?? null
})

const chatId = computed(() => {
  const rawChatId = route.query.chatId
  if (Array.isArray(rawChatId)) return rawChatId[0] ?? null
  return rawChatId ?? latestDealMessage.value?.chat_room_id ?? null
})

const isReviewEntry = computed(() => route.query.review === '1' || route.query.mode === 'review')
const showCongratulations = computed(() => (
  !isReviewEntry.value || currentDealStatus.value === 'completed'
))
const product = computed<Product | null>(() => latestDealMessage.value?.product ?? null)
const seller = computed(() => product.value?.seller ?? null)
const currentDealStatus = computed(() => {
  if (latestDealMessage.value?.deal_status) return latestDealMessage.value.deal_status
  if (isReviewEntry.value && dealId.value) return 'completed'
  return null
})
const isDealCompleted = computed(() => currentDealStatus.value === 'completed')
const canLeaveReview = computed(() => Boolean(dealId.value && isDealCompleted.value && !hasReview.value))
const canShowReviewSection = computed(() => canLeaveReview.value || hasReview.value)

const orderIdLabel = computed(() => {
  const shortDealId = getShortDealId(dealId.value)
  return shortDealId ? `RM${shortDealId}` : null
})
const supportContextMessage = computed(() => {
  const orderReference = orderIdLabel.value ? `#${orderIdLabel.value}` : (dealId.value ? `#${dealId.value}` : null)
  return orderReference ? `Проблема по сделке ${orderReference}` : 'Проблема по сделке'
})
const orderTitle = computed(() => product.value?.title ?? null)
const orderAmount = computed(() => product.value ? formatCurrencyAmount(product.value.price) : null)
const orderCreatedAt = computed(() => {
  const createdAt = latestDealMessage.value?.created_at
  if (!createdAt) return null

  return new Date(createdAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})
const productPreviewTitle = computed(() => orderTitle.value || 'Товар')

const orderStatusLabel = computed(() => {
  if (currentDealStatus.value === 'completed') return 'Получение подтверждено'
  if (currentDealStatus.value === 'confirmed') return 'Ожидает подтверждения получения'
  if (currentDealStatus.value === 'disputed') return 'Спор открыт'
  if (currentDealStatus.value === 'refunded') return 'Возврат'
  return 'Ожидает выдачи'
})
const orderStatusClass = computed(() => (
  currentDealStatus.value === 'completed'
    ? 'text-[var(--text-success)]'
    : 'text-[rgb(var(--palette-amber-300))]'
))

const sellerUsername = computed(() => seller.value?.username ?? null)
const sellerRating = computed(() => seller.value?.rating != null ? Number(seller.value.rating).toFixed(1) : null)
const sellerSales = computed<number | null>(() => {
  if (sellerDealsCountOverride.value != null) return sellerDealsCountOverride.value
  return product.value?.seller_trust?.completed_deals_count
    ?? product.value?.seller_trust?.total_deals_count
    ?? null
})
const isSellerOnline = computed(() => Boolean(seller.value?.is_active))
const sellerAvatarUrl = computed(() => seller.value?.avatar_url ?? '')
const productImageUrl = computed(() => {
  const imageUrl = product.value?.images?.[0]?.image_url
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl
  return `${API_HOST}${imageUrl}`
})
const productDataText = computed(() => product.value?.product_data_string?.trim() ?? '')
const hasAutoDeliveryData = computed(() => Boolean(product.value?.auto_delivery && productDataText.value))

async function loadAfterPaymentData() {
  const requestedChatId = chatId.value
  const requestedDealId = dealId.value

  if (!requestedChatId && !requestedDealId) {
    return
  }

  isLoading.value = true
  loadError.value = null

  let result = requestedDealId
    ? await chatsService.getChatMessagesByDealId(requestedDealId, 1, 20)
    : await chatsService.getChatMessages(requestedChatId!, 1, 20)

  if (requestedDealId && !result.latestDealMessage) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      const retried = await chatsService.getChatMessagesByDealId(requestedDealId, 1, 20)
      if (retried.latestDealMessage) {
        result = retried
        break
      }
    }
  }

  if (!result.latestDealMessage && requestedChatId) {
    result = await chatsService.getChatMessages(requestedChatId, 1, 20)
  }

  // Some deal states may return no latest_deal_message. Keep the last known payload
  // to avoid false-negative "failed to load" errors right after status transitions.
  latestDealMessage.value = result.latestDealMessage ?? latestDealMessage.value
  hasReview.value = Boolean((result.latestDealMessage ?? latestDealMessage.value)?.has_review)

  isLoading.value = false
}

async function loadSellerSales() {
  const productId = product.value?.id
  if (!productId) {
    sellerDealsCountOverride.value = null
    return
  }

  try {
    const freshProduct = await productService.getProductById(productId)
    sellerDealsCountOverride.value = freshProduct?.seller_trust?.completed_deals_count
      ?? freshProduct?.seller_trust?.total_deals_count
      ?? null
  } catch {
    sellerDealsCountOverride.value = null
  }
}

function goToSellerProfile() {
  if (!sellerUsername.value) return
  router.push(`/user/${sellerUsername.value}`)
}

function goToChat() {
  if (chatId.value) {
    router.push({ name: 'chats', query: { chatId: chatId.value } })
    return
  }

  router.push('/chats')
}

function openSupportModal() {
  showSupportModal.value = true
}

function closeSupportModal() {
  showSupportModal.value = false
}

function startSupportChatCooldown(durationMs = 8000) {
  supportChatCooldownActive.value = true
  if (supportChatCooldownTimer) clearTimeout(supportChatCooldownTimer)
  supportChatCooldownTimer = setTimeout(() => {
    supportChatCooldownActive.value = false
    supportChatCooldownTimer = null
  }, durationMs)
}

async function openSupportChat() {
  if (supportChatOpening.value || supportChatCooldownActive.value) return

  supportChatOpening.value = true
  startSupportChatCooldown()
  showSupportModal.value = false
  try {
    const chats = await chatsService.getChats()
    const supportChat = chats.find((chat) => chat.chat_type === 'support_chat')

    if (supportChat?.id) {
      await router.push({
        name: 'chats',
        query: {
          chatId: supportChat.id,
          supportContext: supportContextMessage.value,
        },
      })
      return
    }

    await router.push({
      name: 'chats',
      query: {
        support: '1',
        supportContext: supportContextMessage.value,
      },
    })
  } finally {
    supportChatOpening.value = false
  }
}

function openSupportTelegram() {
  showSupportModal.value = false
  if (typeof window === 'undefined') return
  window.open(SUPPORT_TELEGRAM_URL, '_blank', 'noopener,noreferrer')
}

function openSupportEmail() {
  showSupportModal.value = false
  if (typeof window === 'undefined') return
  window.location.href = `mailto:${SUPPORT_EMAIL}`
}

function openReviewModal() {
  if (!canLeaveReview.value) return

  reviewStars.value = 0
  reviewText.value = ''
  reviewError.value = null
  showReviewModal.value = true
}

function closeReviewModal() {
  if (reviewSubmitting.value) return
  showReviewModal.value = false
}

async function submitReview() {
  if (!dealId.value || reviewStars.value < 1 || reviewSubmitting.value || !canLeaveReview.value) return

  reviewSubmitting.value = true
  reviewError.value = null
  const response = await reviewService.createReview(dealId.value, reviewStars.value, reviewText.value)
  reviewSubmitting.value = false

  if (response == null) {
    reviewError.value = 'Не удалось отправить отзыв'
    return
  }

  hasReview.value = true
  showReviewModal.value = false
  reviewStars.value = 0
  reviewText.value = ''
}

watch(
  () => route.fullPath,
  async () => {
    await loadAfterPaymentData()
  },
)

watch(
  () => product.value?.id,
  async () => {
    await loadSellerSales()
  },
)

watch(
  [isReviewEntry, canLeaveReview],
  async ([shouldOpen, canOpen]) => {
    if (!shouldOpen || !canOpen || showReviewModal.value) return
    await nextTick()
    openReviewModal()
  },
  { immediate: true },
)

onMounted(async () => {
  await loadAfterPaymentData()
  await loadSellerSales()
})

onUnmounted(() => {
  if (supportChatCooldownTimer) {
    clearTimeout(supportChatCooldownTimer)
    supportChatCooldownTimer = null
  }
})
</script>

<template>
  <main class="order-success-page min-h-[calc(100dvh-3.5rem)] w-full bg-[var(--order-panel-bg)] px-4 py-10 text-[var(--text-title)] sm:py-14">
    <div class="mx-auto w-full max-w-[920px]">
      <header v-if="showCongratulations" class="mb-2 text-center sm:mb-5">
        <div class="inline-flex items-center gap-3">
          <h1 class="text-[1.36rem] font-extrabold leading-tight sm:text-[2rem]">
            Поздравляем с покупкой
          </h1>
          <span class="tg-popper" aria-hidden="true">
            <img :src="partyPopperSrc" alt="" class="h-[2.4rem] w-[2.4rem] object-contain sm:h-14 sm:w-14" />
          </span>
        </div>
      </header>

      <div v-if="isLoading" class="flex min-h-[360px] items-center justify-center">
        <Loader />
      </div>

      <div v-else class="grid gap-4 lg:items-start lg:grid-cols-[minmax(0,1fr)_320px]">
        <section v-if="loadError" class="order-panel min-w-0 p-5 sm:p-6 lg:col-span-2">
          <p class="text-sm text-[var(--text-danger)]">{{ loadError }}</p>
        </section>

        <div class="min-w-0 space-y-4 lg:col-start-1">
          <section class="order-panel min-w-0 p-5 sm:p-6">
            <div class="mb-6 flex flex-wrap items-center gap-x-7 gap-y-2">
              <h2 class="text-2xl font-extrabold leading-tight sm:text-[1.8rem]">
                Заказ #{{ orderIdLabel ?? '—' }}
              </h2>
              <span class="text-sm font-medium" :class="orderStatusClass">{{ orderStatusLabel }}</span>
            </div>

            <div class="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-5">
              <div v-if="productImageUrl" class="aspect-square min-h-[190px] overflow-hidden rounded-lg bg-[rgb(var(--palette-dark-800))]">
                <img :src="productImageUrl" :alt="orderTitle ?? ''" class="h-full w-full object-cover" />
              </div>
              <div v-else class="product-preview flex aspect-square min-h-[190px] flex-col justify-between overflow-hidden rounded-lg p-5">
                <div>
                  <p class="line-clamp-2 text-center text-lg font-extrabold tracking-tight text-[rgb(var(--palette-blue-300))]">{{ productPreviewTitle }}</p>
                  <p class="mt-1 text-center text-sm font-bold text-[rgb(var(--palette-white)/0.9)]">Детали заказа</p>
                </div>
                <div class="flex items-center justify-center gap-2">
                  <span class="text-[2rem] font-extrabold leading-none text-[rgb(var(--palette-blue-400))]">{{ orderAmount }}</span>
                  <Star class="h-14 w-14 text-[rgb(var(--palette-blue-400))]" />
                </div>
                <div class="mx-auto h-px w-20 rotate-[-38deg] bg-[rgb(var(--palette-white)/0.4)]"></div>
              </div>

              <div class="flex min-w-0 flex-col justify-between gap-8">
                <div class="space-y-3">
                  <p class="break-words text-base font-medium uppercase leading-6 text-[rgb(var(--text-title-rgb)/0.94)]">
                    {{ orderTitle }}
                  </p>
                  <p class="text-base text-[rgb(var(--text-title-rgb)/0.88)]">
                    Тип доставки: {{ product?.auto_delivery ? 'автоматический' : 'ручной' }}
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-[1.6rem] font-extrabold leading-none sm:text-[1.8rem]">{{ orderAmount ?? '—' }}</p>
                  <p class="mt-3 text-sm text-[var(--text-meta)]">{{ orderCreatedAt ?? '—' }}</p>
                </div>
              </div>
            </div>
          </section>

          <section v-if="!isDealCompleted" class="order-panel min-w-0 p-4 sm:p-5">
            <h2 class="mb-2 text-lg font-extrabold sm:text-xl">Ваш товар</h2>
            <p v-if="hasAutoDeliveryData" class="whitespace-pre-wrap break-words text-sm leading-5 text-[rgb(var(--text-title-rgb)/0.9)]">{{ productDataText }}</p>
            <p v-else class="text-sm leading-5 text-[var(--text-body)]">Свяжитесь с продавцом, чтобы получить товар. Продавец выдаст товар вручную.</p>
          </section>

          <section v-if="canShowReviewSection" class="order-panel hidden min-w-0 p-4 sm:p-5 lg:block">
            <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-base font-extrabold sm:text-lg">Оставить отзыв о продавце</h2>
                <p class="mt-0.5 text-sm text-[var(--text-meta)]">
                  <span v-if="hasReview">Отзыв по этой сделке уже оставлен.</span>
                  <span v-else-if="canLeaveReview">Оцените продавца после завершения сделки.</span>
                  <span v-else>Отзыв можно оставить только после подтверждения получения товара.</span>
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold transition"
                :class="canLeaveReview
                  ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)] hover:bg-[rgb(var(--palette-blue-500))]'
                  : 'cursor-not-allowed bg-[rgb(var(--palette-dark-700))] text-[var(--text-meta)]'"
                :disabled="!canLeaveReview"
                @click="openReviewModal"
              >
                Оставить отзыв
              </button>
            </div>
          </section>
        </div>

        <aside class="space-y-4 lg:col-start-2">
          <section class="order-panel p-4 sm:p-5">
            <h2 class="mb-3 text-[1.35rem] font-extrabold">Продавец</h2>
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-lg text-left transition hover:text-[var(--text-accent-strong)]"
              @click="goToSellerProfile"
            >
              <div class="relative">
                <UserAvatar
                  :avatar-url="sellerAvatarUrl"
                  :alt="sellerUsername ?? 'seller'"
                  class="h-12 w-12 rounded-full object-cover"
                />
                <span
                  class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[rgb(var(--palette-dark-900))]"
                  :class="isSellerOnline ? 'bg-[rgb(var(--palette-green-500))]' : 'bg-[rgb(var(--palette-gray-500))]'"
                  :title="isSellerOnline ? 'Online' : 'Offline'"
                ></span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold">{{ sellerUsername ?? 'Продавец' }}</p>
                <div class="mt-1 flex items-center gap-2 text-xs text-[var(--text-meta)]">
                  <span class="font-semibold text-[var(--text-title)]">{{ sellerRating ?? '—' }}</span>
                  <Star class="h-3.5 w-3.5 fill-current text-[var(--text-title)]" />
                  <span aria-hidden="true">·</span>
                  <span>{{ sellerSales ?? '—' }} продаж</span>
                </div>
              </div>
              <ArrowRight class="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5" />
            </button>

            <p class="mt-4 text-sm leading-6 text-[rgb(var(--text-title-rgb)/0.9)] sm:text-base">
              Если у вас есть вопросы, напишите продавцу
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]" @click="goToChat">
              <MessageCircle class="mr-2 h-4 w-4" />
              Перейти в чат
            </button>
          </section>

          <section v-if="canShowReviewSection" class="order-panel min-w-0 p-4 sm:p-5 lg:hidden">
            <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-base font-extrabold sm:text-lg">Оставить отзыв о продавце</h2>
                <p class="mt-0.5 text-sm text-[var(--text-meta)]">
                  <span v-if="hasReview">Отзыв по этой сделке уже оставлен.</span>
                  <span v-else-if="canLeaveReview">Оцените продавца после завершения сделки.</span>
                  <span v-else>Отзыв можно оставить только после подтверждения получения товара.</span>
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold transition"
                :class="canLeaveReview
                  ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)] hover:bg-[rgb(var(--palette-blue-500))]'
                  : 'cursor-not-allowed bg-[rgb(var(--palette-dark-700))] text-[var(--text-meta)]'"
                :disabled="!canLeaveReview"
                @click="openReviewModal"
              >
                Оставить отзыв
              </button>
            </div>
          </section>

          <section class="order-panel p-4 sm:p-5">
            <p class="text-sm leading-6 text-[rgb(var(--text-title-rgb)/0.9)] sm:text-base">
              Заказ должен быть обработан в течение 24 часов, если этого не произошло - обратитесь в поддержку.
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]" @click="openSupportModal">
              Поддержка
              <Send class="ml-2 h-4 w-4" />
            </button>
          </section>

          <section class="order-panel p-4 sm:p-5">
            <div class="flex items-center gap-2 text-base font-medium">
              <HelpCircle class="h-4 w-4 text-[var(--text-meta)]" />
              Частозадаваемые вопросы
            </div>
          </section>
        </aside>
      </div>
    </div>

    <AppModal
      :is-open="showSupportModal"
      title="Поддержка"
      description="Выберите удобный способ связи с поддержкой."
      size="sm"
      body-class="space-y-3"
      @cancel="closeSupportModal"
    >
      <button
        type="button"
        class="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-blue-500))]"
        :disabled="supportChatOpening || supportChatCooldownActive"
        :class="supportChatOpening || supportChatCooldownActive
          ? 'cursor-not-allowed opacity-70'
          : ''"
        @click="openSupportChat"
      >
        <span v-if="supportChatOpening">Открываем чат...</span>
        <span v-else-if="supportChatCooldownActive">Подождите немного...</span>
        <span v-else>Поддержка в чате</span>
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.04)] px-4 text-sm font-semibold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-white)/0.08)]"
        @click="openSupportTelegram"
      >
        Поддержка в тг @remarketgg
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.04)] px-4 text-sm font-semibold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-white)/0.08)]"
        @click="openSupportEmail"
      >
        {{ SUPPORT_EMAIL }}
      </button>
    </AppModal>

    <AppModal
      :is-open="showReviewModal"
      title="Оставить отзыв о продавце"
      description="Оцените сделку и напишите пару слов о продавце."
      size="sm"
      :dismissible="!reviewSubmitting"
      body-class="space-y-5"
      @cancel="closeReviewModal"
    >
      <div class="flex justify-center gap-2">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          class="rounded-full p-1 transition-transform hover:scale-105 disabled:cursor-not-allowed"
          :disabled="reviewSubmitting"
          @click="reviewStars = n"
        >
          <Star
            class="h-8 w-8"
            :class="reviewStars >= n ? 'fill-[var(--text-link)] text-[var(--text-link)]' : 'text-[var(--text-meta)]'"
          />
        </button>
      </div>

      <textarea
        v-model="reviewText"
        rows="5"
        maxlength="1000"
        class="w-full resize-none rounded-2xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.55)] p-3 text-sm text-[var(--text-heading)] outline-none transition placeholder:text-[var(--text-meta)] focus:border-[rgb(var(--palette-blue-500)/0.6)] focus:bg-[rgb(var(--palette-dark-700)/0.75)]"
        placeholder="Напишите отзыв"
        :disabled="reviewSubmitting"
      ></textarea>
      <p v-if="reviewError" class="text-sm text-[var(--text-danger)]">{{ reviewError }}</p>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-5 py-3 text-sm font-medium text-[var(--text-body-strong)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-6"
            :disabled="reviewSubmitting"
            @click="closeReviewModal"
          >
            Отмена
          </button>
          <button
            type="button"
            class="market-primary-surface market-primary-hover inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-blue-500))] px-5 py-3 text-sm font-semibold text-[var(--text-title)] transition disabled:cursor-not-allowed disabled:border-[rgb(var(--palette-dark-600))] disabled:bg-[rgb(var(--palette-dark-700))] disabled:text-[var(--text-meta)] sm:min-h-12 sm:px-6"
            :disabled="reviewStars < 1 || reviewSubmitting"
            @click="submitReview"
          >
            Отправить отзыв
          </button>
        </div>
      </template>
    </AppModal>
  </main>
</template>

<style scoped>
.order-success-page {
  --order-panel-bg: rgb(var(--palette-dark-900) / 0.86);
  --order-panel-border: rgb(var(--palette-white) / 0.035);
}

.order-panel {
  border: 1px solid var(--order-panel-border);
  border-radius: 8px;
  background: var(--order-panel-bg);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.18);
}

.product-preview {
  border: 1px solid rgb(var(--palette-blue-500) / 0.12);
  background:
    radial-gradient(circle at 72% 20%, rgb(var(--palette-blue-400) / 0.24), transparent 32%),
    linear-gradient(145deg, rgb(5 9 22) 0%, rgb(8 18 39) 54%, rgb(3 6 18) 100%);
}

.tg-popper {
  display: inline-flex;
  filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.28));
  transform: rotate(-8deg);
  transform-origin: 58% 72%;
  animation: popper-bounce 2.1s ease-in-out infinite;
}

@keyframes popper-bounce {
  0%,
  100% {
    transform: rotate(-8deg) translateY(0) scale(1);
  }
  25% {
    transform: rotate(-3deg) translateY(-2px) scale(1.03);
  }
  50% {
    transform: rotate(-10deg) translateY(0) scale(0.99);
  }
  75% {
    transform: rotate(-5deg) translateY(-1px) scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tg-popper {
    animation: none;
  }
}

@media (max-width: 640px) {
  .order-success-page {
    padding-top: 2rem;
  }
}
</style>
