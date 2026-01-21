<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import type { Product } from '@/validation/product/product'
import { onMounted, ref, computed } from 'vue'
import Loader from '@/components/Loader.vue'
import FavoriteProductCard from '@/components/FavoriteProductCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { Heart, Search, AlertCircle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const products = ref<Product[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value
  
  const query = searchQuery.value.toLowerCase().trim()
  return products.value.filter(product => 
    product.title.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query) ||
    product.seller.username.toLowerCase().includes(query) ||
    product.category.name.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  try {
    isLoading.value = true
    const result = await productService.getFavoritesProducts()
    products.value = result.favoriteProducts
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

// Форматирование цены
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price) + '₽'
}
</script>

<template>
  <div class="w-full h-full overflow-y-auto no-scrollbar px-4 pt-4 pb-16">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex gap-2 items-center mb-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.favoriteProducts.title') }}
        </h1>
      </div>
      <p class="text-sm text-gray-400 mb-6">
        {{ $t('pages.favoriteProducts.subtitle') }}
      </p>
      
      <!-- Search and stats -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('pages.favoriteProducts.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-600 border border-dark-700 text-sm text-white outline-none placeholder-gray-500 focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <div class="px-3 py-1.5 rounded-lg bg-dark-700/50 border border-dark-600">
              <span class="font-medium text-white">{{ filteredProducts.length }}</span>
              {{ $t('common.products') }}
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-pink-400">
            <Heart class="w-4 h-4" />
            <span class="text-sm">{{ $t('pages.favoriteProducts.favorites') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="text-center space-y-3">
        <Loader />
        <p class="text-sm text-gray-400">{{ $t('common.loading') }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredProducts.length === 0" class="text-center py-16">
      <div class="max-w-md mx-auto space-y-4">
        <div class="relative">
          <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-pink-900/30 to-red-900/30 flex items-center justify-center">
            <Heart class="w-10 h-10 text-pink-500" />
          </div>
        </div>
        <h3 class="text-xl font-bold text-white">
          {{ searchQuery ? $t('pages.favoriteProducts.noResults') : $t('pages.favoriteProducts.emptyTitle') }}
        </h3>
        <p class="text-sm text-gray-400">
          {{ searchQuery ? $t('pages.favoriteProducts.tryDifferentQuery') : $t('pages.favoriteProducts.emptyDescription') }}
        </p>
        <router-link 
          to="/"
          class="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {{ $t('pages.favoriteProducts.browseProducts') }}
        </router-link>
      </div>
    </div>

    <!-- Products grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="bg-dark-600 border border-dark-700 rounded-xl overflow-hidden hover:border-dark-500 transition-all duration-200"
      >
        <FavoriteProductCard 
          :product="product" 
          :is-owner="product.is_owner || false" 
          @removed="onProductRemoved" 
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>