<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import { reviewService } from '@/api/review/ReviewService'
import { chatsService } from '@/api/chats/chatsService'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import type { RefusalReasonsList } from '@/validation/deal/deal'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Clock3, RefreshCcw, Star } from 'lucide-vue-next'
import AppModal from '@/components/AppModal.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { formatChatTime, getChatTimestamp } from '@/utils/chatDate'
import { getShortDealId } from '@/utils/dealId'
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
const route = useRoute()
const { locale, t } = useI18n()

const localDealStatus = ref<string | null>(null)
const localHasReview = ref(false)

const showReviewModal = ref(false)
const reviewStars = ref(0)
const reviewText = ref('')
const reviewSubmitting = ref(false)
const showAutoConfirmTooltip = ref(false)
let autoConfirmTooltipTimer: ReturnType<typeof setTimeout> | null = null

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
const shouldShowInlineReportAction = computed(() => (
  isBuyer.value && canSendReport.value
))
const shouldShowInlineReportedState = computed(() => (
  isBuyer.value && showReportedBadge.value
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
    : 'message-compose-shell mx-auto flex w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-[26px] border border-[rgb(var(--palette-white)/0.07)] bg-[rgb(var(--palette-dark-900)/0.92)] px-4 py-3'
))
const summaryHeaderClass = computed(() => (
  isSummaryLayout.value
    ? 'order-1 flex min-h-8 flex-wrap items-center justify-between gap-2'
    : 'mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--palette-dark-600)/0.65)] pb-2.5'
))
const contentClass = computed(() => (
  isSummaryLayout.value ? 'order-3 flex flex-col gap-2 sm:gap-2.5' : 'flex flex-col gap-3'
))
const topRowClass = computed(() => (
  isSummaryLayout.value ? 'flex items-start gap-2.5 sm:gap-3' : 'flex items-start gap-3'
))
const imageButtonClass = computed(() => (
  isSummaryLayout.value
    ? 'h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-700))] transition hover:border-[rgb(var(--palette-white)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.5)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))] sm:h-11 sm:w-11'
    : 'h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700))] transition hover:border-[rgb(var(--palette-dark-500))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.5)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))]'
))
const actionsClass = computed(() => (
  isSummaryLayout.value
    ? 'order-4 mt-1 flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2'
    : 'mt-1 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--palette-dark-600)/0.65)] pt-3'
))
const reviewActionClass = computed(() => (
  isSummaryLayout.value ? 'order-5 mt-0.5 w-full sm:w-auto' : 'mt-3'
))
const titleClass = computed(() => (
  isSummaryLayout.value ? 'mt-0.5 block min-w-0 rounded-sm px-0.5 text-left text-xs font-semibold leading-tight text-[var(--text-title)] transition hover:text-[var(--text-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.5)] sm:text-[13px]' : 'mt-1 block min-w-0 rounded-sm px-0.5 text-left text-sm font-semibold text-[var(--text-title)] transition hover:text-[var(--text-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.5)]'
))
const priceClass = computed(() => (
  isSummaryLayout.value ? 'text-[11px] font-semibold text-[rgb(var(--text-body-rgb)/0.86)] sm:text-xs' : 'text-sm font-semibold text-[var(--text-success)]'
))
const deliveryClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full rounded-lg border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5'
    : 'w-full rounded-xl border border-[rgb(var(--palette-dark-600)/0.75)] bg-[rgb(var(--palette-dark-800)/0.55)] px-3 py-2.5'
))
const helperClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full rounded-lg border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5'
    : 'w-full rounded-xl border border-[rgb(var(--palette-dark-600)/0.75)] bg-[rgb(var(--palette-dark-800)/0.55)] px-3 py-2.5'
))
const summaryPrimaryButtonClass = computed(() => (
  'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-title)] transition-all sm:min-h-0 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.55)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))] active:translate-y-px'
))
const summaryStatusClass = computed(() => (
  'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-body-strong)] sm:min-h-0 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm'
))
const primaryActionButtonClass = computed(() => (
  isSummaryLayout.value
    ? `${summaryPrimaryButtonClass.value} market-primary-surface market-primary-hover border border-[rgb(var(--palette-blue-500))]`
    : 'market-primary-surface market-primary-hover flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-blue-500))] px-4 py-2.5 text-sm font-semibold text-[var(--text-title)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.55)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))] active:translate-y-px'
))
const secondaryActionButtonClass = computed(() => (
  isSummaryLayout.value
    ? `${summaryPrimaryButtonClass.value} border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body-strong)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-white)/0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))] active:translate-y-px`
    : 'flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-4 py-2.5 text-sm font-semibold text-[var(--text-body-strong)] transition-all hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-white)/0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))] active:translate-y-px'
))
const shouldShowSummaryToggle = computed(() => isSummaryLayout.value && props.collapsible === true)
const showSummaryBody = computed(() => !isSummaryLayout.value || props.collapsed !== true)
const shortDealId = computed(() => getShortDealId(props.dealId))
const orderLabel = computed(() => (
  shortDealId.value
    ? t('pages.chats.orderNumber', { id: shortDealId.value })
    : ''
))
const timelineTimestamp = computed(() => {
  if (isSummaryLayout.value || !props.createdAt) return null
  return formatChatTime(props.createdAt, locale.value) || null
})

const DEAL_AUTO_CONFIRM_FALLBACK_WINDOW_MS = 48 * 60 * 60 * 1000
let cachedDealAutoConfirmWindowMs: number | null = null
let hasLoadedDealAutoConfirmWindow = false
let pendingDealAutoConfirmWindowPromise: Promise<number | null> | null = null
const dealAutoConfirmWindowMs = ref(DEAL_AUTO_CONFIRM_FALLBACK_WINDOW_MS)
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
      timestamp: getChatTimestamp(item.created_at),
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
  return Math.max(0, dealAutoConfirmWindowMs.value - elapsedMs)
})

const autoConfirmTimerLabel = computed(() => {
  if (autoConfirmRemainingMs.value === null) return null
  const totalMinutes = Math.floor(autoConfirmRemainingMs.value / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const normalizedLocale = String(locale.value || 'en').toLowerCase()
  if (normalizedLocale.startsWith('ru')) {
    if (hours <= 0) return `${minutes}м`
    return `${hours}ч ${minutes}м`
  }

  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
})

type DealProgressState = 'completed' | 'current' | 'upcoming'

type DealProgressStep = {
  key: 'paid' | 'fulfilled' | 'confirmed'
  label: string
  state: DealProgressState
}

const hasFulfillmentEvent = computed(() => (
  normalizedDealTimeline.value.some((event) => event.status === 'confirmed')
))

const dealProgressSteps = computed<DealProgressStep[]>(() => {
  const normalizedStatus = (effectiveDealStatus.value ?? 'pending').toLowerCase()
  let paidState: DealProgressState = 'completed'
  let fulfilledState: DealProgressState = 'upcoming'
  let confirmedState: DealProgressState = 'upcoming'

  if (normalizedStatus === 'pending') {
    fulfilledState = 'current'
  } else if (normalizedStatus === 'confirmed' || normalizedStatus === 'disputed') {
    fulfilledState = 'completed'
    confirmedState = 'current'
  } else if (normalizedStatus === 'completed') {
    fulfilledState = 'completed'
    confirmedState = 'completed'
  } else if (normalizedStatus === 'refunded' || normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    fulfilledState = hasFulfillmentEvent.value ? 'completed' : 'current'
  } else {
    paidState = 'current'
  }

  return [
    { key: 'paid', label: t('pages.chats.dealProgress.paid'), state: paidState },
    { key: 'fulfilled', label: t('pages.chats.dealProgress.fulfilled'), state: fulfilledState },
    { key: 'confirmed', label: t('pages.chats.dealProgress.confirmed'), state: confirmedState },
  ]
})

function getDealProgressChipClass(state: DealProgressState): string {
  if (state === 'completed') {
    return 'border-[rgb(var(--palette-green-500)/0.35)] bg-[rgb(var(--palette-green-500)/0.14)]'
  }
  if (state === 'current') {
    return 'border-[rgb(var(--palette-blue-500)/0.38)] bg-[rgb(var(--palette-blue-500)/0.14)]'
  }
  return 'border-[rgb(var(--palette-dark-600)/0.75)] bg-[rgb(var(--palette-dark-700)/0.6)]'
}

function getDealProgressDotClass(state: DealProgressState): string {
  if (state === 'completed') return 'bg-[rgb(var(--palette-green-400))]'
  if (state === 'current') return 'bg-[rgb(var(--palette-blue-400))]'
  return 'bg-[rgb(var(--palette-gray-500))]'
}

function getDealProgressTextClass(state: DealProgressState): string {
  if (state === 'completed') return 'text-[rgb(var(--palette-green-100))]'
  if (state === 'current') return 'text-[rgb(var(--palette-blue-100))]'
  return 'text-[rgb(var(--text-body-rgb)/0.82)]'
}

function startDealTimerInterval() {
  if (dealTimerIntervalId !== null) return
  dealTimerIntervalId = setInterval(() => {
    dealTimerNowTs.value = Date.now()
  }, 1000)
}

function hideAutoConfirmTooltip() {
  showAutoConfirmTooltip.value = false
  if (autoConfirmTooltipTimer) {
    clearTimeout(autoConfirmTooltipTimer)
    autoConfirmTooltipTimer = null
  }
}

function toggleAutoConfirmTooltip() {
  showAutoConfirmTooltip.value = !showAutoConfirmTooltip.value

  if (autoConfirmTooltipTimer) {
    clearTimeout(autoConfirmTooltipTimer)
    autoConfirmTooltipTimer = null
  }

  if (showAutoConfirmTooltip.value) {
    autoConfirmTooltipTimer = setTimeout(() => {
      showAutoConfirmTooltip.value = false
      autoConfirmTooltipTimer = null
    }, 2600)
  }
}

function stopDealTimerInterval() {
  if (dealTimerIntervalId === null) return
  clearInterval(dealTimerIntervalId)
  dealTimerIntervalId = null
}

async function loadDealAutoConfirmWindow() {
  if (hasLoadedDealAutoConfirmWindow) {
    if (cachedDealAutoConfirmWindowMs !== null) {
      dealAutoConfirmWindowMs.value = cachedDealAutoConfirmWindowMs
    }
    return
  }

  if (cachedDealAutoConfirmWindowMs !== null) {
    dealAutoConfirmWindowMs.value = cachedDealAutoConfirmWindowMs
    return
  }

  pendingDealAutoConfirmWindowPromise ??= productService
    .getDealAutoCompleteDelaySeconds()
    .finally(() => {
      pendingDealAutoConfirmWindowPromise = null
    })

  const delaySeconds = await pendingDealAutoConfirmWindowPromise
  hasLoadedDealAutoConfirmWindow = true
  if (delaySeconds === null) return

  cachedDealAutoConfirmWindowMs = delaySeconds * 1000
  dealAutoConfirmWindowMs.value = cachedDealAutoConfirmWindowMs
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

onMounted(() => {
  void loadDealAutoConfirmWindow()
})


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
    const rawChatId = route.query.chatId
    const chatId = Array.isArray(rawChatId) ? (rawChatId[0] ?? null) : (rawChatId ?? null)
    router.push({
      name: 'afterpayment',
      query: {
        dealId: props.dealId,
        review: '1',
        ...(chatId ? { chatId } : {}),
      },
    })
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
  hideAutoConfirmTooltip()
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
})
</script>

<template>
  <div :class="rootClass">
    <div :class="cardClass" class="flex min-w-0 flex-col">
      <div :class="summaryHeaderClass">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-link-rgb)/0.9)] sm:text-xs sm:tracking-[0.14em]">
            {{ $t(headerTitleKey) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="orderLabel"
            class="inline-flex items-center rounded-full border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.04)] px-2 py-1 text-[10px] font-semibold tracking-[0.06em] text-[var(--text-body-strong)] sm:text-[11px]"
          >
            {{ orderLabel }}
          </span>
          <span
            v-if="shouldShowAutoConfirmTimer && autoConfirmTimerLabel"
            class="relative inline-flex items-center gap-1 rounded-full border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.04)] px-2 py-1 text-[10px] font-semibold tracking-[0.02em] text-[var(--text-body-strong)] sm:gap-1.5 sm:text-[11px]"
          >
            <button
              type="button"
              class="inline-flex h-4 w-4 items-center justify-center rounded-full text-[rgb(var(--text-body-rgb)/0.85)] transition hover:text-[var(--text-title)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.55)]"
              @click.stop="toggleAutoConfirmTooltip"
            >
              <Clock3 class="h-3 w-3" />
            </button>
            <span class="sm:hidden">{{ autoConfirmTimerLabel }}</span>
            <span class="hidden sm:inline">{{ $t('pages.chats.autoConfirmTimer', { value: autoConfirmTimerLabel }) }}</span>
            <span
              v-if="showAutoConfirmTooltip"
              class="absolute left-0 top-[calc(100%+0.45rem)] z-20 min-w-[210px] rounded-md border border-[rgb(var(--palette-white)/0.14)] bg-[rgb(var(--palette-dark-900)/0.98)] px-2.5 py-1.5 text-left text-[10px] font-medium leading-tight text-[var(--text-body-strong)] shadow-[0_8px_18px_rgb(0_0_0/0.38)] sm:text-[11px]"
            >
              {{ $t('pages.chats.autoConfirmTooltip', { value: autoConfirmTimerLabel }) }}
            </span>
          </span>
          <button
            v-if="shouldShowSummaryToggle"
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] text-[var(--text-body)] transition hover:bg-[rgb(var(--palette-white)/0.06)] hover:text-[var(--text-title)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-blue-400)/0.5)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))]"
            @click="handleToggleSummaryCollapse"
          >
            <ChevronUp v-if="!props.collapsed" class="h-4 w-4" />
            <ChevronDown v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="showSummaryBody" :class="contentClass">
        <div v-if="!isSummaryLayout" class="mb-2 flex items-center gap-2">
          <DealStatusTag :deal-status="currentDealStatus" />
        </div>
        <div v-if="isSummaryLayout" class="mb-1 grid grid-cols-3 gap-1 sm:gap-1.5">
          <div
            v-for="step in dealProgressSteps"
            :key="step.key"
            class="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 py-1 sm:gap-1.5 sm:px-2"
            :class="getDealProgressChipClass(step.state)"
          >
            <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" :class="getDealProgressDotClass(step.state)"></span>
            <span class="truncate text-[9px] font-medium sm:text-[11px]" :class="getDealProgressTextClass(step.state)">
              {{ step.label }}
            </span>
          </div>
        </div>
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
            <div class="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2 sm:gap-3">
              <div class="min-w-0 flex-1">
                <button
                  type="button"
                  :class="titleClass"
                  @click="handleViewProduct(product)"
                >
                  <span class="line-clamp-2">{{ product.title }}</span>
                </button>
              </div>

              <p :class="priceClass" class="whitespace-nowrap sm:ml-auto">
                <span v-if="isSummaryLayout">{{ $t('pages.chats.orderTotalLabel') }}: </span>
                {{ formatCurrencyAmount(product.price) }}
              </p>
            </div>

          </div>
        </div>

        <div
          v-if="!isSummaryLayout && deliverySummary"
          :class="deliveryClass"
        >
          <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-[rgb(var(--text-body-rgb)/0.7)]">
            {{ $t('pages.chats.productData') }}
          </p>
          <p class="mt-1 line-clamp-3 break-words text-sm leading-relaxed text-[var(--text-body-strong)] [overflow-wrap:anywhere]">
            {{ deliverySummary }}
          </p>
        </div>

        <div
          v-else-if="!isSummaryLayout && sellerActionTitle && sellerActionText"
          :class="helperClass"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-link-rgb)/0.9)]">
            {{ $t(sellerActionTitle) }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-[var(--text-body-strong)]">
            {{ $t(sellerActionText) }}
          </p>
        </div>

        <div
          v-else-if="!isSummaryLayout && buyerActionText"
          :class="helperClass"
        >
          <p class="text-sm leading-relaxed text-[var(--text-body)]">
            {{ $t(buyerActionText) }}
          </p>
        </div>

        <div
          v-if="isSummaryLayout && deliverySummary"
          :class="deliveryClass"
        >
          <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:text-[11px]">
            {{ $t('pages.chats.productData') }}
          </p>
          <p class="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-[var(--text-body-strong)] sm:text-sm [overflow-wrap:anywhere]">
            {{ deliverySummary }}
          </p>
        </div>

        <div
          v-else-if="isSummaryLayout && sellerActionTitle && sellerActionText"
          :class="helperClass"
        >
          <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-link-rgb)/0.9)] sm:text-[11px]">
            {{ $t(sellerActionTitle) }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-[var(--text-body-strong)] sm:text-sm">
            {{ $t(sellerActionText) }}
          </p>
        </div>

        <div
          v-else-if="isSummaryLayout && buyerActionText"
          :class="helperClass"
        >
          <p class="text-xs leading-relaxed text-[var(--text-body)] sm:text-sm">
            {{ $t(buyerActionText) }}
          </p>
        </div>
      </div>

      <div v-if="showSummaryBody" :class="actionsClass">
        <template v-if="canConfirmReceipt">
          <div class="flex w-full flex-col gap-1 sm:w-auto">
            <button
              :class="primaryActionButtonClass"
              @click="openConfirmReceiptModal()"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ $t('pages.chats.confirmReceipt') }}
            </button>
            <p v-if="isSummaryLayout" class="text-[10px] text-[rgb(var(--text-body-rgb)/0.78)] sm:text-[11px]">
              {{ $t('pages.chats.confirmReceiptHint') }}
            </p>
          </div>
        </template>

        <template v-else-if="canConfirmFulfillment">
          <button
            :class="primaryActionButtonClass"
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
              :class="secondaryActionButtonClass"
              @click="openRefundModal"
            >
              <RefreshCcw class="h-4 w-4" />
              {{ $t('pages.chats.refund') }}
            </button>
          </template>
          <template v-else>
            <div :class="isSummaryLayout ? `${summaryStatusClass} border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.7)]` : 'flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.7)] px-4 py-2.5 text-sm font-semibold text-[var(--text-body-strong)]'">
              <svg class="h-4 w-4 text-[var(--text-warning-strong)]" fill="currentColor" viewBox="0 0 20 20">
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

      </div>

      <template v-if="showSummaryBody && isDealCompleted && !localHasReview && isBuyer">
        <div :class="reviewActionClass">
          <button
            :class="primaryActionButtonClass"
            @click="openReviewModal"
          >
            <Star class="h-4 w-4" />
            {{ $t('pages.chats.leaveReview') }}
          </button>
        </div>
      </template>

      <div
        v-if="timelineTimestamp || shouldShowInlineReportAction || shouldShowInlineReportedState"
        class="mt-1 flex items-center justify-between gap-2 text-xs text-[rgb(var(--text-body-rgb)/0.76)]"
      >
        <span class="truncate">{{ timelineTimestamp ?? '' }}</span>
        <button
          v-if="shouldShowInlineReportAction"
          type="button"
          class="inline-flex items-center justify-end rounded-sm px-0.5 py-0.5 text-xs font-medium text-[rgb(var(--text-body-rgb)/0.7)] no-underline transition hover:text-[var(--text-title)] hover:underline hover:underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--palette-white)/0.28)] focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--palette-dark-900))]"
          @click="openRefusalModal()"
        >
          {{ $t('pages.chats.report') }}
        </button>
        <span
          v-else-if="shouldShowInlineReportedState"
          class="text-xs font-medium text-[rgb(var(--text-body-rgb)/0.66)]"
        >
          {{ $t('pages.chats.reported') }}
        </span>
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
          :class="reviewStars >= n ? 'fill-[var(--text-link)] text-[var(--text-link)]' : 'text-[var(--text-meta)]'"
        />
      </button>
    </div>

    <textarea
      v-model="reviewText"
      rows="5"
      maxlength="1000"
      class="w-full resize-none rounded-2xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.55)] p-3 text-sm text-[var(--text-heading)] outline-none transition placeholder:text-[var(--text-meta)] focus:border-[rgb(var(--palette-blue-500)/0.6)] focus:bg-[rgb(var(--palette-dark-700)/0.75)]"
      :placeholder="$t('pages.chats.writeReview')"
      :disabled="reviewSubmitting"
    ></textarea>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-5 py-3 text-sm font-medium text-[var(--text-body-strong)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-6"
          :disabled="reviewSubmitting"
          @click="closeReviewModal"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="button"
          class="market-primary-surface market-primary-hover inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-blue-500))] px-5 py-3 text-sm font-semibold text-[var(--text-title)] transition disabled:cursor-not-allowed disabled:border-[rgb(var(--palette-dark-600))] disabled:bg-[rgb(var(--palette-dark-700))] disabled:text-[var(--text-meta)] sm:min-h-12 sm:px-6"
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
          ? 'border-[rgb(var(--palette-blue-500)/0.45)] bg-[rgb(var(--palette-dark-700)/0.75)] text-[var(--text-title)]'
          : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-700)/0.55)] hover:text-[var(--text-title)]'"
        @click="selectedRefusalId = reason.id"
      >
        <div class="flex items-center">
          <div class="mr-3 flex-shrink-0">
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200"
              :class="selectedRefusalId === reason.id
                ? 'border-[rgb(var(--palette-blue-400))] bg-[rgb(var(--palette-blue-500)/0.15)] ring-1 ring-[rgb(var(--palette-blue-500)/0.3)]'
                : 'border-[rgb(var(--palette-gray-500))] bg-[rgb(var(--palette-dark-900)/0.9)]'"
            >
              <div
                v-if="selectedRefusalId === reason.id"
                class="h-2.5 w-2.5 rounded-full bg-[rgb(var(--palette-blue-400))]"
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
        class="w-full rounded-2xl border border-[rgb(var(--palette-dark-500))] bg-[rgb(var(--palette-dark-700)/0.55)] p-3 text-sm text-[var(--text-heading)] outline-none transition-colors placeholder:text-[var(--text-meta)] focus:border-[rgb(var(--palette-blue-500)/0.6)] focus:bg-[rgb(var(--palette-dark-700)/0.75)]"
        :placeholder="$t('pages.chats.enterCustomReason')"
      ></textarea>
      <div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span v-if="customReasonText.length >= MAX_CUSTOM_REASON_LENGTH" class="text-[var(--text-danger)]">
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
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-5 py-3 text-sm font-medium text-[var(--text-body-strong)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] sm:min-h-12 sm:px-6"
          @click="closeRefusalModal"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] px-5 py-3 text-sm font-semibold transition-colors sm:min-h-12 sm:px-6"
          :class="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())
            ? 'cursor-not-allowed bg-[rgb(var(--palette-gray-700))] text-[var(--text-meta)]'
            : 'market-primary-surface market-primary-hover text-[var(--text-title)]'"
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
