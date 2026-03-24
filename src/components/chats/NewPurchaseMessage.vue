<script setup lang="ts">
import { productService } from '@/api/product/ProductService';
import { reviewService } from '@/api/review/ReviewService';
import { chatsService } from '@/api/chats/chatsService';
import { useRouter } from 'vue-router';
import type { Product } from '@/validation/product/product';
import type { RefusalReasonsList } from '@/validation/deal/deal';
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Star, X } from 'lucide-vue-next';
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import { RefreshCcw } from 'lucide-vue-next';
import { formatCurrencyAmount } from '@/utils/currency';
import { buildProductKey } from '@/utils/urlKeys';

const API_HOST = import.meta.env.VITE_API_HOST;

const router = useRouter();
const localDealStatus = ref<string | null>(null);

const showReviewForm = ref(false);
const reviewStars = ref(0);
const reviewText = ref('');
const reviewSubmitting = ref(false);

const showRefusalModal = ref(false);
const refusalReasons = ref<RefusalReasonsList>([]);
const selectedRefusalId = ref<string | null>(null);
const customReasonText = ref('');
const MAX_CUSTOM_REASON_LENGTH = 300;
const otherReasonId = ref<string | null>(null);

const showConfirmModal = ref(false);
const showFulfillmentModal = ref(false);
const showRefundModal = ref(false);
const confirmLoading = ref(false);
const fulfillmentLoading = ref(false);
const refundLoading = ref(false);

const props = defineProps<{
  product: Product,
  dealStatus: string | null,
  dealId: string,
  has_review: boolean | null,
}>();

const localHasReview = ref(props.has_review ?? false);
const effectiveDealStatus = computed(() => localDealStatus.value ?? props.dealStatus);
const isBuyer = computed(() => !props.product.is_owner);
const isSeller = computed(() => props.product.is_owner);
const isDealDisputed = computed(() => effectiveDealStatus.value === 'disputed');
const isDealCompleted = computed(() => effectiveDealStatus.value === 'completed');
const isDealRefunded = computed(() => (
  effectiveDealStatus.value === 'refunded'
  || effectiveDealStatus.value === 'cancelled'
));
const isAwaitingSellerFulfillment = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'pending'
));
const canConfirmFulfillment = computed(() => (
  isSeller.value && effectiveDealStatus.value === 'pending'
));
const canConfirmReceipt = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'confirmed'
));
const canSendReport = computed(() => (
  isBuyer.value && effectiveDealStatus.value === 'confirmed'
));
const showReportedBadge = computed(() => (
  isBuyer.value && isDealDisputed.value
));
const showFulfillmentConfirmedBadge = computed(() => (
  isSeller.value && effectiveDealStatus.value === 'confirmed'
));
const statusBadgeText = computed(() => {
  if (isDealCompleted.value) {
    return isBuyer.value
      ? 'pages.chats.confirmReceipted'
      : 'pages.chats.dealCompleted';
  }
  if (effectiveDealStatus.value === 'cancelled') {
    return 'pages.chats.cancelled';
  }
  if (effectiveDealStatus.value === 'refunded') {
    return 'pages.chats.refundCompleted';
  }
  if (showFulfillmentConfirmedBadge.value) {
    return 'pages.chats.fulfillmentConfirmed';
  }
  if (isAwaitingSellerFulfillment.value) {
    return 'pages.chats.awaitSellerFulfillment';
  }
  return null;
});

// Вычисляемое свойство для проверки, выбрана ли причина "otherReason"
const isOtherReasonSelected = computed(() => {
  if (!selectedRefusalId.value || !otherReasonId.value) return false;
  return selectedRefusalId.value === otherReasonId.value;
});

async function openRefusalModal() {
  if (refusalReasons.value.length === 0) {
    const reasons = await chatsService.getRefusalReasons();
    refusalReasons.value = reasons;

    // Находим id причины с title "otherReason"
    const otherReason = reasons.find(reason => reason.title === 'otherReason');
    if (otherReason) {
      otherReasonId.value = otherReason.id;
    }
  }
  showRefusalModal.value = true;
  customReasonText.value = '';
}

function closeRefusalModal() {
  showRefusalModal.value = false;
  selectedRefusalId.value = null;
  customReasonText.value = '';
}

async function doConfirmDeal() {
  confirmLoading.value = true;
  const response = await productService.confirmReceipt(props.dealId);
  confirmLoading.value = false;
  if (response === true) {
    localDealStatus.value = 'completed';
    localHasReview.value = false;
  }
  showConfirmModal.value = false;
}

async function doConfirmFulfillment() {
  fulfillmentLoading.value = true;
  const response = await productService.confirmFulfillment(props.dealId);
  fulfillmentLoading.value = false;
  if (response === true) {
    localDealStatus.value = 'confirmed';
  }
  showFulfillmentModal.value = false;
}

async function doConfirmRefund() {
  refundLoading.value = true;

  const response = await productService.RefundDeal(props.dealId);

  refundLoading.value = false;
  if (response === true) {
    localDealStatus.value = 'refunded';
  }
  showRefundModal.value = false;
}

function openConfirmReceiptModal() {
  showConfirmModal.value = true;
}

function openConfirmFulfillmentModal() {
  showFulfillmentModal.value = true;
}

function openRefundModal() {
  showRefundModal.value = true;
}

async function handleReport(dealId: string) {
  if (!selectedRefusalId.value) return;

  let description = null;
  // Если выбрана причина "otherReason" и есть текст, отправляем его
  if (isOtherReasonSelected.value && customReasonText.value.trim()) {
    description = customReasonText.value.trim();
  }

  const response = await productService.sendReport(dealId, selectedRefusalId.value, description);
  if (response === true) {
    localDealStatus.value = 'disputed';
    closeRefusalModal();
  }
}

function handleViewProduct(product: Product) {
  const productKey = buildProductKey(product);
  if (!productKey) return;
  router.push(`/product/${productKey}`);
}

async function handleSendReview() {
  if (reviewStars.value < 1 || reviewSubmitting.value) return;
  reviewSubmitting.value = true;
  const response = await reviewService.createReview(props.dealId, reviewStars.value, reviewText.value);
  reviewSubmitting.value = false;
  if (response != null) {
    localHasReview.value = true;
    showReviewForm.value = false;
    reviewStars.value = 0;
    reviewText.value = '';
  }
}

function openReviewModal() {
  reviewStars.value = 0;
  reviewText.value = '';
  showReviewForm.value = true;
}

function closeReviewModal() {
  if (reviewSubmitting.value) return;
  showReviewForm.value = false;
}

watch(showReviewForm, (isOpen) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = isOpen ? 'hidden' : '';
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = '';
})
</script>

<template>
  <div class="my-2 w-full min-w-0">
    <div class="w-full min-w-0 overflow-hidden rounded-xl bg-gray-800/20 shadow-lg">
      <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div class="flex-shrink-0 sm:w-1/3 min-w-0 cursor-pointer" @click="handleViewProduct(product)">
          <div class="relative aspect-square rounded-lg overflow-hidden bg-gray-700 border border-gray-600">
            <img :src="`${API_HOST}${product.images?.[0]?.image_url}`" :alt="product.title"
              class="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>

        <div class="flex-1 text-mainText space-y-3 min-w-0">
          <h3 class="cursor-pointer text-lg font-bold text-white transition-colors duration-200 line-clamp-2"
            @click="handleViewProduct(product)">
            {{ product.title }}
          </h3>

          <p class="text-xl text-green-400 font-bold">{{ formatCurrencyAmount(product.price) }}</p>

          <div v-if="product.auto_delivery" class="space-y-2">
            <p class="text-sm font-semibold text-gray-300 uppercase tracking-wide border-b border-gray-700 pb-2">
              {{ $t('pages.chats.productData') }}
            </p>
            <p class="text-gray-400 text-sm leading-relaxed line-clamp-3 break-words [overflow-wrap:anywhere]">
              {{ product.product_data_string }}
            </p>
          </div>
          <div v-else class="space-y-2">
            <p class="text-sm font-semibold text-yellow-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              {{ $t('pages.chats.manualDelivery') }}
            </p>
            <p class="text-gray-400 text-sm leading-relaxed">
              {{ $t('pages.chats.contactSeller') }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center border-t border-gray-700 mt-4 pt-4">
        <template v-if="canConfirmReceipt">
          <button @click="openConfirmReceiptModal()"
            class="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 border border-green-500 min-w-[160px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ $t('pages.chats.confirmReceipt') }}
          </button>
        </template>

        <template v-else-if="canConfirmFulfillment">
          <button @click="openConfirmFulfillmentModal()"
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 border border-blue-500 min-w-[200px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ $t('pages.chats.confirmFulfillment') }}
          </button>
        </template>

        <template v-else-if="statusBadgeText">
          <div
            class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[200px]">
            <svg class="w-4 h-4" :class="{
              'text-yellow-400': isAwaitingSellerFulfillment,
              'text-blue-400': showFulfillmentConfirmedBadge,
              'text-green-400': isDealCompleted,
              'text-orange-400': isDealRefunded,
            }" fill="currentColor" viewBox="0 0 20 20">
              <path v-if="isAwaitingSellerFulfillment" fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 00.293.707l2 2a1 1 0 101.414-1.414L11 9.586V7z"
                clip-rule="evenodd" />
              <path v-else fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
            {{ $t(statusBadgeText) }}
          </div>
        </template>

        <template v-if="isSeller && effectiveDealStatus === 'pending'">
          <template v-if="!isDealRefunded">
            <button @click="openRefundModal"
              class="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-700 border border-orange-500 min-w-[160px]">
              <RefreshCcw class="w-4 h-4" />
              {{ $t('pages.chats.refund') }}
            </button>
          </template>
          <template v-else>
            <div
              class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[160px]">
              <svg class="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              {{ $t('pages.chats.refundCompleted') }}
            </div>
          </template>
        </template>

        <template v-if="isBuyer">
          <div v-if="canSendReport" class="sm:ml-auto flex flex-col gap-2">
            <button
              @click="openRefusalModal()"
              class="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 border border-red-500 min-w-[160px]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {{ $t('pages.chats.report') }}
            </button>
          </div>

          <div v-else-if="showReportedBadge" class="sm:ml-auto flex flex-col gap-2">
            <div
              class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[160px]"
            >
              <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd" />
              </svg>
              {{ $t('pages.chats.reported') }}
            </div>
          </div>
        </template>
      </div>

      <template v-if="isDealCompleted && !localHasReview && isBuyer">
<<<<<<< Updated upstream
        <div class="px-4 pb-4">
          <button v-if="!showReviewForm" @click="showReviewForm = true"
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 border border-blue-500 w-full">
=======
        <div class="mt-3">
          <button @click="openReviewModal"
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 border border-blue-500">
>>>>>>> Stashed changes
            <Star class="w-4 h-4" /> {{ $t('pages.chats.leaveReview') }}
          </button>
        </div>
      </template>
<<<<<<< Updated upstream

      <template v-if="showReviewForm">
        <div class="w-full bg-gray-800/50 border border-gray-700 p-4 rounded-xl mt-3 space-y-4">
          <div class="flex gap-1 justify-center">
            <Star v-for="n in 5" :key="n" @click="reviewStars = n" class="cursor-pointer"
              :class="reviewStars >= n ? 'text-blue-600 w-6 h-6' : 'text-gray-600 w-6 h-6'" />
          </div>

          <textarea v-model="reviewText" rows="4"
            class="w-full max-h-28 rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm text-gray-200 outline-none focus:border-blue-500"
            :placeholder="$t('pages.chats.writeReview')"></textarea>

          <button @click="handleSendReview()"
            class="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition border border-green-500">
            {{ $t('pages.chats.sendReview') }}
          </button>
        </div>
      </template>
=======
>>>>>>> Stashed changes
    </div>
  </div>

  <transition name="fade">
    <div v-if="showReviewForm" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/65 backdrop-blur-sm" @click="closeReviewModal"></div>

      <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/95 shadow-2xl">
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

        <div class="space-y-5 px-5 py-5">
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
    <div v-if="showRefusalModal" class="fixed inset-0 flex items-center justify-center z-50 px-4">
      <div class="absolute inset-0 bg-black/50" @click="closeRefusalModal"></div>

      <!-- modal window -->
      <div class="relative bg-dark-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-800">
        <!-- title -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
          <h3 class="text-xl font-semibold text-white">
            {{ $t('pages.chats.selectReason') }}
          </h3>
          <button @click="closeRefusalModal"
            class="text-gray-400 hover:text-gray-300 transition-colors p-1 hover:bg-gray-700/30 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- reasons list -->
        <div class="p-4">
          <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
            <button v-for="reason in refusalReasons" :key="reason.id" @click="selectedRefusalId = reason.id" :class="[
              'w-full text-left rounded-2xl border px-4 py-3.5 transition-colors duration-200',
              selectedRefusalId === reason.id
                ? 'border-blue-500/45 bg-dark-700/75 text-white'
                : 'border-dark-600 bg-dark-700/40 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55 hover:text-white'
            ]">
              <div class="flex items-center">
                <div class="flex-shrink-0 mr-3">
                  <div :class="[
                    'h-5 w-5 rounded-full border flex items-center justify-center transition-colors duration-200',
                    selectedRefusalId === reason.id
                      ? 'border-blue-400 bg-blue-500/15 ring-1 ring-blue-500/30'
                      : 'border-gray-500 bg-dark-900/90'
                  ]">
                    <div v-if="selectedRefusalId === reason.id" class="h-2.5 w-2.5 rounded-full bg-blue-400"></div>
                  </div>
                </div>

                <span class="text-sm leading-relaxed font-medium">
                  {{ $t(`common.refusalReasons.${reason.title}`) }}
                </span>
              </div>
            </button>
          </div>

          <!-- Custom reason textarea (only shown when "otherReason" is selected) -->
          <div v-if="isOtherReasonSelected" class="mt-4">
            <textarea v-model="customReasonText" :maxlength="MAX_CUSTOM_REASON_LENGTH" rows="4"
              class="w-full rounded-2xl border border-dark-500 bg-dark-700/55 p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500/60 focus:bg-dark-700/75"
              :placeholder="$t('pages.chats.enterCustomReason')"></textarea>
            <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
              <span class="text-red-400" v-if="customReasonText.length >= MAX_CUSTOM_REASON_LENGTH">
                {{ $t('pages.chats.maxCharactersReached') }}
              </span>
              <span class="ml-auto">
                {{ customReasonText.length }}/{{ MAX_CUSTOM_REASON_LENGTH }}
              </span>
            </div>
          </div>
        </div>

        <!-- action buttons -->
        <div class="flex justify-end gap-3 p-6 pt-4 border-t border-gray-700/50">
          <button @click="closeRefusalModal"
            class="px-5 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors font-medium">
            {{ $t('common.cancel') }}
          </button>
          <button @click="handleReport(dealId)"
            :disabled="!selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())" :class="[
              'px-5 py-2.5 rounded-lg font-medium transition-colors',
              !selectedRefusalId || (isOtherReasonSelected && !customReasonText.trim())
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            ]">
            {{ $t('pages.chats.sendReport') }}
          </button>
        </div>
      </div>
    </div>
  </transition>

  <ConfirmWindow :isOpen="showConfirmModal" :title="$t('pages.chats.confirmReceipt')"
    :message="$t('pages.chats.confirmReceiptMessage')" :isLoading="confirmLoading" @confirm="doConfirmDeal"
    @cancel="showConfirmModal = false" />

  <ConfirmWindow :isOpen="showFulfillmentModal" :title="$t('pages.chats.confirmFulfillment')"
    :message="$t('pages.chats.confirmFulfillmentMessage')" :isLoading="fulfillmentLoading" @confirm="doConfirmFulfillment"
    @cancel="showFulfillmentModal = false" />

  <ConfirmWindow :isOpen="showRefundModal" :title="$t('pages.chats.refund')"
    :message="$t('pages.chats.refundConfirmMessage')" :isLoading="refundLoading" @confirm="doConfirmRefund"
    @cancel="showRefundModal = false" />
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
