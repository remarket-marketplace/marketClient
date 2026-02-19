<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import UserRating from './UserRating.vue'

const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  click: [id: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST
const priceFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

function onClick() {
  emit('click', props.product.id)
}

function goToSeller() {
  router.push(`/user/${props.product.seller.username}`)
}

const formattedPrice = computed(() => `${priceFormatter.format(props.product.price)}₽`)
</script>

<template>
  <div
    class="flex flex-col cursor-pointer border border-dark-700 rounded-2xl hover:shadow-xl hover:border-dark-500 transition duration-200 bg-dark-900 h-full"
    @click="onClick">
    <!-- Image -->
    <div class="m-1 mb-2 aspect-square w-auto overflow-hidden rounded-xl bg-gray-700 flex-shrink-0 border-[0.5px] border-dark-600/70">
      <img v-if="product.images.length" :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="w-full h-full object-cover" alt="product image" />
      <div v-else class="w-full h-full flex items-center justify-center text-sm text-gray-300">
        {{ t('common.noImage') }}
      </div>
    </div>

    <div class="px-3 pb-3 flex flex-1 flex-col">
      <!-- Title -->
      <h3 class="text-sm sm:text-base font-semibold text-mainText leading-tight line-clamp-2 mb-2 min-h-[2.5rem] sm:min-h-[3rem] flex-shrink-0">
        {{ product.title }}
      </h3>

      <hr class="border-dark-700 opacity-80 mb-2 flex-shrink-0" />

      <!-- Bottom section with seller and button -->
      <div class="mt-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-2">
        <!-- Seller info-->
        <div class="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <p class="min-w-0 shrink text-xs sm:text-sm text-blue-400 transition hover:text-blue-300 underline decoration-transparent hover:decoration-blue-300 truncate"
            @click.stop="goToSeller">
            {{ product.seller.username }}
          </p>

          <span v-if="product.seller.is_active" class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Online" />

          <!-- Rating -->
          <div class="flex-shrink-0">
            <UserRating :rating="product.seller.rating" />
          </div>
        </div>

        <!-- Buy button -->
        <button
          class="group w-full md:w-auto md:min-w-[108px] relative overflow-hidden rounded-lg bg-blue-600 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition cursor-pointer flex-shrink-0 whitespace-nowrap hover:bg-blue-700"
          @click="onClick">
          <span class="block text-center tabular-nums transition-all duration-200 group-hover:-translate-y-full group-hover:opacity-0">
            {{ formattedPrice }}
          </span>
          <span
            class="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
            {{ t('common.buy') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
