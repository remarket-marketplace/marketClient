<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Archive, LayoutGrid, Rows3, Search } from 'lucide-vue-next'

import { productService } from '@/api/product/ProductService'
import Loader from '@/components/Loader.vue'
import ProfileProductCard from '@/components/ProfileProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { useUserStore } from '@/stores/user'
import type { Product } from '@/validation/product/product'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const products = ref<Product[]>([])
const total = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const searchQuery = ref('')

type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const perPage = 20

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value

  const query = searchQuery.value.toLowerCase().trim()
  return products.value.filter((product) =>
    product.title.toLowerCase().includes(query)
    || product.description.toLowerCase().includes(query)
    || product.category.name.toLowerCase().includes(query),
  )
})

const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid' ? 8 : 5
))
const PRODUCT_REVEAL_STAGGER_MS = 55
const API_HOST = import.meta.env.VITE_API_HOST
const readyArchivedProductCardIds = ref<Record<string, true>>({})
const archivedProductCardPreloads = new Map<string, Promise<void>>()

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function getProductRevealDelayStyle(index: number): Record<string, string> {
  return {
    transitionDelay: `${index * PRODUCT_REVEAL_STAGGER_MS}ms`,
  }
}

function isArchivedProductCardReady(productId: string): boolean {
  return Boolean(readyArchivedProductCardIds.value[productId])
}

function markArchivedProductCardReady(productId: string): void {
  if (readyArchivedProductCardIds.value[productId]) return
  readyArchivedProductCardIds.value = {
    ...readyArchivedProductCardIds.value,
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

function preloadArchivedProductCard(product: Product): Promise<void> {
  if (readyArchivedProductCardIds.value[product.id]) {
    return Promise.resolve()
  }

  const existingPreload = archivedProductCardPreloads.get(product.id)
  if (existingPreload) {
    return existingPreload
  }

  const coverImageUrl = resolveProductCoverImageUrl(product)
  if (!coverImageUrl || typeof Image === 'undefined') {
    markArchivedProductCardReady(product.id)
    return Promise.resolve()
  }

  const preloadPromise = new Promise<void>((resolve) => {
    const preloadImage = new Image()
    let isSettled = false

    const finishPreload = () => {
      if (isSettled) return
      isSettled = true
      markArchivedProductCardReady(product.id)
      archivedProductCardPreloads.delete(product.id)
      resolve()
    }

    preloadImage.onload = finishPreload
    preloadImage.onerror = finishPreload
    preloadImage.src = coverImageUrl

    if (preloadImage.complete) {
      finishPreload()
    }
  })

  archivedProductCardPreloads.set(product.id, preloadPromise)
  return preloadPromise
}

function syncArchivedProductCardReadiness(nextProducts: Product[]): void {
  const nextReadyState: Record<string, true> = {}

  nextProducts.forEach((product) => {
    if (readyArchivedProductCardIds.value[product.id]) {
      nextReadyState[product.id] = true
      return
    }

    void preloadArchivedProductCard(product)
  })

  readyArchivedProductCardIds.value = nextReadyState
}

function setVisibleArchivedProducts(nextProducts: Product[], append = false): void {
  products.value = append ? [...products.value, ...nextProducts] : nextProducts
  syncArchivedProductCardReadiness(products.value)
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
}

async function loadArchivedProducts(page = 1, append = false) {
  if (isLoadingMore.value) return
  if (!userStore.user?.username) {
    products.value = []
    total.value = 0
    totalPages.value = 1
    currentPage.value = 1
    isLoading.value = false
    return
  }
  if (page > totalPages.value && totalPages.value > 0) return

  isLoading.value = !append
  isLoadingMore.value = append

  try {
    const response = await productService.getUserProductsByUsername(
      userStore.user.username,
      page,
      perPage,
      'archive',
    )

    setVisibleArchivedProducts(response.products, append)
    total.value = response.total
    totalPages.value = response.totalPages
    currentPage.value = page
  } catch (error) {
    console.error('Failed to load archived products', error)
    if (!append) {
      setVisibleArchivedProducts([])
      total.value = 0
      totalPages.value = 1
      currentPage.value = 1
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMoreProducts() {
  if (currentPage.value >= totalPages.value) return
  await loadArchivedProducts(currentPage.value + 1, true)
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push(`/product/${productKey}`)
}

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
})

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
  await loadArchivedProducts()
})
</script>

<template>
  <div class="w-full h-full overflow-y-auto px-4 pt-4 pb-16">
    <div class="mb-6">
      <div class="flex gap-2 items-center mb-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-[var(--text-title)]">
          {{ t('pages.archiveProducts.title') }}
        </h1>
      </div>
      <p class="text-sm text-[var(--text-muted)] mb-6">
        {{ t('pages.archiveProducts.subtitle') }}
      </p>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-meta)]" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('pages.archiveProducts.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--palette-dark-600))] border border-[rgb(var(--palette-dark-700))] text-sm text-[var(--text-title)] outline-none placeholder-[var(--text-placeholder)] focus:border-[rgb(var(--palette-blue-500))] transition-colors"
          />
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <div class="px-3 py-1.5 rounded-lg bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))]">
              <span class="font-medium text-[var(--text-title)]">{{ total }}</span>
              {{ t('common.products') }}
            </div>
          </div>

          <div class="flex items-center gap-2 text-[var(--text-body)]">
            <Archive class="w-4 h-4" />
            <span class="text-sm">{{ t('pages.archiveProducts.archive') }}</span>
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
      />
    </div>

    <div v-else-if="filteredProducts.length === 0" class="text-center py-16">
        <div class="max-w-md mx-auto space-y-4">
        <div class="w-20 h-20 mx-auto rounded-full bg-[rgb(var(--palette-dark-700)/0.6)] border border-[rgb(var(--palette-dark-600))] flex items-center justify-center">
          <Archive class="w-10 h-10 text-[var(--text-body)]" />
        </div>
        <h3 class="text-xl font-bold text-[var(--text-title)]">
          {{ searchQuery ? t('pages.archiveProducts.noResults') : t('pages.archiveProducts.emptyTitle') }}
        </h3>
        <p class="text-sm text-[var(--text-muted)]">
          {{ searchQuery ? t('pages.archiveProducts.tryDifferentQuery') : t('pages.archiveProducts.emptyDescription') }}
        </p>
      </div>
    </div>

    <div
      v-else-if="productCardViewMode === 'grid'"
      class="products-grid grid gap-1 md:gap-2 w-full"
    >
      <div
        v-for="(product, index) in filteredProducts"
        :key="product.id"
      >
        <Transition name="archived-product-reveal" mode="out-in">
          <ProfileProductCard
            v-if="isArchivedProductCardReady(product.id)"
            :product="product"
            :is-owner="true"
            :style="getProductRevealDelayStyle(index)"
            @click="goToProduct"
          />
          <div
            v-else
            :style="getProductRevealDelayStyle(index)"
            class="h-64 animate-pulse rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.7)]"
          ></div>
        </Transition>
      </div>
    </div>

    <div v-else class="w-full flex flex-col gap-2">
      <div
        v-for="(product, index) in filteredProducts"
        :key="product.id"
      >
        <Transition name="archived-product-reveal" mode="out-in">
          <HomeProductListCard
            v-if="isArchivedProductCardReady(product.id)"
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

    <div v-if="currentPage < totalPages" class="flex justify-center mt-6">
      <button
        @click="loadMoreProducts"
        :disabled="isLoadingMore"
        class="market-btn market-btn-primary rounded-lg px-6 py-3 font-medium"
      >
        <span v-if="isLoadingMore" class="flex items-center gap-2">
          <Loader />
          {{ t('common.loading') }}
        </span>
        <span v-else>
          {{ t('common.loadMore') }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
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

.archived-product-reveal-enter-active {
  transition: opacity 0.38s ease, transform 0.38s ease, filter 0.38s ease;
}

.archived-product-reveal-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  filter: blur(10px);
}

.archived-product-reveal-enter-to {
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
