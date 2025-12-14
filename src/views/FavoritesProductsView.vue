<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import type { Product } from '@/validation/product/product'
import { onMounted, ref } from 'vue'
import Loader from '@/components/Loader.vue'
import FavoriteProductCard from '@/components/FavoriteProductCard.vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
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
      <div class="flex items-center gap-3 px-4 pt-2">
        <button
          @click="router.back()"
          class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white"
          :title="$t('common.back')"
        >
          <ArrowLeft :size="20" stroke-width="2" />
        </button>
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.favoriteProducts.title') }}
        </h1>
      </div>

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
