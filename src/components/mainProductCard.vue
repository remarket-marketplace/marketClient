<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import UserRating from './UserRating.vue'
import ProductStatusTag from './ProductStatusTag.vue'
import { formatCurrencyAmount } from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()

const props = withDefaults(defineProps<{
  product: Product
  showStatusTag?: boolean
}>(), {
  showStatusTag: false,
})

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

const formattedPrice = computed(() => formatCurrencyAmount(props.product.price))
</script>

<template>
  <div
    class="flex flex-col cursor-pointer border border-dark-700 rounded-2xl hover:shadow-xl hover:border-dark-500 transition duration-200 bg-dark-900 h-full"
    @click="onClick">
    <!-- Image -->
    <div class="relative m-1 mb-2 aspect-square w-auto overflow-hidden rounded-xl bg-gray-700 flex-shrink-0 border-[0.5px] border-dark-600/70">
      <img v-if="product.images.length" :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="w-full h-full object-cover" alt="product image" />
      <div v-else class="w-full h-full flex items-center justify-center text-sm text-gray-300">
        {{ t('common.noImage') }}
      </div>
      <div v-if="showStatusTag" class="pointer-events-none absolute right-2 top-2 z-10">
        <ProductStatusTag :product-status="product.status" />
      </div>
    </div>

    <div class="px-3 pb-3 flex flex-1 flex-col">
      <!-- Title -->
      <h3 class="product-title text-sm md:text-base font-semibold text-mainText leading-[1.125rem] md:leading-5 mb-2 h-[2.25rem] md:h-[2.5rem] flex-shrink-0">
        {{ product.title }}
      </h3>

      <hr class="border-dark-700 opacity-80 mb-2 flex-shrink-0" />

      <!-- Bottom section with seller and button -->
      <div class="mt-auto flex w-full flex-col gap-2">
        <!-- Seller info-->
        <div class="flex w-full min-w-0 items-center gap-1 sm:gap-2">
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
          class="group relative w-full flex-shrink-0 cursor-pointer overflow-hidden whitespace-nowrap rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-3 sm:py-2 sm:text-sm"
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

<style scoped>
.product-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  text-overflow: ellipsis;
}
</style>
