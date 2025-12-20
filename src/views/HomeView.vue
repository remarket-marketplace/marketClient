<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import Loader from '@/components/Loader.vue'
import MainProductCard from '@/components/mainProductCard.vue'
import SearchField from '@/components/SearchField.vue'
import router from '@/router'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const API_HOST = import.meta.env.VITE_API_HOST

const mainCategories = ref<Category[]>([])
const subCategories = ref<Category[]>([])
const selectedMainCategoryId = ref<string>('')
const selectedSubCategoryId = ref<string>('')

const fullProducts = ref<Product[]>([])
const products = ref<Product[]>([])
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = ref(30)
const searchQuery = ref('')

const isServerPagination = ref(true)
const isLoadingMore = ref(false)
const isMobile = ref(false)
const isCategoriesLoading = ref(true)
const isProductsLoading = ref(false)
const isSubCategoriesLoading = ref(false)

function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    if (searchQuery.value.trim()) {
      searchProducts()
    } else {
      loadFilteredProducts()
    }
  }, 300)
}

async function searchProducts() {
  isProductsLoading.value = true
  try {
    let searchResults = await productService.searchProducts(searchQuery.value.trim())

    if (selectedMainCategoryId.value && !selectedSubCategoryId.value) {
      const subIds = subCategories.value.map(c => c.id)
      searchResults = searchResults.filter((p: { category: { id: string } }) =>
        p.category.id === selectedMainCategoryId.value || subIds.includes(p.category.id),
      )
    } else if (selectedSubCategoryId.value) {
      searchResults = searchResults.filter((p: { category: { id: string } }) =>
        p.category.id === selectedSubCategoryId.value,
      )
    }

    fullProducts.value = searchResults
    totalPages.value = Math.ceil(searchResults.length / perPage.value)
    isServerPagination.value = false
    updateDisplayedProducts()
  } finally {
    isProductsLoading.value = false
  }
}

function updateDisplayedProducts() {
  if (isServerPagination.value) return
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  products.value = fullProducts.value.slice(start, end)
}

async function loadProducts(page = 1, append = false) {
  currentPage.value = page
  const result = await productService.getAllProducts(page, perPage.value)
  if (append)
    products.value = [...products.value, ...result.products]
  else
    products.value = result.products

  totalPages.value = Number(result.totalPages) || 1
  isServerPagination.value = true
}

async function loadMoreProducts() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true
  const nextPage = currentPage.value + 1
  if (nextPage > totalPages.value) {
    isLoadingMore.value = false
    return
  }
  await loadProducts(nextPage, true)
  currentPage.value = nextPage
  isLoadingMore.value = false
}

async function loadMainCategories() {
  const all = await categoryService.getAllCategories()
  mainCategories.value = all.filter((c: { parent_id: any }) => !c.parent_id)
  isCategoriesLoading.value = false
}

async function onMainCategoryClick(id: string) {
  // Если кликаем на уже выбранную категорию - сбрасываем все фильтры
  if (selectedMainCategoryId.value === id) {
    await resetAllFilters()
    return
  }
  
  selectedMainCategoryId.value = id
  selectedSubCategoryId.value = ''
  isSubCategoriesLoading.value = true
  isProductsLoading.value = true
  try {
    subCategories.value = await categoryService.getSubcategories(id)
    isSubCategoriesLoading.value = false
    await loadFilteredProducts()
  } finally {
    isProductsLoading.value = false
  }
}

async function onSubCategoryClick(id: string) {
  // Если кликаем на уже выбранную подкатегорию - сбрасываем только подкатегорию
  if (selectedSubCategoryId.value === id) {
    selectedSubCategoryId.value = ''
    isProductsLoading.value = true
    try {
      await loadFilteredProducts()
    } finally {
      isProductsLoading.value = false
    }
    return
  }
  
  selectedSubCategoryId.value = id
  isProductsLoading.value = true
  try {
    await loadFilteredProducts()
  } finally {
    isProductsLoading.value = false
  }
}

async function loadFilteredProducts() {
  currentPage.value = 1

  if (selectedSubCategoryId.value) {
    const res = await productService.getProductsByCategory(selectedSubCategoryId.value)
    fullProducts.value = res
  } else if (selectedMainCategoryId.value) {
    let prods = await productService.getProductsByCategory(selectedMainCategoryId.value)
    if (subCategories.value.length > 0) {
      const subReqs = subCategories.value.map(cat => productService.getProductsByCategory(cat.id))
      const subRes = await Promise.all(subReqs)
      prods = [...prods, ...subRes.flat()]
    }
    fullProducts.value = prods
  } else {
    await loadProducts()
    return
  }

  isServerPagination.value = false
  totalPages.value = Math.ceil(fullProducts.value.length / perPage.value)
  updateDisplayedProducts()
}

// Функция для сброса всех фильтров
async function resetAllFilters() {
  selectedMainCategoryId.value = ''
  selectedSubCategoryId.value = ''
  subCategories.value = []
  isProductsLoading.value = true
  try {
    await loadProducts(1, false)
    isServerPagination.value = true
  } finally {
    isProductsLoading.value = false
  }
}

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(async () => {
  await loadProducts()
  await loadMainCategories()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <section class="w-full flex flex-col">
    <SearchField v-model="searchQuery" :placeholder="$t('pages.index.searchPlaceholder')"
      @search-change="debouncedSearch" class="w-full" />

    <div class="mt-6">
      <div class="text-lg font-semibold mb-2">{{ t('common.categories') }}</div>

      <div v-if="isCategoriesLoading" class="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <div v-for="n in 5" :key="n"
          class="cursor-pointer min-w-[90px] flex-shrink-0 flex flex-col items-center rounded-lg p-2">
          <div class="h-16 w-16 animate-pulse rounded-lg bg-dark-600"></div>
          <div class="w-16 h-4 animate-pulse mt-2 rounded bg-dark-600"></div>
        </div>
      </div>

      <div v-else-if="mainCategories.length > 0" class="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <div 
          v-for="cat in mainCategories" 
          :key="cat.id" 
          @click="onMainCategoryClick(cat.id)"
          class="cursor-pointer min-w-[90px] flex-shrink-0 flex flex-col items-center rounded-lg p-2 gap-1 transition-all duration-200"
          :class="selectedMainCategoryId === cat.id
            ? 'bg-white/15 border border-white/30 text-white shadow-md'
            : 'hover:bg-dark-700/30'"
        >
          <img v-if="cat.image_url" :src="`${API_HOST}${cat.image_url}`" alt="category"
            class="h-16 w-16 object-contain rounded-lg" />
          <span class="text-center text-sm font-medium">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <!-- Subcategories with skeleton -->
    <div v-if="selectedMainCategoryId && (isSubCategoriesLoading || subCategories.length > 0)" class="mt-6">
      <div class="text-lg font-semibold mb-3">
        {{ $t('common.subcategories') }}
      </div>

      <div class="flex flex-wrap gap-3">
        <!-- Skeleton for subcategories -->
        <div v-if="isSubCategoriesLoading" v-for="n in 5" :key="n"
          class="h-10 bg-dark-600 animate-pulse rounded-full px-4 py-2" style="width: 80px"></div>
        
        <!-- Real subcategories -->
        <button 
          v-else 
          v-for="sub in subCategories" 
          :key="sub.id" 
          @click="onSubCategoryClick(sub.id)" 
          class="relative rounded-full px-4 py-2 text-sm font-medium transition-all
                 backdrop-blur-md border
                 hover:-translate-y-[1px] hover:shadow-lg
                 active:translate-y-0" 
          :class="selectedSubCategoryId === sub.id
            ? 'bg-white/15 border-white/30 text-white shadow-md'
            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'"
        >
          {{ sub.name }}
        </button>
      </div>
    </div>

    <div class="mt-6 mb-2 text-xl font-semibold text-mainText">
      {{ $t('common.products') }}
    </div>

    <!-- Skeleton for products -->
    <div v-if="isProductsLoading" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <div v-for="n in perPage" :key="n"
        class="flex flex-col cursor-pointer border border-dark-700 rounded-2xl p-3 hover:shadow-xl hover:border-dark-500 transition duration-200 bg-dark-900 h-full">
        <!-- Image skeleton -->
        <div class="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-dark-600 animate-pulse flex-shrink-0"></div>
        
        <!-- Title skeleton -->
        <div class="h-4 bg-dark-600 rounded animate-pulse mb-2 flex-shrink-0"></div>
        <div class="h-4 bg-dark-600 rounded animate-pulse w-3/4 mb-2 flex-shrink-0"></div>
        
        <hr class="border-dark-700 opacity-80 mb-2 flex-shrink-0" />
        
        <!-- Bottom section skeleton -->
        <div class="mt-auto flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap min-w-0">
            <div class="h-4 bg-dark-600 rounded animate-pulse w-16"></div>
            <div class="w-2 h-2 rounded-full bg-dark-600 flex-shrink-0"></div>
            <div class="h-4 bg-dark-600 rounded animate-pulse w-8"></div>
          </div>
          
          <div class="rounded-lg bg-dark-600 px-3 py-2 h-8 w-12 animate-pulse flex-shrink-0 whitespace-nowrap"></div>
        </div>
      </div>
    </div>

    <!-- Products grid -->
    <div v-else-if="products.length === 0" class="text-center text-gray-400 mt-8 py-12">
      {{ $t('pages.index.noProducts') }}
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <MainProductCard v-for="product in products" :key="product.id" :product="product" @click="goToProduct" />
    </div>

    <div v-if="!isProductsLoading && isServerPagination && currentPage < totalPages" class="mt-8 flex justify-center">
      <button
        class="w-full max-w-lg bg-blue-500 text-white px-6 py-3 rounded-lg shadow font-semibold hover:bg-blue-600 active:bg-blue-700 transition"
        :disabled="isLoadingMore" @click="loadMoreProducts">
        <span v-if="!isLoadingMore">{{ t('common.loadMore') }}</span>
        <span v-else>{{ t('common.loading') }}</span>
      </button>
    </div>
  </section>
</template>