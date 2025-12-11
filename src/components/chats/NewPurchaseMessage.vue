<script setup lang="ts">
import { productService } from '@/api/product/ProductService';
import { reviewService } from '@/api/review/ReviewService';
import { chatsService } from '@/api/chats/chatsService';
import router from '@/router';
import type { Product } from '@/validation/product/product';
import type { RefusalReasonsList } from '@/validation/deal/deal';
import { ref } from 'vue';
import { Star, X } from 'lucide-vue-next';
import ConfirmWindow from '@/components/ConfirmWindow.vue'

const API_HOST = import.meta.env.VITE_API_HOST;

const isConfirmed = ref(false);
const isReported = ref(false);

const showReviewForm = ref(false);
const reviewStars = ref(0);
const reviewText = ref('');

const showRefusalModal = ref(false);
const refusalReasons = ref<RefusalReasonsList>([]);
const selectedRefusalId = ref<string | null>(null);

const showConfirmModal = ref(false);
const confirmLoading = ref(false);

const props = defineProps<{
  product: Product,
  dealStatus: string | null,
  dealId: string,
  has_review: boolean | null,
}>();

const localHasReview = ref(props.has_review ?? false);

async function openRefusalModal() {
  if (refusalReasons.value.length === 0) {
    const reasons = await chatsService.getRefusalReasons();
    refusalReasons.value = reasons;
  }
  showRefusalModal.value = true;
}

function closeRefusalModal() {
  showRefusalModal.value = false;
  selectedRefusalId.value = null;
}

async function doConfirmDeal() {
  confirmLoading.value = true;
  const response = await productService.confirmReceipt(props.dealId);
  confirmLoading.value = false;
  if (response === true) {
    isConfirmed.value = true;
    localHasReview.value = false;
  }
  showConfirmModal.value = false;
}

function openConfirmReceiptModal() {
  showConfirmModal.value = true;
}

async function handleReport(productId: string) {
  if (!selectedRefusalId.value) return;
  const response = await productService.sendReport(productId, selectedRefusalId.value);
  if (response === true) {
    isReported.value = true;
    closeRefusalModal();
  }
}

function handleViewProduct(productId: string) {
  router.push(`/product/${productId}`);
}

async function handleSendReview(productId: string) {
  if (reviewStars.value < 1) return;
  showReviewForm.value = false;
  const response = await reviewService.createReview(props.dealId!, reviewStars.value, reviewText.value);
  if (response != null) {
    localHasReview.value = true;
    showReviewForm.value = false;
  }
}
</script>

<template>
  <div class="my-2">
    <div class="overflow-hidden bg-gray-800/20 rounded-xl shadow-lg">
      <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div class="flex-shrink-0 sm:w-1/3 min-w-0 cursor-pointer" @click="handleViewProduct(product.id)">
          <div class="relative aspect-square rounded-lg overflow-hidden bg-gray-700 border border-gray-600">
            <img
              :src="`${API_HOST}${product.images?.[0]?.image_url}`"
              :alt="product.title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <div class="flex-1 text-mainText space-y-3 min-w-0">
          <h3
            class="cursor-pointer text-lg font-bold text-white transition-colors duration-200 line-clamp-2"
            @click="handleViewProduct(product.id)"
          >
            {{ product.title }}
          </h3>

          <p class="text-xl text-green-400 font-bold">{{ product.price }}₽</p>

          <div class="space-y-2">
            <p class="text-sm font-semibold text-gray-300 uppercase tracking-wide border-b border-gray-700 pb-2">
              {{ $t('pages.chats.productData') }}
            </p>
            <p class="text-gray-400 text-sm leading-relaxed line-clamp-3">
              {{ product.product_data_string }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center border-t border-gray-700 mt-4 pt-4">

        <template v-if="dealStatus == 'pending' && !isConfirmed && !isReported && !product.is_owner">
          <button 
            @click="openConfirmReceiptModal()" 
            class="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 border border-green-500 min-w-[160px]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ $t('pages.chats.confirmReceipt') }}
          </button>
        </template>

        <template v-else-if="isConfirmed || dealStatus === 'confirmed'">
          <div class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[160px]">
            <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            {{ $t('pages.chats.confirmReceipted') }}
          </div>
        </template>

        <template v-if="!product.is_owner">
          <div class="sm:ml-auto flex flex-col gap-2">
            <button 
              v-if="!isReported && dealStatus !== 'disputed'"
              @click="openRefusalModal()" 
              class="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 border border-red-500 min-w-[160px]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              {{ $t('pages.chats.report') }}
            </button>

            <div v-else class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[160px]">
              <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              {{ $t('pages.chats.reported') }}
            </div>
          </div>
        </template>
      </div>

      <template v-if="(isConfirmed || dealStatus === 'completed') && !localHasReview && !product.is_owner">
        <div class="px-4 pb-4">
          <button
            v-if="!showReviewForm"
            @click="showReviewForm = true"
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 border border-blue-500 w-full"
          >
            <Star class="w-4 h-4"/> {{ $t('pages.chats.leaveReview') }}
          </button>
        </div>
      </template>

      <template v-if="showReviewForm">
        <div class="w-full bg-gray-800/50 border border-gray-700 p-4 rounded-xl mt-3 space-y-4">
          <div class="flex gap-1 justify-center">
            <Star
              v-for="n in 5"
              :key="n"
              @click="reviewStars = n"
              class="cursor-pointer"
              :class="reviewStars >= n ? 'text-blue-600 w-6 h-6' : 'text-gray-600 w-6 h-6'"
            />
          </div>

          <textarea
            v-model="reviewText"
            rows="4"
            class="w-full max-h-28 rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm text-gray-200 outline-none focus:border-blue-500"
            :placeholder="$t('pages.chats.writeReview')"
          ></textarea>

          <button
            @click="handleSendReview(product.id)"
            class="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition border border-green-500"
          >
            {{ $t('pages.chats.sendReview') }}
          </button>
        </div>
      </template>

    </div>
  </div>

  <transition name="fade">
    <div
      v-if="showRefusalModal"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      @click.self="closeRefusalModal"
    >
      <div class="bg-dark-900 rounded-xl w-96 max-w-full p-6 relative">
        <button
          class="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
          @click="closeRefusalModal"
        >
          <X class="w-5 h-5"/>
        </button>
        <h3 class="text-lg font-bold text-white mb-4">{{ $t('pages.chats.selectReason') }}</h3>
        <div class="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
          <button
            v-for="reason in refusalReasons"
            :key="reason.id"
            @click="selectedRefusalId = reason.id"
            :class="selectedRefusalId === reason.id ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-200'"
            class="px-4 py-2 rounded-lg text-left font-medium hover:bg-red-600 transition"
          >
            {{ $t(`pages.chats.${reason.title}`) }}
          </button>
        </div>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 cursor-pointer"
            @click="handleReport(product.id)"
            :disabled="!selectedRefusalId"
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

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
