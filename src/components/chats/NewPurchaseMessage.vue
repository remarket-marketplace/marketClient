<script setup lang="ts">
import { productService } from '@/api/product/ProductService';
import router from '@/router';
import type { Product } from '@/validation/product/product';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const API_HOST = import.meta.env.VITE_API_HOST
const isConfirmed = ref<boolean>(false)

defineProps<{
    product: Product
}>()

function handleReport() {
  // Логика жалобы
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
        class="overflow-hidden border border-dark-700 rounded-xl bg-dark-600 shadow-lg pb-2"
      >
        <div class="flex flex-col gap-4 p-2 sm:flex-row">
          <div class="flex-shrink-0 sm:w-1/3 min-w-0"> 
            <img
              :src="`${API_HOST}${product.images?.[0]?.image_url}`"
              :alt="product.title"
              class="h-32 w-full rounded-lg object-cover sm:h-full"
              loading="lazy"
              @click="handleViewProduct(product.id)"
            >
          </div>

          <div class="flex-1 text-mainText space-y-1 min-w-0">
            <h3
              class="cursor-pointer truncate text-lg font-bold"
              @click="handleViewProduct(product.id)"
            >
              {{ product.title }}
            </h3>
            <p class="text-xl text-green-400 font-extrabold">
              {{ product.price }}₽
            </p>
            <div class="my-4">
              <p class="text-base font-bold">
                {{ $t('pages.chats.productData') }}
              </p>
              <p class="my-2 text-gray-400 break-words">
                {{ product.product_data_string }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex-1 flex gap-2 px-4">
            <button v-if="product.status === 'purchased' && !isConfirmed && !product.is_owner" @click="handleConfirmDeal(product.id)" class="flex-1 rounded-lg bg-green-500 py-3 font-light text-sm lg:text-base">{{ $t('pages.chats.confirmReceipt') }}</button>
            <div v-if="isConfirmed || product.status === 'completed'" class="py-3 bg-gray-600 rounded-lg px-4 font-light text-sm lg:text-base">{{ $t('pages.chats.confirmReceipted') }}</div>
            <button v-if="!product.is_owner" class="flex-1 rounded-lg bg-red-500 py-3 font-light text-sm lg:text-base">{{ $t('pages.chats.report') }}</button>
        </div>

      </div>
    </div>    
</template>