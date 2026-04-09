<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import { reviewService } from '@/api/review/ReviewService'
import { chatsService } from '@/api/chats/chatsService'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import type { RefusalReasonsList } from '@/validation/deal/deal'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RefreshCcw, Star, X } from 'lucide-vue-next'
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
}>()

const router = useRouter()

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
const rootClass = computed(() => (
  isSummaryLayout.value ? 'w-full min-w-0' : 'my-2 w-full min-w-0'
))
const cardClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full min-w-0'
    : 'mx-auto w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/55 p-4'
))
const summaryHeaderClass = computed(() => (
  isSummaryLayout.value
    ? 'order-1 mb-1.5 flex flex-wrap items-center justify-between gap-2 sm:mb-2'
    : 'hidden'
))
const contentClass = computed(() => (
  isSummaryLayout.value ? 'order-3 flex flex-col gap-2 sm:gap-2.5' : 'flex items-start gap-3'
))
const topRowClass = computed(() => (
  isSummaryLayout.value ? 'flex items-start gap-2.5 sm:gap-3' : 'contents'
))
const imageButtonClass = computed(() => (
  isSummaryLayout.value
    ? 'h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-dark-700 sm:h-11 sm:w-11'
    : 'h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-dark-600 bg-dark-700'
))
const actionsClass = computed(() => (
  isSummaryLayout.value
    ? 'order-2 mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2'
    : 'mt-4 flex flex-wrap items-center gap-2 border-t border-dark-700/80 pt-3'
))
const reviewActionClass = computed(() => (
  isSummaryLayout.value ? 'order-4 mt-0' : 'mt-3'
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
    : 'mt-3 rounded-xl border border-dark-700/80 bg-dark-700/45 px-3 py-2.5'
))
const helperClass = computed(() => (
  isSummaryLayout.value
    ? 'w-full rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5'
    : 'mt-3 rounded-xl border border-dark-700/80 bg-dark-700/45 px-3 py-2.5'
))


const deliverySummary = computed(() => (
  props.product.auto_delivery ? props.product.product_data_string || null : null
))

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
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
})
</script>

<template>
  <div :class="rootClass">
    <div :class="cardClass" class="flex min-w-0 flex-col">
      <div v-if="isSummaryLayout" :class="summaryHeaderClass">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/90 sm:text-xs sm:tracking-[0.14em]">
            {{ $t('pages.chats.latestDeal') }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <DealStatusTag :deal-status="currentDealStatus" />
        </div>
      </div>

      <div :class="contentClass">
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
                <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300/90 sm:text-[11px] sm:tracking-[0.14em]">
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
          v-if="deliverySummary"
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
          v-else-if="sellerActionTitle && sellerActionText"
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
          v-else-if="buyerActionText"
          :class="helperClass"
        >
          <p class="text-xs leading-relaxed text-gray-300 sm:text-sm">
            {{ $t(buyerActionText) }}
          </p>
        </div>
      </div>

      <div :class="actionsClass">
        <template v-if="canConfirmReceipt">
          <button
            class="flex items-center justify-center gap-2 rounded-lg border border-green-500 bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-700"
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
            class="market-primary-surface market-primary-hover flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all"
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
              class="flex items-center justify-center gap-2 rounded-lg border border-orange-500 bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-700"
              @click="openRefundModal"
            >
              <RefreshCcw class="h-4 w-4" />
              {{ $t('pages.chats.refund') }}
            </button>
          </template>
          <template v-else>
            <div class="flex items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700/70 px-4 py-2.5 text-sm font-semibold text-gray-200">
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
              class="flex items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
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
            <div class="flex items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700/70 px-4 py-2.5 text-sm font-semibold text-gray-200">
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

      <template v-if="isDealCompleted && !localHasReview && isBuyer">
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
    </div>
  </div>

  <transition name="fade">
    <div v-if="showReviewModal" class="app-modal-overlay z-50">
      <div class="absolute inset-0 bg-black/65 backdrop-blur-sm" @click="closeReviewModal"></div>

      <div class="app-modal-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/95 shadow-2xl">
        <div class="flex items-center justify-between border-b border-dark-700/80 px-5 py-4">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ $t('pages.chats.leaveReview') }}</h3>
            <p class="mt-1 text-sm text-gray-400">{{ $t('pages.chats.writeReview') }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-gray-400 transition hover:bg-dark-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="reviewSubmitting"
            @click="closeReviewModal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="app-modal-scroll space-y-5 px-5 py-5">
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

          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-dark-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="reviewSubmitting"
              @click="closeReviewModal"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-green-500 bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:border-dark-600 disabled:bg-dark-700 disabled:text-gray-500"
              :disabled="reviewStars < 1 || reviewSubmitting"
              @click="handleSendReview()"
            >
              {{ $t('pages.chats.sendReview') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <transition name="fade">
    <div v-if="showRefusalModal" class="app-modal-overlay z-50">
      <div class="absolute inset-0 bg-black/50" @click="closeRefusalModal"></div>

      <div class="app-modal-panel relative flex w-full max-w-md flex-col rounded-2xl border border-gray-800 bg-dark-800 shadow-2xl">
        <div class="flex items-center justify-between border-b border-gray-700/50 p-6 pb-4">
          <h3 class="text-xl font-semibold text-white">
            {{ $t('pages.chats.selectReason') }}
          </h3>
          <button
            class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-gray-300"
            @click="closeRefusalModal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="app-modal-scroll p-4">
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

          <div v-if="isOtherReasonSelected" class="mt-4">
            <textarea
              v-model="customReasonText"
              :maxlength="MAX_CUSTOM_REASON_LENGTH"
              rows="4"
              class="w-full rounded-2xl border border-dark-500 bg-dark-700/55 p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500/60 focus:bg-dark-700/75"
              :placeholder="$t('pages.chats.enterCustomReason')"
            ></textarea>
            <div class="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span v-if="customReasonText.length >= MAX_CUSTOM_REASON_LENGTH" class="text-red-400">
                {{ $t('pages.chats.maxCharactersReached') }}
              </span>
              <span class="ml-auto">
                {{ customReasonText.length }}/{{ MAX_CUSTOM_REASON_LENGTH }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t border-gray-700/50 p-6 pt-4">
          <button
            class="rounded-lg px-5 py-2.5 font-medium text-gray-300 transition-colors hover:bg-gray-700/50 hover:text-white"
            @click="closeRefusalModal"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            class="rounded-lg px-5 py-2.5 font-medium transition-colors"
            :class="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())
              ? 'cursor-not-allowed bg-gray-700 text-gray-500'
              : 'market-primary-surface market-primary-hover text-white'"
            :disabled="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())"
            @click="handleReport(dealId)"
          >
            {{ $t('pages.chats.sendReport') }}
          </button>
        </div>
      </div>
    </div>
  </transition>

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
