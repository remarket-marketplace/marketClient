<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import type { Product } from '@/validation/product/product'
import { onMounted, ref } from 'vue'
import Loader from '@/components/Loader.vue'
import FavoriteProductCard from '@/components/FavoriteProductCard.vue'

const products = ref<Product[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    isLoading.value = true
    products.value = await productService.getFavoritesProducts()
  } catch (e) {
    console.error('Failed to load favorite products', e)
  } finally {
    isLoading.value = false
  }
})

function onProductRemoved(productId: string) {
  products.value = products.value.filter(
    product => product.id !== productId
  )
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center">
    <!-- Loader -->
    <div v-if="isLoading" class="flex w-full h-full items-center justify-center">
      <Loader />
    </div>

    <!-- Products list -->
    <div
      v-else
      class="w-full space-y-4 max-w-5xl border border-dark-600 rounded-lg overflow-hidden pt-2"
    >
      <h1 class="text-2xl font-bold text-white">
        {{ $t('pages.favoriteProducts.title') }}
      </h1>

      <div
        v-if="products.length === 0"
        class="w-full text-center py-8 text-text-secondaryDark"
      >
        {{ $t('common.noData') }}
      </div>

      <div v-else>
        <div
          v-for="product in products"
          :key="product.id"
          class="w-full border-b border-dark-600 hover:bg-dark-800/50 transition"
        >
          <FavoriteProductCard
            :product="product"
            :is-owner="false"
            @removed="onProductRemoved"
          />
        </div>
      </div>
    </div>
  </div>
</template>
