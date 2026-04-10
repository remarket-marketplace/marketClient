<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { productService } from '@/api/product/ProductService'
import { getErrorMessage } from '@/utils/errorsMap'
import { formatCurrencyAmount } from '@/utils/currency'
import { calculateDiscountPercent } from '@/utils/priceOffer'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { useRouter } from 'vue-router'
import { buildProductKey } from '@/utils/urlKeys'
import { decodePriceOfferTemplateKey } from '@/utils/priceOfferMessageTemplate'

const props = defineProps<{
  message: Extract<ChatMessageUnion, { message_type: 'price_offer_message' }>
  user: any
  formatDate: (date: string | Date) => string
}>()

const { t } = useI18n()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST
const isProcessing = ref(false)
const actionError = ref<string | null>(null)

const isSeller = computed(() => props.user?.id === props.message.seller_id)
const isPending = computed(() => props.message.offer_status === 'pending')
const canProcess = computed(() => isSeller.value && isPending.value)
const offerDiscountPercent = computed(() => calculateDiscountPercent(
  Number(props.message.product.price),
  Number(props.message.offered_price),
))

const statusLabel = computed(() => {
  const key = `pages.chats.priceOfferStatuses.${props.message.offer_status}`
  const translated = t(key)
  return translated === key ? props.message.offer_status : translated
})

const statusClass = computed(() => {
  switch (props.message.offer_status) {
    case 'accepted':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'expired':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    default:
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  }
})

const localizedOfferMessage = computed(() => {
  const templateKey = decodePriceOfferTemplateKey(props.message.offer_message)
  if (!templateKey) {
    return props.message.offer_message
  }

  const translationKey = `pages.chats.priceOfferTemplates.${templateKey}`
  const translatedText = t(translationKey, { price: formatCurrencyAmount(Number(props.message.offered_price)) })
  return translatedText === translationKey ? props.message.offer_message : translatedText
})

const productPreviewImageUrl = computed(() => {
  const rawImageUrl = props.message.product.images?.[0]?.image_url
  if (!rawImageUrl) return null

  if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
    return rawImageUrl
  }

  if (!API_HOST) {
    return rawImageUrl
  }

  return `${API_HOST}${rawImageUrl}`
})

async function acceptOffer() {
  if (!canProcess.value || isProcessing.value) return
  isProcessing.value = true
  actionError.value = null

  const result = await productService.acceptPriceOffer(props.message.offer_id)
  if (!result.success && result.error) {
    actionError.value = getErrorMessage(result.error, t)
  }

  isProcessing.value = false
}

async function rejectOffer() {
  if (!canProcess.value || isProcessing.value) return
  isProcessing.value = true
  actionError.value = null

  const result = await productService.rejectPriceOffer(props.message.offer_id)
  if (!result.success && result.error) {
    actionError.value = getErrorMessage(result.error, t)
  }

  isProcessing.value = false
}

function handleViewProduct() {
  const productKey = buildProductKey(props.message.product)
  if (!productKey) return
  router.push(`/product/${productKey}`)
}
</script>

<template>
  <div class="my-1 w-full min-w-0 flex justify-center">
    <div class="w-full max-w-2xl min-w-0 overflow-hidden rounded-xl border border-dark-700 bg-dark-800/40 p-3 sm:p-3.5">
      <div
        class="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-dark-700 bg-dark-700/45 p-2.5 transition hover:bg-dark-700/70"
        @click="handleViewProduct"
      >
        <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-dark-600 bg-dark-800">
          <img
            v-if="productPreviewImageUrl"
            :src="productPreviewImageUrl"
            :alt="message.product.title"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-white">{{ message.product.title }}</p>
          <p class="mt-0.5 text-xs text-gray-400">{{ formatCurrencyAmount(message.product.price) }}</p>
        </div>
        <span class="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium" :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>

      <div class="mt-3 flex items-center gap-3">
        <p class="text-sm font-semibold text-white">
          {{ t('pages.chats.priceOfferTitle') }}
        </p>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-2.5 text-sm">
        <div class="rounded-lg border border-dark-700 bg-dark-700/45 px-3 py-2">
          <p class="text-[11px] text-gray-400">{{ t('pages.chats.originalPrice') }}</p>
          <p class="mt-0.5 font-semibold text-gray-100">{{ formatCurrencyAmount(message.product.price) }}</p>
        </div>
        <span class="text-sm text-gray-500">→</span>
        <div class="rounded-lg border border-dark-700 bg-dark-700/45 px-3 py-2">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[11px] text-gray-400">{{ t('pages.chats.offeredPrice') }}</p>
            <span
              v-if="offerDiscountPercent !== null"
              class="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
            >
              -{{ offerDiscountPercent }}%
            </span>
          </div>
          <p class="mt-0.5 font-semibold text-emerald-300">{{ formatCurrencyAmount(message.offered_price) }}</p>
        </div>
      </div>

      <p v-if="localizedOfferMessage" class="mt-3 whitespace-pre-line text-sm text-gray-200 break-words [overflow-wrap:anywhere]">
        {{ localizedOfferMessage }}
      </p>

      <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div v-if="canProcess" class="flex flex-wrap gap-2">
          <button
            class="market-primary-surface market-primary-hover rounded-lg border border-blue-500 px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            :disabled="isProcessing"
            @click="acceptOffer"
          >
            {{ t('pages.chats.acceptOffer') }}
          </button>
          <button
            class="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            :disabled="isProcessing"
            @click="rejectOffer"
          >
            {{ t('pages.chats.rejectOffer') }}
          </button>
        </div>
        <p class="ml-auto text-xs text-gray-500">{{ formatDate(message.created_at) }}</p>
      </div>

      <p v-if="actionError" class="mt-2 text-xs text-red-400">{{ actionError }}</p>
    </div>
  </div>
</template>
