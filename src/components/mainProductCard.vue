<script setup lang="ts">
import router from '@/router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import UserRating from './UserRating.vue'

const { t } = useI18n()

const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  click: [id: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST

function onClick() {
  emit('click', props.product.id)
}

function goToSeller() {
  router.push(`/user/${props.product.seller.username}`)
}
</script>

<template>
  <div
    class="flex flex-col cursor-pointer border border-dark-700 rounded-2xl p-3 hover:shadow-xl hover:border-dark-500 transition duration-200 bg-dark-900 h-full"
    @click="onClick">
    <!-- Image -->
    <div class="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-gray-700 flex-shrink-0">
      <img v-if="product.images.length" :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="w-full h-full object-cover" alt="product image" />
      <div v-else class="w-full h-full flex items-center justify-center text-sm text-gray-300">
        {{ t('common.noImage') }}
      </div>
    </div>

    <!-- Title -->
    <h3 class="text-sm sm:text-base font-semibold text-mainText leading-tight line-clamp-2 mb-2 flex-shrink-0">
      {{ product.title }}
    </h3>

    <hr class="border-dark-700 opacity-80 mb-2 flex-shrink-0" />

    <!-- Bottom section with seller and button -->
    <div class="mt-auto flex items-center justify-between gap-2">
      <!-- Seller info-->
      <div class="flex items-center gap-1 flex-wrap min-w-0">
        <p class="text-xs sm:text-sm text-blue-400 transition hover:text-blue-300 underline decoration-transparent hover:decoration-blue-300 truncate"
          @click.stop="goToSeller">
          {{ product.seller.username }}
        </p>

        <span v-if="product.seller.is_active" class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Online" />

        <!-- Rating -->
        <UserRating :rating="product.seller.rating" />
      </div>

      <!-- Buy button -->
      <button
        class="group flex-1 md:flex-none relative overflow-hidden rounded-lg bg-blue-600 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition cursor-pointer flex-shrink-0 whitespace-nowrap hover:bg-blue-700"
        @click="onClick">
        <span class="block transition-all duration-200 group-hover:-translate-y-full group-hover:opacity-0">
          {{ product.price }}₽
        </span>
        <span
          class="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
          {{ t('common.buy') }}
        </span>
      </button>
    </div>
  </div>
</template>
