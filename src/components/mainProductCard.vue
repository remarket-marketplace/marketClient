<script setup lang="ts">
import router from '@/router';
import type { Product } from '@/validation/product/product';
import { useI18n } from 'vue-i18n';

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
    class="flex flex-col cursor-pointer border-1 border-dark-600 rounded-xl p-4 transition hover:shadow-lg"
    @click="onClick"
  >
    <img
      v-if="product.images.length"
      :src="`${API_HOST}${product.images[0]?.image_url}`"
      class="mb-3 h-36 w-full rounded object-cover"
      alt="product image"
    >
    <div
      v-else
      class="mb-3 h-36 w-full flex items-center justify-center rounded bg-gray-700 text-sm text-gray-300"
    >
      {{ $t('common.noImage') }}
    </div>

    <h3 class="truncate text-lg text-mainText font-bold">
      {{ product.title }}
    </h3>

    <p class="truncate text-sm text-gray-400">
      {{ product.description }}
    </p>

    <div class="py-1">
      <p
        class="w-[max-content] text-blue-200 transition hover:text-blue-300"
        @click.stop="goToSeller"
      >
        {{ product.seller.username }}
      </p>
    </div>

    <div class="mt-3 flex items-center justify-between">
      <span class="text-lg text-mainText sm:text-xl">{{ product.price }}₽</span>
    </div>
  </div>
</template>