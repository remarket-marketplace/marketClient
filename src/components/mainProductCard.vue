<script setup lang="ts">
import router from '@/router';
import type { Product } from '@/validation/product/product';
import { useI18n } from 'vue-i18n';
import { Star } from 'lucide-vue-next';

const { t } = useI18n();

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
  router.push(`/profile/${props.product.seller.username}`)
}
</script>

<template>
  <div
    class="flex flex-col cursor-pointer border border-dark-700 rounded-2xl p-3 hover:shadow-xl hover:border-dark-500 transition duration-200 bg-dark-900 h-full"
    @click="onClick">
    <!-- Изображение товара -->
    <img v-if="product.images.length" :src="`${API_HOST}${product.images[0]?.image_url}`"
      class="mb-3 h-48 w-full rounded-xl object-cover" alt="product image">
    <div v-else class="mb-3 h-48 w-full flex items-center justify-center rounded-xl bg-gray-700 text-sm text-gray-300">
      {{ t('common.noImage') }}
    </div>

    <!-- Заголовок и цена -->
    <h3 class="text-lg font-semibold text-mainText leading-tight line-clamp-2 mb-2">
      {{ product.title }}
    </h3>

    <div class="w-full flex justify-between items-center">
      <p class="text-xl font-bold text-mainText mb-3">
        {{ product.price }}₽
      </p>

      <!-- Количество товаров -->
      <div v-if="product.count > 1" class="mb-3">
        <span class="inline-block px-2 py-1 text-xs font-medium text-gray-200 bg-gray-800 rounded-full">
          {{ product.count }} {{ t('common.items') }}
        </span>
      </div>
    </div>

    <hr class="border-dark-600 opacity-40 mb-3" />

    <div class="mt-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <p class="text-sm text-blue-400 transition hover:text-blue-300 underline decoration-transparent hover:decoration-blue-300"
          @click.stop="goToSeller">
          {{ product.seller.username }}
        </p>

        <div v-if="product.seller.is_active" class="w-2 h-2 rounded-full bg-green-500" title="Online"></div>
      </div>

      <div class="flex items-center gap-1 text-sm select-none">
        <span class="flex items-center gap-0.5">
          <Star v-for="n in 5" :key="n" class="w-4 h-4"
            :class="n <= product.seller.rating ? 'text-blue-400 fill-blue-400' : 'text-gray-600'" stroke-width="1.5" />
        </span>

        <span class="text-gray-300 ml-1">
          {{ product.seller.rating.toFixed(1) }}
        </span>
      </div>
    </div>
  </div>
</template>
