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

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
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
      'rejected',
    )

    products.value = append ? [...products.value, ...response.products] : response.products
    total.value = response.total
    totalPages.value = response.totalPages
    currentPage.value = page
  } catch (error) {
    console.error('Failed to load archived products', error)
    if (!append) {
      products.value = []
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
        <h1 class="text-2xl font-bold text-white">
          {{ t('pages.archiveProducts.title') }}
        </h1>
      </div>
      <p class="text-sm text-gray-400 mb-6">
        {{ t('pages.archiveProducts.subtitle') }}
      </p>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('pages.archiveProducts.searchPlaceholder')"
            class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-600 border border-dark-700 text-sm text-white outline-none placeholder-gray-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <div class="px-3 py-1.5 rounded-lg bg-dark-700/50 border border-dark-600">
              <span class="font-medium text-white">{{ total }}</span>
              {{ t('common.products') }}
            </div>
          </div>

          <div class="flex items-center gap-2 text-gray-300">
            <Archive class="w-4 h-4" />
            <span class="text-sm">{{ t('pages.archiveProducts.archive') }}</span>
          </div>

          <div
            class="inline-flex h-9 items-center gap-0.5 rounded-lg border border-dark-600 bg-dark-700/40 p-0.5"
            role="group"
            :aria-label="t('pages.index.viewSwitcherLabel')"
          >
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
              :class="productCardViewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-dark-700/60 hover:text-white'"
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
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-dark-700/60 hover:text-white'"
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
        class="animate-pulse rounded-xl border border-dark-700 bg-dark-600/70"
        :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
      />
    </div>

    <div v-else-if="filteredProducts.length === 0" class="text-center py-16">
        <div class="max-w-md mx-auto space-y-4">
        <div class="w-20 h-20 mx-auto rounded-full bg-dark-700/60 border border-dark-600 flex items-center justify-center">
          <Archive class="w-10 h-10 text-gray-300" />
        </div>
        <h3 class="text-xl font-bold text-white">
          {{ searchQuery ? t('pages.archiveProducts.noResults') : t('pages.archiveProducts.emptyTitle') }}
        </h3>
        <p class="text-sm text-gray-400">
          {{ searchQuery ? t('pages.archiveProducts.tryDifferentQuery') : t('pages.archiveProducts.emptyDescription') }}
        </p>
      </div>
    </div>

    <div
      v-else-if="productCardViewMode === 'grid'"
      class="products-grid grid gap-1 md:gap-2 w-full"
    >
      <ProfileProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        :is-owner="true"
        @click="goToProduct"
      />
    </div>

    <div v-else class="w-full flex flex-col gap-2">
      <HomeProductListCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        @click="goToProduct"
      />
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
