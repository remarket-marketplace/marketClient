<script setup lang="ts">
import router from '@/router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const API_HOST = import.meta.env.VITE_API_HOST

defineProps<{
    product: any
}>()

function handleReport() {
  // Логика жалобы
}

function handleConfirmDeal() {
  // Логика подтверждения сделки
}

function handleViewProduct(productId: string) {
  router.push(`/product/${productId}`)
}
</script>

<template>
    <div class="my-2">
      <div
        class="overflow-hidden border border-dark-700 rounded-xl bg-dark-600 shadow-lg"
      >
        <div class="flex flex-col gap-4 p-4 sm:flex-row">
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

        </div>
    </div>    
</template>