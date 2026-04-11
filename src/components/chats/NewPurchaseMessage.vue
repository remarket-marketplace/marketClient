<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import { reviewService } from '@/api/review/ReviewService'
import { chatsService } from '@/api/chats/chatsService'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import type { RefusalReasonsList } from '@/validation/deal/deal'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, RefreshCcw, Star } from 'lucide-vue-next'
import AppModal from '@/components/AppModal.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'
import DealStatusTag from '@/components/DealStatusTag.vue'

const API_HOST = import.meta.env.VITE_API_HOST

const props = defineProps<{
  product: Product
  dealStatus: string | null
  dealId: string
  has_review: boolean | null
  layout?: 'timeline' | 'summary'
  createdAt?: string | null
  dealStatusTimeline?: Array<{
    id: string
    deal_id: string
    status: string
    created_at: string
  }>
  collapsed?: boolean
  collapsible?: boolean
}>()
const emit = defineEmits<{
  toggleCollapse: []
}>()

const router = useRouter()
const { locale } = useI18n()

const localDealStatus = ref<string | null>(null)
const localHasReview = ref(false)

const showReviewModal = ref(false)
const reviewStars = ref(0)
const reviewText = ref('')
const reviewSubmitting = ref(false)

const showRefusalModal = ref(false)
const refusalReasons = ref<RefusalReasonsList>([])
const selectedRefusalId = ref<string | null>(null)
const customReasonText = ref('')
const MAX_CUSTOM_REASON_LENGTH = 300
const otherReasonId = ref<string | null>(null)

const showConfirmModal = ref(false)
const showFulfillmentModal = ref(false)
const showRefundModal = ref(false)
const confirmLoading = ref(false)
const fulfillmentLoading = ref(false)
const refundLoading = ref(false)

const effectiveDealStatus = computed(() => localDealStatus.value ?? props.dealStatus)
const isBuyer = computed(() => !props.product.is_owner)
const isSeller = computed(() => props.product.is_owner)
const isDealDisputed = computed(() => effectiveDealStatus.value === 'disputed')
const isDealCompleted = computed(() => effectiveDealStatus.value === 'completed')
const isDealRefunded = computed(() => (
  effectiveDealStatus.value === 'refunded' || effectiveDealStatus.value === 'cancelled'
))
const isAwaitingSellerFulfillment = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'pending'
))
const canConfirmFulfillment = computed(() => (
  isSeller.value && effectiveDealStatus.value === 'pending'
))
const canConfirmReceipt = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'confirmed'
))
const canSendReport = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'confirmed'
))
const showReportedBadge = computed(() => (
  isBuyer.value && isDealDisputed.value
))
const showFulfillmentConfirmedBadge = computed(() => (
  isSeller.value && effectiveDealStatus.value === 'confirmed'
))
const currentDealStatus = computed(() => effectiveDealStatus.value ?? 'pending')
const isSummaryLayout = computed(() => props.layout === 'summary')
const purchaseLabelKey = computed(() => 'pages.chats.newPurchase')
const summaryTitleKey = computed(() => 'pages.chats.currentDeal')
const headerTitleKey = computed(() => (
  isSummaryLayout.value ? summaryTitleKey.value : purchaseLabelKey.value
))
const rootClass = computed(() => (
  isSummaryLayout.value ? 'w-full min-w-0' : 'my-2 w-full min-w-0'
))
const cardClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full min-w-0'
    : 'message-compose-shell mx-auto flex w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-background/85 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70'
))
const summaryHeaderClass = computed(() => (
  isSummaryLayout.value
    ? 'order-1 flex min-h-8 flex-wrap items-center justify-between gap-2'
    : 'mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5'
))
const contentClass = computed(() => (
  isSummaryLayout.value ? 'order-3 flex flex-col gap-2 sm:gap-2.5' : 'flex flex-col gap-3'
))
const topRowClass = computed(() => (
  isSummaryLayout.value ? 'flex items-start gap-2.5 sm:gap-3' : 'flex items-start gap-3'
))
const imageButtonClass = computed(() => (
  isSummaryLayout.value
    ? 'h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-dark-700 sm:h-11 sm:w-11'
    : 'h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-dark-600 bg-dark-700'
))
const actionsClass = computed(() => (
  isSummaryLayout.value
    ? 'order-4 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2'
    : 'mt-1 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3'
))
const reviewActionClass = computed(() => (
  isSummaryLayout.value ? 'order-5 mt-0.5' : 'mt-3'
))
const titleClass = computed(() => (
  isSummaryLayout.value ? 'mt-0.5 block min-w-0 text-left text-xs font-semibold leading-tight text-white transition hover:text-blue-200 sm:text-[13px]' : 'mt-1 block min-w-0 text-left text-sm font-semibold text-white transition hover:text-blue-200'
))
const priceClass = computed(() => (
  isSummaryLayout.value ? 'text-[11px] font-semibold text-emerald-300 sm:text-xs' : 'text-sm font-semibold text-emerald-300'
))
const deliveryClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5'
    : 'w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5'
))
const helperClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5'
    : 'w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5'
))
const summaryPrimaryButtonClass = computed(() => (
  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all sm:px-4 sm:py-2.5 sm:text-sm'
))
const summaryStatusClass = computed(() => (
  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-200 sm:px-4 sm:py-2.5 sm:text-sm'
))
const shouldShowSummaryToggle = computed(() => isSummaryLayout.value && props.collapsible === true)
const showSummaryBody = computed(() => !isSummaryLayout.value || props.collapsed !== true)
const timelineTimestamp = computed(() => {
  if (isSummaryLayout.value || !props.createdAt) return null

  const parsed = new Date(props.createdAt)
  if (Number.isNaN(parsed.getTime())) return null

  const localeCode = locale.value.startsWith('ru') ? 'ru-RU' : 'en-US'
  return parsed.toLocaleString(localeCode, {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const DEAL_AUTO_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000
const dealTimerNowTs = ref(Date.now())
let dealTimerIntervalId: ReturnType<typeof setInterval> | null = null

const isFinalDealStatus = computed(() => (
  ['completed', 'refunded', 'cancelled', 'canceled'].includes((effectiveDealStatus.value ?? '').toLowerCase())
))

const normalizedDealTimeline = computed(() => {
  return [...(props.dealStatusTimeline ?? [])]
    .map((item) => ({
      ...item,
      status: item.status.toLowerCase(),
      timestamp: Date.parse(item.created_at),
    }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
})

const autoConfirmStartAtTs = computed<number | null>(() => {
  for (const event of normalizedDealTimeline.value) {
    if (event.status === 'confirmed') {
      return event.timestamp
    }
  }
  return null
})

function calculatePausedDurationMs(nowTs: number, startTs: number): number {
  let pausedDurationMs = 0
  let disputeStartedAt: number | null = null

  for (const event of normalizedDealTimeline.value) {
    if (event.timestamp < startTs) continue

    if (event.status === 'disputed') {
      if (disputeStartedAt === null) {
        disputeStartedAt = event.timestamp
      }
      continue
    }

    if (event.status === 'confirmed' && disputeStartedAt !== null) {
      pausedDurationMs += Math.max(0, event.timestamp - disputeStartedAt)
      disputeStartedAt = null
    }
  }

  const isDisputedNow = (effectiveDealStatus.value ?? '').toLowerCase() === 'disputed'
  if (disputeStartedAt !== null && isDisputedNow) {
    pausedDurationMs += Math.max(0, nowTs - disputeStartedAt)
  }

  return pausedDurationMs
}

const shouldShowAutoConfirmTimer = computed(() => {
  const normalizedStatus = (effectiveDealStatus.value ?? '').toLowerCase()
  if (!isSummaryLayout.value) return false
  if (isFinalDealStatus.value) return false
  if (autoConfirmStartAtTs.value === null) return false
  return normalizedStatus === 'confirmed' || normalizedStatus === 'disputed'
})

const autoConfirmRemainingMs = computed<number | null>(() => {
  if (!shouldShowAutoConfirmTimer.value) return null
  const startTs = autoConfirmStartAtTs.value
  if (startTs === null) return null

  const pausedDurationMs = calculatePausedDurationMs(dealTimerNowTs.value, startTs)
  const elapsedMs = Math.max(0, dealTimerNowTs.value - startTs - pausedDurationMs)
  return Math.max(0, DEAL_AUTO_CONFIRM_WINDOW_MS - elapsedMs)
})

const autoConfirmTimerLabel = computed(() => {
  if (autoConfirmRemainingMs.value === null) return null
  const totalMinutes = Math.floor(autoConfirmRemainingMs.value / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})

function startDealTimerInterval() {
  if (dealTimerIntervalId !== null) return
  dealTimerIntervalId = setInterval(() => {
    dealTimerNowTs.value = Date.now()
  }, 1000)
}

function stopDealTimerInterval() {
  if (dealTimerIntervalId === null) return
  clearInterval(dealTimerIntervalId)
  dealTimerIntervalId = null
}

watch(
  shouldShowAutoConfirmTimer,
  (shouldShow) => {
    if (shouldShow) {
      dealTimerNowTs.value = Date.now()
      startDealTimerInterval()
      return
    }
    stopDealTimerInterval()
  },
  { immediate: true },
)


const deliverySummary = computed(() => (
  props.product.auto_delivery ? props.product.product_data_string || null : null
))

function handleToggleSummaryCollapse() {
  emit('toggleCollapse')
}

const sellerActionTitle = computed(() => {
  if (!isSeller.value || effectiveDealStatus.value !== 'pending') return null
  return 'pages.chats.sellerPendingInstructionTitle'
})

const sellerActionText = computed(() => {
  if (!isSeller.value || effectiveDealStatus.value !== 'pending') return null
  return 'pages.chats.sellerPendingInstructionText'
})

const buyerActionText = computed(() => {
  if (!isBuyer.value || effectiveDealStatus.value !== 'pending') return null
  return 'pages.chats.contactSeller'
})

const isOtherReasonSelected = computed(() => (
  Boolean(selectedRefusalId.value && otherReasonId.value && selectedRefusalId.value === otherReasonId.value)
))

async function openRefusalModal() {
  if (refusalReasons.value.length === 0) {
    const reasons = await chatsService.getRefusalReasons()
    refusalReasons.value = reasons
    const otherReason = reasons.find((reason) => reason.title === 'otherReason')
    if (otherReason) {
      otherReasonId.value = otherReason.id
    }
  }

  customReasonText.value = ''
  showRefusalModal.value = true
}

function closeRefusalModal() {
  showRefusalModal.value = false
  selectedRefusalId.value = null
  customReasonText.value = ''
}

function handleViewProduct(product: Product) {
  const productKey = buildProductKey(product)
  if (!productKey) return
  router.push(`/product/${productKey}`)
}

function openConfirmReceiptModal() {
  showConfirmModal.value = true
}

function openConfirmFulfillmentModal() {
  showFulfillmentModal.value = true
}

function openRefundModal() {
  showRefundModal.value = true
}

async function doConfirmDeal() {
  confirmLoading.value = true
  const response = await productService.confirmReceipt(props.dealId)
  confirmLoading.value = false

  if (response === true) {
    localDealStatus.value = 'completed'
    localHasReview.value = false
  }

  showConfirmModal.value = false
}

async function doConfirmFulfillment() {
  fulfillmentLoading.value = true
  const response = await productService.confirmFulfillment(props.dealId)
  fulfillmentLoading.value = false

  if (response === true) {
    localDealStatus.value = 'confirmed'
  }

  showFulfillmentModal.value = false
}

async function doConfirmRefund() {
  refundLoading.value = true
  const response = await productService.RefundDeal(props.dealId)
  refundLoading.value = false

  if (response === true) {
    localDealStatus.value = 'refunded'
  }

  showRefundModal.value = false
}

async function handleReport(dealId: string) {
  if (!selectedRefusalId.value) return

  const description = isOtherReasonSelected.value && customReasonText.value.trim()
    ? customReasonText.value.trim()
    : null

  const response = await productService.sendReport(dealId, selectedRefusalId.value, description)
  if (response === true) {
    localDealStatus.value = 'disputed'
    closeRefusalModal()
  }
}

function openReviewModal() {
  reviewStars.value = 0
  reviewText.value = ''
  showReviewModal.value = true
}

function closeReviewModal() {
  if (reviewSubmitting.value) return
  showReviewModal.value = false
}

async function handleSendReview() {
  if (reviewStars.value < 1 || reviewSubmitting.value) return

  reviewSubmitting.value = true
  const response = await reviewService.createReview(props.dealId, reviewStars.value, reviewText.value)
  reviewSubmitting.value = false

  if (response != null) {
    localHasReview.value = true
    showReviewModal.value = false
    reviewStars.value = 0
    reviewText.value = ''
  }
}

watch(showReviewModal, (isOpen) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(
  () => props.dealStatus,
  (dealStatus) => {
    localDealStatus.value = dealStatus ?? null
  },
  { immediate: true }
)

watch(
  () => props.has_review,
  (hasReview) => {
    localHasReview.value = hasReview ?? false
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopDealTimerInterval()
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
})
</script>

<template>
  <div :class="rootClass">
    <div :class="cardClass" class="flex min-w-0 flex-col">
      <div :class="summaryHeaderClass">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/90 sm:text-xs sm:tracking-[0.14em]">
            {{ $t(headerTitleKey) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="shouldShowAutoConfirmTimer && autoConfirmTimerLabel"
            class="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold tracking-[0.06em] text-gray-200 sm:text-[11px]"
          >
            {{ $t('pages.chats.autoConfirmTimer', { value: autoConfirmTimerLabel }) }}
          </span>
          <DealStatusTag :deal-status="currentDealStatus" />
          <button
            v-if="shouldShowSummaryToggle"
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
            @click="handleToggleSummaryCollapse"
          >
            <ChevronUp v-if="!props.collapsed" class="h-4 w-4" />
            <ChevronDown v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="showSummaryBody" :class="contentClass">
        <div :class="topRowClass">
          <button
            type="button"
            :class="imageButtonClass"
            @click="handleViewProduct(product)"
          >
            <img
              :src="`${API_HOST}${product.images?.[0]?.image_url}`"
              :alt="product.title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
          </button>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div class="min-w-0 flex-1">
                <p
                  v-if="isSummaryLayout"
                  class="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300/90 sm:text-[11px] sm:tracking-[0.14em]"
                >
                  {{ $t(purchaseLabelKey) }}
                </p>
                <button
                  type="button"
                  :class="titleClass"
                  @click="handleViewProduct(product)"
                >
                  <span class="line-clamp-2">{{ product.title }}</span>
                </button>
              </div>

              <p :class="priceClass">
                {{ formatCurrencyAmount(product.price) }}
              </p>
            </div>

            <div
              v-if="!isSummaryLayout"
              class="mt-2 flex flex-wrap items-center gap-2"
            >
              <DealStatusTag :deal-status="currentDealStatus" />
            </div>
          </div>
        </div>

        <div
          v-if="!isSummaryLayout && deliverySummary"
          :class="deliveryClass"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {{ $t('pages.chats.productData') }}
          </p>
          <p class="mt-1 line-clamp-3 break-words text-sm leading-relaxed text-gray-200 [overflow-wrap:anywhere]">
            {{ deliverySummary }}
          </p>
        </div>

        <div
          v-else-if="!isSummaryLayout && sellerActionTitle && sellerActionText"
          :class="helperClass"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-300/90">
            {{ $t(sellerActionTitle) }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-gray-200">
            {{ $t(sellerActionText) }}
          </p>
        </div>

        <div
          v-else-if="!isSummaryLayout && buyerActionText"
          :class="helperClass"
        >
          <p class="text-sm leading-relaxed text-gray-300">
            {{ $t(buyerActionText) }}
          </p>
        </div>

        <div
          v-if="isSummaryLayout && deliverySummary"
          :class="deliveryClass"
        >
          <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 sm:text-[11px]">
            {{ $t('pages.chats.productData') }}
          </p>
          <p class="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-gray-200 sm:text-sm [overflow-wrap:anywhere]">
            {{ deliverySummary }}
          </p>
        </div>

        <div
          v-else-if="isSummaryLayout && sellerActionTitle && sellerActionText"
          :class="helperClass"
        >
          <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-300/90 sm:text-[11px]">
            {{ $t(sellerActionTitle) }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-gray-200 sm:text-sm">
            {{ $t(sellerActionText) }}
          </p>
        </div>

        <div
          v-else-if="isSummaryLayout && buyerActionText"
          :class="helperClass"
        >
          <p class="text-xs leading-relaxed text-gray-300 sm:text-sm">
            {{ $t(buyerActionText) }}
          </p>
        </div>
      </div>

      <div v-if="showSummaryBody" :class="actionsClass">
        <template v-if="canConfirmReceipt">
          <button
            :class="isSummaryLayout
              ? `${summaryPrimaryButtonClass} market-primary-surface market-primary-hover border border-blue-500`
              : 'market-primary-surface market-primary-hover flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all'"
            @click="openConfirmReceiptModal()"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ $t('pages.chats.confirmReceipt') }}
          </button>
        </template>

        <template v-else-if="canConfirmFulfillment">
          <button
            :class="isSummaryLayout
              ? `${summaryPrimaryButtonClass} market-primary-surface market-primary-hover border border-blue-500`
              : 'market-primary-surface market-primary-hover flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all'"
            @click="openConfirmFulfillmentModal()"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ $t('pages.chats.confirmFulfillment') }}
          </button>
        </template>

        <template v-if="isSeller && effectiveDealStatus === 'pending'">
          <template v-if="!isDealRefunded">
            <button
              :class="isSummaryLayout
                ? `${summaryPrimaryButtonClass} border border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white`
                : 'flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-gray-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white'"
              @click="openRefundModal"
            >
              <RefreshCcw class="h-4 w-4" />
              {{ $t('pages.chats.refund') }}
            </button>
          </template>
          <template v-else>
            <div :class="isSummaryLayout ? `${summaryStatusClass} border border-dark-600 bg-dark-700/70` : 'flex items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700/70 px-4 py-2.5 text-sm font-semibold text-gray-200'">
              <svg class="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ $t('pages.chats.refundCompleted') }}
            </div>
          </template>
        </template>

        <template v-if="isBuyer">
          <div v-if="canSendReport" class="sm:ml-auto flex flex-col gap-2">
            <button
              :class="isSummaryLayout
                ? `${summaryPrimaryButtonClass} border border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white`
                : 'flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white'"
              @click="openRefusalModal()"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              {{ $t('pages.chats.report') }}
            </button>
          </div>

          <div v-else-if="showReportedBadge" class="sm:ml-auto flex flex-col gap-2">
            <div :class="isSummaryLayout ? `${summaryStatusClass} border border-dark-600 bg-dark-700/70` : 'flex items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700/70 px-4 py-2.5 text-sm font-semibold text-gray-200'">
              <svg class="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ $t('pages.chats.reported') }}
            </div>
          </div>
        </template>
      </div>

      <template v-if="showSummaryBody && isDealCompleted && !localHasReview && isBuyer">
        <div :class="reviewActionClass">
          <button
            class="market-primary-surface market-primary-hover flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-white"
            @click="openReviewModal"
          >
            <Star class="h-4 w-4" />
            {{ $t('pages.chats.leaveReview') }}
          </button>
        </div>
      </template>

      <div v-if="timelineTimestamp" class="mt-1 flex items-center justify-end text-xs text-gray-300">
        <span>{{ timelineTimestamp }}</span>
      </div>
    </div>
  </div>

  <AppModal
    :is-open="showReviewModal"
    :title="$t('pages.chats.leaveReview')"
    :description="$t('pages.chats.writeReview')"
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
          :class="reviewStars >= n ? 'fill-blue-500 text-blue-500' : 'text-gray-600'"
        />
      </button>
    </div>

    <textarea
      v-model="reviewText"
      rows="5"
      maxlength="1000"
      class="w-full resize-none rounded-2xl border border-dark-600 bg-dark-700/55 p-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-blue-500/60 focus:bg-dark-700/75"
      :placeholder="$t('pages.chats.writeReview')"
      :disabled="reviewSubmitting"
    ></textarea>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-6"
          :disabled="reviewSubmitting"
          @click="closeReviewModal"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="button"
          class="market-primary-surface market-primary-hover inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-blue-500 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-dark-600 disabled:bg-dark-700 disabled:text-gray-500 sm:min-h-12 sm:px-6"
          :disabled="reviewStars < 1 || reviewSubmitting"
          @click="handleSendReview()"
        >
          {{ $t('pages.chats.sendReview') }}
        </button>
      </div>
    </template>
  </AppModal>

  <AppModal
    :is-open="showRefusalModal"
    :title="$t('pages.chats.selectReason')"
    size="sm"
    body-class="space-y-4"
    @cancel="closeRefusalModal"
  >
    <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
      <button
        v-for="reason in refusalReasons"
        :key="reason.id"
        class="w-full rounded-2xl border px-4 py-3.5 text-left transition-colors duration-200"
        :class="selectedRefusalId === reason.id
          ? 'border-blue-500/45 bg-dark-700/75 text-white'
          : 'border-dark-600 bg-dark-700/40 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55 hover:text-white'"
        @click="selectedRefusalId = reason.id"
      >
        <div class="flex items-center">
          <div class="mr-3 flex-shrink-0">
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200"
              :class="selectedRefusalId === reason.id
                ? 'border-blue-400 bg-blue-500/15 ring-1 ring-blue-500/30'
                : 'border-gray-500 bg-dark-900/90'"
            >
              <div
                v-if="selectedRefusalId === reason.id"
                class="h-2.5 w-2.5 rounded-full bg-blue-400"
              ></div>
            </div>
          </div>

          <span class="text-sm font-medium leading-relaxed">
            {{ $t(`common.refusalReasons.${reason.title}`) }}
          </span>
        </div>
      </button>
    </div>

    <div v-if="isOtherReasonSelected" class="space-y-2">
      <textarea
        v-model="customReasonText"
        :maxlength="MAX_CUSTOM_REASON_LENGTH"
        rows="4"
        class="w-full rounded-2xl border border-dark-500 bg-dark-700/55 p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500/60 focus:bg-dark-700/75"
        :placeholder="$t('pages.chats.enterCustomReason')"
      ></textarea>
      <div class="flex items-center justify-between text-xs text-gray-400">
        <span v-if="customReasonText.length >= MAX_CUSTOM_REASON_LENGTH" class="text-red-400">
          {{ $t('pages.chats.maxCharactersReached') }}
        </span>
        <span class="ml-auto">
          {{ customReasonText.length }}/{{ MAX_CUSTOM_REASON_LENGTH }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:min-h-12 sm:px-6"
          @click="closeRefusalModal"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] px-5 py-3 text-sm font-semibold transition-colors sm:min-h-12 sm:px-6"
          :class="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())
            ? 'cursor-not-allowed bg-gray-700 text-gray-500'
            : 'market-primary-surface market-primary-hover text-white'"
          :disabled="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())"
          @click="handleReport(dealId)"
        >
          {{ $t('pages.chats.sendReport') }}
        </button>
      </div>
    </template>
  </AppModal>

  <ConfirmWindow
    :isOpen="showConfirmModal"
    :title="$t('pages.chats.confirmReceipt')"
    :message="$t('pages.chats.confirmReceiptMessage')"
    :isLoading="confirmLoading"
    @confirm="doConfirmDeal"
    @cancel="showConfirmModal = false"
  />

  <ConfirmWindow
    :isOpen="showFulfillmentModal"
    :title="$t('pages.chats.confirmFulfillment')"
    :message="$t('pages.chats.confirmFulfillmentMessage')"
    :isLoading="fulfillmentLoading"
    @confirm="doConfirmFulfillment"
    @cancel="showFulfillmentModal = false"
  />

  <ConfirmWindow
    :isOpen="showRefundModal"
    :title="$t('pages.chats.refund')"
    :message="$t('pages.chats.refundConfirmMessage')"
    :isLoading="refundLoading"
    @confirm="doConfirmRefund"
    @cancel="showRefundModal = false"
  />
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

</style>
