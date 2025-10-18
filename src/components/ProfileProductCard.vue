<script setup lang="ts">
import router from '@/router';
import type { Product } from '@/validation/product/product';
import { computed } from 'vue';

const props = defineProps<{
  product: Product
  isOwner: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST

const statusClass = computed(() => {
  switch (props.product.status) {
    case 'ACTIVE':
      return 'text-green-400 bg-green-900/30 border-green-700/50';
    case 'SOLD':
      return 'text-red-400 bg-red-900/30 border-red-700/50';
    case 'PENDING':
      return 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50';
    default:
      return 'text-gray-400 bg-gray-700/30 border-gray-500/50';
  }
})

function onClick() {
  router.push(`/product/${props.product.id}`);
}

function goToSeller() {
  if (!props.isOwner) {
    router.push(`/profile/${props.product.seller.username}`)
  }
}
</script>

<template>
  <div
    class="flex space-x-4 p-4 cursor-pointer"
    @click="onClick"
  >
    <div class="flex-shrink-0">
      <img
        v-if="product.images.length"
        :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-lg border border-dark-600"
        alt="product image"
      >
      <div
        v-else
        class="h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center rounded-lg bg-dark-800 border border-dark-600 text-xs text-gray-500"
      >
        {{ $t('index.noImage') }}
      </div>
    </div>

    <div class="flex flex-col justify-between flex-grow min-w-0">
      <div class="flex justify-between items-start">
        <h3 class="truncate text-lg text-white font-bold pr-2">
          {{ product.title }}
        </h3>
        
        <span
          v-if="isOwner"
          :class="['text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap border', statusClass]"
        >
          {{ product.status }}
        </span>
      </div>

      <p class="text-sm text-gray-400 line-clamp-2 mt-1 mb-2">
        {{ product.description }}
      </p>

      <div class="flex items-end justify-between mt-auto">
        <div v-if="!isOwner" class="text-sm">
          <p
            class="text-blue-400 transition hover:text-blue-300"
            @click.stop="goToSeller"
          >
            {{ product.seller.username }}
          </p>
        </div>
        
        <span class="text-xl text-white font-semibold">
          {{ product.price }}₽
        </span>
      </div>
    </div>
  </div>
</template>