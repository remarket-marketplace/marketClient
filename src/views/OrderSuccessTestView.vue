<script setup lang="ts">
import { chatsService } from '@/api/chats/chatsService'
import { reviewService } from '@/api/review/ReviewService'
import AppModal from '@/components/AppModal.vue'
import Loader from '@/components/Loader.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import type { Product } from '@/validation/product/product'
import type { PurchaseMessage } from '@/validation/chat/chatMessage'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, CheckCircle2, Copy, HelpCircle, MessageCircle, Send, Star } from 'lucide-vue-next'
import { formatCurrencyAmount } from '@/utils/currency'

const API_HOST = import.meta.env.VITE_API_HOST || ''

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const latestDealMessage = ref<PurchaseMessage | null>(null)
const loadError = ref<string | null>(null)
const hasReview = ref(false)

const showReviewModal = ref(false)
const reviewStars = ref(0)
const reviewText = ref('')
const reviewSubmitting = ref(false)
const reviewError = ref<string | null>(null)

const mockOrder = {
  id: 'RM1234567',
  email: 'user@mail.ru',
  title: '50 STARS ПО USERNAME | БЫСТРО',
  deliveryType: 'ручной',
  amount: '79 ₽',
  createdAt: '30.04.26 22:40',
}

const mockSeller = {
  username: 'Parallax',
  rating: 5,
  sales: 67,
  avatarUrl: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=120&q=80',
}

const dealId = computed(() => {
  const rawDealId = route.query.dealId
  if (Array.isArray(rawDealId)) return rawDealId[0] ?? null
  return rawDealId ?? latestDealMessage.value?.deal_id ?? null
})

const chatId = computed(() => {
  const rawChatId = route.query.chatId
  if (Array.isArray(rawChatId)) return rawChatId[0] ?? null
  return rawChatId ?? latestDealMessage.value?.chat_room_id ?? null
})

const isReviewEntry = computed(() => route.query.review === '1' || route.query.mode === 'review')
const showCongratulations = computed(() => !isReviewEntry.value)
const product = computed<Product | null>(() => latestDealMessage.value?.product ?? null)
const seller = computed(() => product.value?.seller ?? null)
const currentDealStatus = computed(() => latestDealMessage.value?.deal_status ?? null)
const isDealCompleted = computed(() => currentDealStatus.value === 'completed')
const canLeaveReview = computed(() => Boolean(dealId.value && isDealCompleted.value && !hasReview.value))

const orderIdLabel = computed(() => dealId.value ? `RM${dealId.value.slice(0, 8).toUpperCase()}` : mockOrder.id)
const orderTitle = computed(() => product.value?.title ?? mockOrder.title)
const orderAmount = computed(() => product.value ? formatCurrencyAmount(product.value.price) : mockOrder.amount)
const orderCreatedAt = computed(() => {
  const createdAt = latestDealMessage.value?.created_at
  if (!createdAt) return mockOrder.createdAt

  return new Date(createdAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const orderStatusLabel = computed(() => {
  if (showCongratulations.value) return 'Ожидает выдачи'
  if (currentDealStatus.value === 'completed') return 'Получение подтверждено'
  if (currentDealStatus.value === 'confirmed') return 'Ожидает подтверждения получения'
  if (currentDealStatus.value === 'disputed') return 'Спор открыт'
  if (currentDealStatus.value === 'refunded') return 'Возврат'
  return 'Ожидает выдачи'
})

const sellerUsername = computed(() => seller.value?.username ?? mockSeller.username)
const sellerRating = computed(() => Number(seller.value?.rating ?? mockSeller.rating).toFixed(1))
const sellerSales = computed(() => product.value?.seller_trust?.completed_deals_count ?? mockSeller.sales)
const sellerAvatarUrl = computed(() => seller.value?.avatar_url ?? mockSeller.avatarUrl)
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

  const result = requestedDealId
    ? await chatsService.getChatMessagesByDealId(requestedDealId, 1, 20)
    : await chatsService.getChatMessages(requestedChatId!, 1, 20)

  latestDealMessage.value = result.latestDealMessage
  hasReview.value = Boolean(result.latestDealMessage?.has_review)

  if (!result.latestDealMessage) {
    loadError.value = 'Не удалось загрузить данные заказа'
  }

  isLoading.value = false
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

function openReviewModal() {
  if (!canLeaveReview.value) return

  reviewStars.value = 0
  reviewText.value = ''
  reviewError.value = null
  showReviewModal.value = true
}

async function copyProductData() {
  if (!productDataText.value || typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(productDataText.value)
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
  if (isReviewEntry.value && canLeaveReview.value) {
    await nextTick()
    openReviewModal()
  }
})
</script>

<template>
  <main class="order-success-page min-h-[calc(100dvh-3.5rem)] w-full bg-[rgb(var(--palette-black))] px-4 py-10 text-[var(--text-title)] sm:py-14">
    <div class="mx-auto w-full max-w-[920px]">
      <header v-if="showCongratulations" class="mb-6 text-center sm:mb-7">
        <div class="inline-flex items-center gap-3">
          <h1 class="text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Поздравляем с покупкой
          </h1>
          <span class="party-popper" aria-hidden="true">
            <span class="party-popper__cone"></span>
            <span class="party-popper__band party-popper__band--top"></span>
            <span class="party-popper__band party-popper__band--bottom"></span>
            <span class="party-popper__stream party-popper__stream--left"></span>
            <span class="party-popper__stream party-popper__stream--right"></span>
            <span class="party-popper__piece party-popper__piece--one"></span>
            <span class="party-popper__piece party-popper__piece--two"></span>
            <span class="party-popper__piece party-popper__piece--three"></span>
            <span class="party-popper__piece party-popper__piece--four"></span>
          </span>
        </div>
        <p class="mt-1 text-sm font-medium text-[var(--text-meta)]">
          Отправили данные о заказе на <span class="underline decoration-[rgb(var(--palette-white)/0.24)] underline-offset-2">{{ mockOrder.email }}</span>
        </p>
      </header>

      <div v-if="isLoading" class="flex min-h-[360px] items-center justify-center">
        <Loader />
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section v-if="loadError" class="order-panel min-w-0 p-5 sm:p-6 lg:col-span-2">
          <p class="text-sm text-[var(--text-danger)]">{{ loadError }}</p>
        </section>

        <section class="order-panel min-w-0 p-5 sm:p-6">
          <div class="mb-6 flex flex-wrap items-center gap-x-7 gap-y-2">
            <h2 class="text-2xl font-extrabold leading-tight sm:text-[1.8rem]">
              Заказ #{{ orderIdLabel }}
            </h2>
            <span class="text-sm font-medium text-[rgb(var(--palette-amber-300))]">{{ orderStatusLabel }}</span>
          </div>

          <div class="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-5">
            <div v-if="productImageUrl" class="aspect-square min-h-[190px] overflow-hidden rounded-lg bg-[rgb(var(--palette-dark-800))]">
              <img :src="productImageUrl" :alt="orderTitle" class="h-full w-full object-cover" />
            </div>
            <div v-else class="product-preview flex aspect-square min-h-[190px] flex-col justify-between overflow-hidden rounded-lg p-5">
              <div>
                <p class="text-center text-2xl font-extrabold tracking-tight text-[rgb(var(--palette-blue-300))]">Telegram</p>
                <p class="mt-1 text-center text-sm font-bold text-[rgb(var(--palette-white)/0.9)]">Stars по @username</p>
              </div>
              <div class="flex items-center justify-center gap-2">
                <span class="text-[3.75rem] font-extrabold leading-none text-[rgb(var(--palette-blue-400))]">50</span>
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
                  Тип доставки: {{ product?.auto_delivery ? 'автоматический' : mockOrder.deliveryType }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-[1.45rem] font-extrabold leading-none sm:text-[1.6rem]">Сумма: {{ orderAmount }}</p>
                <p class="mt-3 text-sm text-[var(--text-meta)]">{{ orderCreatedAt }}</p>
              </div>
            </div>
          </div>
        </section>

        <aside class="space-y-4">
          <section class="order-panel p-5">
            <h2 class="mb-3 text-[1.35rem] font-extrabold">Продавец</h2>
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-lg text-left transition hover:text-[var(--text-accent-strong)]"
              @click="goToSellerProfile"
            >
              <div class="relative">
                <UserAvatar
                  :avatar-url="sellerAvatarUrl"
                  :alt="sellerUsername"
                  class="h-12 w-12 rounded-full object-cover"
                />
                <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[rgb(var(--palette-dark-900))] bg-[rgb(var(--palette-green-500))]"></span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate text-sm font-bold">{{ sellerUsername }}</span>
                  <Star class="h-3.5 w-3.5 fill-current text-[var(--text-title)]" />
                  <span class="text-sm font-semibold">{{ sellerRating }}</span>
                </div>
                <p class="text-xs text-[var(--text-meta)]">{{ sellerSales }} продаж</p>
              </div>
              <ArrowRight class="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5" />
            </button>

            <p class="mt-5 text-base leading-6 text-[rgb(var(--text-title-rgb)/0.9)]">
              Если у вас есть вопросы, напишите продавцу
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]" @click="goToChat">
              <MessageCircle class="mr-2 h-4 w-4" />
              Перейти в чат
            </button>
          </section>

          <section class="order-panel p-5">
            <p class="text-base leading-6 text-[rgb(var(--text-title-rgb)/0.9)]">
              Заказ должен быть обработан в течение 24 часов, если этого не произошло - обратитесь в поддержку.
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]">
              Поддержка
              <Send class="ml-2 h-4 w-4" />
            </button>
          </section>

          <section class="order-panel min-h-[224px] p-5">
            <div class="flex items-center gap-2 text-base font-medium">
              <HelpCircle class="h-4 w-4 text-[var(--text-meta)]" />
              Частозадаваемые вопросы
            </div>
          </section>
        </aside>

        <section class="order-panel min-w-0 p-5 sm:p-6 lg:col-start-1">
          <h2 class="mb-5 text-xl font-extrabold">Ваш товар</h2>
          <div class="product-delivery-box rounded-lg p-4">
            <div class="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--palette-green-500)/0.2)] bg-[rgb(var(--palette-green-500)/0.1)] px-3 py-1 text-xs font-semibold text-[var(--text-success)]">
              <CheckCircle2 class="h-3.5 w-3.5" />
              {{ orderStatusLabel }}
            </div>
            <div v-if="hasAutoDeliveryData" class="mt-4 space-y-3">
              <p class="text-sm font-semibold text-[var(--text-title)]">Данные автовыдачи</p>
              <div class="rounded-lg border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-black)/0.22)] p-3">
                <pre class="whitespace-pre-wrap break-words text-sm leading-6 text-[rgb(var(--text-title-rgb)/0.9)]">{{ productDataText }}</pre>
              </div>
              <button
                type="button"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-4 text-xs font-semibold text-[var(--text-title)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)]"
                @click="copyProductData"
              >
                <Copy class="mr-2 h-4 w-4" />
                Скопировать данные
              </button>
            </div>
            <div v-else class="mt-4 rounded-lg border border-[rgb(var(--palette-blue-500)/0.18)] bg-[rgb(var(--palette-blue-500)/0.08)] p-4">
              <p class="text-sm font-semibold text-[var(--text-title)]">Свяжитесь с продавцом, чтобы получить товар.</p>
              <p class="mt-2 text-sm leading-6 text-[var(--text-body)]">
                Продавец выдаст товар вручную. Откройте чат, если нужно уточнить детали заказа.
              </p>
              <button
                type="button"
                class="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-xs font-bold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-blue-500))]"
                @click="goToChat"
              >
                <MessageCircle class="mr-2 h-4 w-4" />
                Написать продавцу
              </button>
            </div>
          </div>
        </section>

        <section class="order-panel min-w-0 p-5 sm:p-6 lg:col-span-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-extrabold">Оставить отзыв о продавце</h2>
              <p class="mt-1 text-sm text-[var(--text-meta)]">
                <span v-if="hasReview">Отзыв по этой сделке уже оставлен.</span>
                <span v-else-if="canLeaveReview">Оцените продавца после завершения сделки.</span>
                <span v-else>Отзыв можно оставить только после подтверждения получения товара.</span>
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold transition"
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
    </div>

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

.product-delivery-box {
  background: rgb(var(--palette-dark-800) / 0.72);
}

.party-popper {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 3.2rem;
  transform: rotate(-18deg);
  animation: popper-kick 900ms cubic-bezier(0.2, 1.35, 0.45, 1) both;
}

.party-popper__cone {
  position: absolute;
  left: 0.45rem;
  bottom: 0.18rem;
  width: 2.15rem;
  height: 2.4rem;
  clip-path: polygon(0 100%, 32% 0, 100% 68%);
  background: linear-gradient(135deg, #d58b16 0%, #ffd646 45%, #b67212 100%);
  box-shadow: inset -0.35rem -0.15rem 0 rgb(77 48 13 / 0.28);
}

.party-popper__band {
  position: absolute;
  left: 0.88rem;
  width: 1.95rem;
  height: 0.34rem;
  border-radius: 999px;
  background: #a65cff;
  transform: rotate(27deg);
}

.party-popper__band--top {
  bottom: 1.34rem;
}

.party-popper__band--bottom {
  bottom: 0.72rem;
}

.party-popper__stream,
.party-popper__piece {
  position: absolute;
  opacity: 0;
  animation: confetti-shot 1300ms ease-out 180ms both;
}

.party-popper__stream {
  width: 0.26rem;
  height: 1.25rem;
  border-radius: 999px;
}

.party-popper__stream--left {
  left: 0.6rem;
  top: 0.08rem;
  background: #2e6cff;
  transform: rotate(26deg);
}

.party-popper__stream--right {
  right: 0.2rem;
  top: 0.1rem;
  background: #ff3f86;
  transform: rotate(-34deg);
}

.party-popper__piece {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 0.08rem;
}

.party-popper__piece--one {
  left: 0.15rem;
  top: 0.05rem;
  background: #f43f7f;
}

.party-popper__piece--two {
  left: 1.15rem;
  top: -0.22rem;
  background: #2f6bff;
}

.party-popper__piece--three {
  right: 0.58rem;
  top: -0.1rem;
  background: #fff14a;
}

.party-popper__piece--four {
  right: -0.08rem;
  top: 0.68rem;
  background: #ff9f1c;
}

@keyframes popper-kick {
  0% {
    transform: translateY(0.4rem) rotate(-34deg) scale(0.65);
    opacity: 0;
  }
  45% {
    transform: translateY(-0.18rem) rotate(-14deg) scale(1.08);
    opacity: 1;
  }
  100% {
    transform: translateY(0) rotate(-18deg) scale(1);
    opacity: 1;
  }
}

@keyframes confetti-shot {
  0% {
    opacity: 0;
    translate: 0 0.75rem;
    scale: 0.55;
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    translate: 0 -0.25rem;
    scale: 1;
  }
}

@media (max-width: 640px) {
  .order-success-page {
    padding-top: 2rem;
  }
}
</style>
