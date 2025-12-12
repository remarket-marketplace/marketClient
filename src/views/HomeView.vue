<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
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
  selectedMainCategoryId.value = id
  selectedSubCategoryId.value = ''
  subCategories.value = await categoryService.getSubcategories(id)
  await loadFilteredProducts()
}

async function onSubCategoryClick(id: string) {
  selectedSubCategoryId.value = id
  await loadFilteredProducts()
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
  <section class="h-full w-full flex flex-col overflow-hidden overflow-y-auto">

    <SearchField v-model="searchQuery" :placeholder="$t('pages.index.searchPlaceholder')"
      @search-change="debouncedSearch" class="w-full" />

    <div class="mt-6">
      <div class="text-lg font-semibold mb-2">{{ t('common.category') }}</div>

      <div v-if="isCategoriesLoading" class="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <div v-for="n in 5" :key="n" class="cursor-pointer min-w-[90px] flex-shrink-0 flex flex-col items-center rounded-lg p-2">
          <div class="h-20 w-20 animate-pulse rounded-lg"></div>
          <div class="w-16 h-4 animate-pulse mt-2 rounded"></div>
        </div>
      </div>

      <div v-else-if="mainCategories.length > 0" class="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <div v-for="cat in mainCategories" :key="cat.id" @click="onMainCategoryClick(cat.id)"
          class="cursor-pointer min-w-[90px] flex-shrink-0 flex flex-col items-center rounded-lg p-2">
          <img v-if="cat.image_url" :src="`${API_HOST}${cat.image_url}`" alt="category"
               class="h-16 w-16 object-contain rounded-lg" />
          <span class="text-center text-sm font-medium">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="subCategories.length > 0" class="mt-6">
      <div class="text-lg font-semibold mb-2">{{ t('common.subcategory') }}</div>
      <div class="flex flex-wrap gap-3">
        <div v-for="sub in subCategories" :key="sub.id" @click="onSubCategoryClick(sub.id)"
          class="cursor-pointer w-[90px] flex flex-col items-center p-2 rounded-lg">
          <img v-if="sub.image_url" :src="`${API_HOST}${sub.image_url}`" alt="subcategory"
               class="h-16 w-16 object-contain rounded-lg" />
          <span class="text-center text-sm font-medium">{{ sub.name }}</span>
        </div>
      </div>
    </div>

    <div class="mt-6 mb-2 text-xl font-semibold text-mainText">
      {{ $t('common.products') }}
    </div>

    <div v-if="products.length === 0" class="text-center text-gray-400 mt-8">
      {{ $t('pages.index.noProducts') }}
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <MainProductCard v-for="product in products" :key="product.id" :product="product" @click="goToProduct" />
    </div>

    <div v-if="isServerPagination && currentPage < totalPages" class="mt-8 flex justify-center">
      <button
        class="w-full max-w-lg bg-blue-500 text-white px-6 py-3 rounded-lg shadow font-semibold hover:bg-blue-600 active:bg-blue-700 transition"
        :disabled="isLoadingMore" @click="loadMoreProducts">
        <span v-if="!isLoadingMore">{{ t('common.loadMore') }}</span>
        <span v-else>{{ t('common.loading') }}</span>
      </button>
    </div>
  </section>
</template>
