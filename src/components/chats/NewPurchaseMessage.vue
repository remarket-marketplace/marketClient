<script setup lang="ts">
import { productService } from '@/api/product/ProductService';
import router from '@/router';
import type { Product } from '@/validation/product/product';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const API_HOST = import.meta.env.VITE_API_HOST
const isConfirmed = ref<boolean>(false)
const isReported = ref<boolean>(false)

defineProps<{
    product: Product
}>()

async function handleReport(productId: string) {
  const response = await productService.sendReport(productId)
  if (response === true) {
    isReported.value = true
  }
}

async function handleConfirmDeal(productId: string) {
  const response = await productService.confirmReceipt(productId)
  if (response === true) {
    isConfirmed.value = true
  }
}

function handleViewProduct(productId: string) {
  router.push(`/product/${productId}`)
}
</script>

<template>
    <div class="my-2">
      <div
        class="overflow-hidden border border-gray-700 rounded-xl bg-dark-800 shadow-lg transition-all duration-200 hover:border-gray-600"
      >
        <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <!-- Изображение товара -->
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

          <!-- Информация о товаре -->
          <div class="flex-1 text-mainText space-y-3 min-w-0">
            <h3
              class="cursor-pointer text-lg font-bold text-white transition-colors duration-200 line-clamp-2"
              @click="handleViewProduct(product.id)"
            >
              {{ product.title }}
            </h3>
            
            <p class="text-xl text-green-400 font-bold">
              {{ product.price }}₽
            </p>

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

        <!-- Кнопки действий -->
        <div class="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center border-t border-gray-700 mt-4 pt-4">
          <!-- Кнопка подтверждения получения -->
          <template v-if="product.status === 'purchased' && !isConfirmed && !product.is_owner">
            <button 
              @click="handleConfirmDeal(product.id)" 
              class="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-700 border border-green-500 min-w-[160px]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ $t('pages.chats.confirmReceipt') }}
            </button>
          </template>

          <template v-else-if="isConfirmed || product.status === 'completed'">
            <div class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[160px]">
              <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ $t('pages.chats.confirmReceipted') }}
            </div>
          </template>

          <!-- Кнопка жалобы -->
          <template v-if="!product.is_owner">
            <div class="sm:ml-auto">
              <button 
                v-if="!isReported && product.status !== 'disputed'"
                @click="handleReport(product.id)" 
                class="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 border border-red-500 min-w-[120px]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                {{ $t('pages.chats.report') }}
              </button>
              
              <div 
                v-else
                class="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 border border-gray-600 min-w-[120px]"
              >
                <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                {{ $t('pages.chats.reported') }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>    
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