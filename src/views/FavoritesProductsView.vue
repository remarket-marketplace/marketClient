<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import type { Product } from '@/validation/product/product'
import { onMounted, ref, computed, watch } from 'vue'
import FavoriteProductCard from '@/components/FavoriteProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { Heart, Search, AlertCircle, LayoutGrid, Rows3 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const products = ref<Product[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')

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

const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid' ? 8 : 5
))
const PRODUCT_REVEAL_STAGGER_MS = 55
const PRODUCT_CARD_PRELOAD_TIMEOUT_MS = 1800
const API_HOST = import.meta.env.VITE_API_HOST
const readyFavoriteProductCardIds = ref<Record<string, true>>({})
const favoriteProductCardPreloads = new Map<string, Promise<void>>()

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function getProductRevealDelayStyle(index: number): Record<string, string> {
  return {
    transitionDelay: `${index * PRODUCT_REVEAL_STAGGER_MS}ms`,
  }
}

function isFavoriteProductCardReady(productId: string): boolean {
  return Boolean(readyFavoriteProductCardIds.value[productId])
}

function markFavoriteProductCardReady(productId: string): void {
  if (readyFavoriteProductCardIds.value[productId]) return
  readyFavoriteProductCardIds.value = {
    ...readyFavoriteProductCardIds.value,
    [productId]: true,
  }
}

function resolveProductCoverImageUrl(product: Product): string {
  const coverImageUrl = product.images[0]?.image_url?.trim() ?? ''
  if (!coverImageUrl) return ''
  if (coverImageUrl.startsWith('http://') || coverImageUrl.startsWith('https://')) {
    return coverImageUrl
  }
  return `${API_HOST}${coverImageUrl}`
}

function preloadFavoriteProductCard(product: Product): Promise<void> {
  if (readyFavoriteProductCardIds.value[product.id]) {
    return Promise.resolve()
  }

  const existingPreload = favoriteProductCardPreloads.get(product.id)
  if (existingPreload) {
    return existingPreload
  }

  const coverImageUrl = resolveProductCoverImageUrl(product)
  if (!coverImageUrl || typeof Image === 'undefined') {
    markFavoriteProductCardReady(product.id)
    return Promise.resolve()
  }

  const preloadPromise = new Promise<void>((resolve) => {
    const preloadImage = new Image()
    let isSettled = false

    const finishPreload = () => {
      if (isSettled) return
      isSettled = true
      window.clearTimeout(fallbackTimer)
      preloadImage.onload = null
      preloadImage.onerror = null
      markFavoriteProductCardReady(product.id)
      favoriteProductCardPreloads.delete(product.id)
      resolve()
    }

    const fallbackTimer = window.setTimeout(() => {
      finishPreload()
    }, PRODUCT_CARD_PRELOAD_TIMEOUT_MS)

    preloadImage.onload = finishPreload
    preloadImage.onerror = finishPreload
    preloadImage.src = coverImageUrl

    if (preloadImage.complete) {
      finishPreload()
    }
  })

  favoriteProductCardPreloads.set(product.id, preloadPromise)
  return preloadPromise
}

function syncFavoriteProductCardReadiness(nextProducts: Product[]): void {
  const nextReadyState: Record<string, true> = {}

  nextProducts.forEach((product) => {
    if (readyFavoriteProductCardIds.value[product.id]) {
      nextReadyState[product.id] = true
      return
    }

    void preloadFavoriteProductCard(product)
  })

  readyFavoriteProductCardIds.value = nextReadyState
}

function setVisibleFavoriteProducts(nextProducts: Product[]): void {
  products.value = nextProducts
  syncFavoriteProductCardReadiness(products.value)
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
}

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
  try {
    isLoading.value = true
    const result = await productService.getFavoritesProducts()
    setVisibleFavoriteProducts(result.favoriteProducts)
  } catch (e) {
    console.error('Failed to load favorite products', e)
  } finally {
    isLoading.value = false
  }
})

function onProductRemoved(productId: string) {
  setVisibleFavoriteProducts(products.value.filter(
    product => product.id !== productId
  ))
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push(`/product/${productKey}`)
}

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
})

</script>

<template>
  <div class="w-full h-full overflow-y-auto  px-4 pt-4 pb-16">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex gap-2 items-center mb-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-[var(--text-title)]">
          {{ $t('pages.favoriteProducts.title') }}
        </h1>
      </div>
      <p class="text-sm text-[var(--text-muted)] mb-6">
        {{ $t('pages.favoriteProducts.subtitle') }}
      </p>
      
      <!-- Search and stats -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-meta)]" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('pages.favoriteProducts.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--palette-dark-600))] border border-[rgb(var(--palette-dark-700))] text-sm text-[var(--text-title)] outline-none placeholder-[var(--text-placeholder)] focus:border-[rgb(var(--palette-blue-500))] transition-colors"
          />
        </div>
        
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <div class="px-3 py-1.5 rounded-lg bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))]">
              <span class="font-medium text-[var(--text-title)]">{{ filteredProducts.length }}</span>
              {{ $t('common.products') }}
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-[var(--text-accent)]">
            <Heart class="w-4 h-4" />
            <span class="text-sm">{{ $t('pages.favoriteProducts.favorites') }}</span>
          </div>

          <div
            class="inline-flex h-9 items-center gap-0.5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] p-0.5"
            role="group"
            :aria-label="t('pages.index.viewSwitcherLabel')"
          >
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
              :class="productCardViewMode === 'grid'
                ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'"
              :title="t('pages.index.viewGrid')"
              @click="setProductCardViewMode('grid')"
            >
              <LayoutGrid class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">{{ t('pages.index.viewGrid') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
              :class="productCardViewMode === 'list'
                ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'"
              :title="t('pages.index.viewList')"
              @click="setProductCardViewMode('list')"
            >
              <Rows3 class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">{{ t('pages.index.viewList') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="w-full"
      :class="productCardViewMode === 'grid'
        ? 'products-grid grid gap-1 md:gap-2'
        : 'flex flex-col gap-2 md:gap-3'"
    >
      <div
        v-for="n in loadingSkeletonCount"
        :key="n"
        class="animate-pulse rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.7)]"
        :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
      ></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredProducts.length === 0" class="text-center py-16">
      <div class="max-w-md mx-auto space-y-4">
        <div class="relative">
          <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-[rgb(var(--palette-pink-900)/0.3)] to-[rgb(var(--palette-red-900)/0.3)] flex items-center justify-center">
            <Heart class="w-10 h-10 text-[var(--text-accent)]" />
          </div>
        </div>
        <h3 class="text-xl font-bold text-[var(--text-title)]">
          {{ searchQuery ? $t('pages.favoriteProducts.noResults') : $t('pages.favoriteProducts.emptyTitle') }}
        </h3>
        <p class="text-sm text-[var(--text-muted)]">
          {{ searchQuery ? $t('pages.favoriteProducts.tryDifferentQuery') : $t('pages.favoriteProducts.emptyDescription') }}
        </p>
        <router-link 
          to="/"
          class="market-primary-surface market-primary-hover mt-4 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-[var(--text-title)] transition-colors"
        >
          {{ $t('pages.favoriteProducts.browseProducts') }}
        </router-link>
      </div>
    </div>

    <!-- Products grid -->
    <div
      v-else-if="productCardViewMode === 'grid'"
      class="products-grid grid gap-1 md:gap-2 w-full"
    >
      <div
        v-for="(product, index) in filteredProducts"
        :key="product.id"
        class="bg-[rgb(var(--palette-dark-600))] border border-[rgb(var(--palette-dark-700))] rounded-xl overflow-hidden hover:border-[rgb(var(--palette-dark-500))] transition-all duration-200"
      >
        <Transition name="favorite-product-reveal" mode="out-in">
          <FavoriteProductCard
            v-if="isFavoriteProductCardReady(product.id)"
            :product="product"
            :is-owner="product.is_owner || false"
            :style="getProductRevealDelayStyle(index)"
            @removed="onProductRemoved"
          />
          <div
            v-else
            :style="getProductRevealDelayStyle(index)"
            class="h-64 animate-pulse rounded-xl bg-[rgb(var(--palette-dark-600)/0.7)]"
          ></div>
        </Transition>
      </div>
    </div>
    <div v-else class="w-full flex flex-col gap-2">
      <div
        v-for="(product, index) in filteredProducts"
        :key="product.id"
      >
        <Transition name="favorite-product-reveal" mode="out-in">
          <HomeProductListCard
            v-if="isFavoriteProductCardReady(product.id)"
            :product="product"
            :style="getProductRevealDelayStyle(index)"
            @click="goToProduct"
          />
          <div
            v-else
            :style="getProductRevealDelayStyle(index)"
            class="h-[118px] animate-pulse rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.7)] sm:h-[134px]"
          ></div>
        </Transition>
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
  background-color: var(--overlay-white-20);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--overlay-white-30);
}

.products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.favorite-product-reveal-enter-active {
  transition: opacity 0.38s ease, transform 0.38s ease, filter 0.38s ease;
}

.favorite-product-reveal-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  filter: blur(10px);
}

.favorite-product-reveal-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

@media (min-width: 680px) {
  .products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1360px) {
  .products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
