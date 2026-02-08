<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import SearchField from '@/components/SearchField.vue'
import Title from '@/components/Title.vue'
import HeroSection from '@/components/HeroSection.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Folder } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const mainCategories = ref<Category[]>([])
const subCategories = ref<Category[]>([])
const selectedMainCategoryId = ref('')
const selectedSubCategoryId = ref('')
const products = ref<Product[]>([])
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = ref(30)
const categoryPage = ref(1)
const categoryTotalPages = ref(1)
const subCategoryPage = ref(1)
const subCategoryTotalPages = ref(1)
const categoriesPerPage = ref(30)
const searchQuery = ref('')
const isServerPagination = ref(true)
const isCategoryPagination = ref(false)
const isLoadingMore = ref(false)
const isProductsLoading = ref(false)
const isCategoriesLoading = ref(true)
const isSubCategoriesLoading = ref(false)
const isLoadingMoreCategories = ref(false)
const isLoadingMoreSubCategories = ref(false)
const isSearchPagination = ref(false)
const minPriceFilter = ref('')
const maxPriceFilter = ref('')

const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
let filterTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      await resetAllFilters()
      return
    }
    isProductsLoading.value = true
    const res = await productService.searchProducts(
      searchQuery.value.trim(),
      1,
      perPage.value,
      getProductFiltersParams(),
    )
    products.value = res.products
    currentPage.value = res.currentPage
    totalPages.value = res.totalPages
    isSearchPagination.value = true
    isCategoryPagination.value = false
    isServerPagination.value = false
    isProductsLoading.value = false
  }, 300)
}

async function loadProducts(page = 1, append = false) {
  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true
  const res = await productService.getAllProducts(
    page,
    perPage.value,
    getProductFiltersParams(),
  )
  products.value = append ? [...products.value, ...res.products] : res.products
  currentPage.value = res.currentPage
  totalPages.value = res.totalPages
  isServerPagination.value = true
  isCategoryPagination.value = false
  isLoadingMore.value = false
  isProductsLoading.value = false
}

async function loadCategoryProducts(categoryId: string, page = 1, append = false) {
  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true
  const res = await productService.getProductsByCategory(
    categoryId,
    page,
    perPage.value,
    getProductFiltersParams(),
  )
  products.value = append ? [...products.value, ...res.products] : res.products
  currentPage.value = res.currentPage
  totalPages.value = res.totalPages
  isServerPagination.value = true
  isCategoryPagination.value = true
  isLoadingMore.value = false
  isProductsLoading.value = false
}

async function loadMoreProducts() {
  if (currentPage.value >= totalPages.value) return
  const nextPage = currentPage.value + 1
  if (isSearchPagination.value) {
    const res = await productService.searchProducts(
      searchQuery.value.trim(),
      nextPage,
      perPage.value,
      getProductFiltersParams(),
    )
    products.value = [...products.value, ...res.products]
    currentPage.value = res.currentPage
    totalPages.value = res.totalPages
    return
  }
  if (isCategoryPagination.value) {
    const id = selectedSubCategoryId.value || selectedMainCategoryId.value
    await loadCategoryProducts(id, nextPage, true)
    return
  }
  await loadProducts(nextPage, true)
}

async function loadMainCategories(page = 1, append = false) {
  if (!append) isCategoriesLoading.value = true
  const res = await categoryService.getAllCategories(page, categoriesPerPage.value)
  mainCategories.value = append ? [...mainCategories.value, ...res.categories] : res.categories.filter((c: { parent_id: any }) => !c.parent_id)
  categoryPage.value = res.currentPage
  categoryTotalPages.value = res.totalPages
  isCategoriesLoading.value = false
}

async function loadMoreMainCategories() {
  if (isLoadingMoreCategories.value) return
  if (categoryPage.value >= categoryTotalPages.value) return
  isLoadingMoreCategories.value = true
  await loadMainCategories(categoryPage.value + 1, true)
  isLoadingMoreCategories.value = false
}

async function onMainCategoryClick(id: string) {
  if (selectedMainCategoryId.value === id) {
    await resetAllFilters()
    return
  }
  selectedMainCategoryId.value = id
  selectedSubCategoryId.value = ''
  subCategories.value = []
  subCategoryPage.value = 1
  isSubCategoriesLoading.value = true
  const res = await categoryService.getSubcategories(id, subCategoryPage.value, categoriesPerPage.value)
  subCategories.value = res.categories
  subCategoryTotalPages.value = res.totalPages
  isSubCategoriesLoading.value = false
  await loadCategoryProducts(id, 1, false)
}

async function loadMoreSubCategories() {
  if (isLoadingMoreSubCategories.value) return
  if (subCategoryPage.value >= subCategoryTotalPages.value) return
  isLoadingMoreSubCategories.value = true
  const res = await categoryService.getSubcategories(selectedMainCategoryId.value, subCategoryPage.value + 1, categoriesPerPage.value)
  subCategories.value = [...subCategories.value, ...res.categories]
  subCategoryPage.value = res.currentPage
  isLoadingMoreSubCategories.value = false
}

async function onSubCategoryClick(id: string) {
  if (selectedSubCategoryId.value === id) {
    selectedSubCategoryId.value = ''
    await loadCategoryProducts(selectedMainCategoryId.value, 1, false)
    return
  }
  selectedSubCategoryId.value = id
  await loadCategoryProducts(id, 1, false)
}

async function resetAllFilters() {
  selectedMainCategoryId.value = ''
  selectedSubCategoryId.value = ''
  subCategories.value = []
  searchQuery.value = ''
  clearProductFilters()
  isSearchPagination.value = false
  isCategoryPagination.value = false
  await loadProducts(1, false)
}

function parseFilterNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined

  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value
  }

  const normalizedValue = value.trim()
  if (normalizedValue === '') return undefined

  const parsed = Number(normalizedValue)
  return Number.isNaN(parsed) ? undefined : parsed
}

function getProductFiltersParams(): ProductsFilterParams {
  const minPriceRaw = parseFilterNumber(minPriceFilter.value)
  const maxPriceRaw = parseFilterNumber(maxPriceFilter.value)

  if (minPriceRaw !== undefined && maxPriceRaw !== undefined && minPriceRaw > maxPriceRaw) {
    return {
      minPrice: maxPriceRaw,
      maxPrice: minPriceRaw,
    }
  }

  return {
    minPrice: minPriceRaw,
    maxPrice: maxPriceRaw,
  }
}

function clearProductFilters() {
  minPriceFilter.value = ''
  maxPriceFilter.value = ''
}

async function applyProductFilters() {
  const query = searchQuery.value.trim()
  if (query) {
    isProductsLoading.value = true
    const res = await productService.searchProducts(
      query,
      1,
      perPage.value,
      getProductFiltersParams(),
    )
    products.value = res.products
    currentPage.value = res.currentPage
    totalPages.value = res.totalPages
    isSearchPagination.value = true
    isCategoryPagination.value = false
    isServerPagination.value = false
    isProductsLoading.value = false
    return
  }

  if (selectedSubCategoryId.value || selectedMainCategoryId.value) {
    const categoryId = selectedSubCategoryId.value || selectedMainCategoryId.value
    await loadCategoryProducts(categoryId, 1, false)
    isSearchPagination.value = false
    return
  }

  isSearchPagination.value = false
  await loadProducts(1, false)
}

function debouncedApplyProductFilters() {
  if (filterTimeout) clearTimeout(filterTimeout)
  filterTimeout = setTimeout(() => {
    applyProductFilters()
  }, 300)
}

async function onResetProductFilters() {
  clearProductFilters()
  await applyProductFilters()
}

const categoriesScroll = ref<HTMLDivElement | null>(null)
const categoriesLoadMoreTrigger = ref<HTMLElement | null>(null)
let categoriesObserver: IntersectionObserver | null = null

const handleCategoriesWheel = (e: WheelEvent) => {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  const canScrollX = el.scrollWidth > el.clientWidth
  if (!canScrollX) return

  const isHorizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey
  if (!isHorizontalIntent) return

  e.preventDefault()
  const delta = e.shiftKey && e.deltaX === 0 ? e.deltaY : (e.deltaX || e.deltaY)
  el.scrollLeft += delta
}

onMounted(async () => {
  await loadProducts()
  await loadMainCategories()
  observer = new IntersectionObserver((entries) => { if (entries[0]!.isIntersecting) loadMoreProducts() }, { rootMargin: '300px' })
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value)
  categoriesObserver = new IntersectionObserver((entries) => { if (entries[0]!.isIntersecting && categoryPage.value < categoryTotalPages.value) loadMoreMainCategories() }, { root: categoriesScroll.value, threshold: 0.1 })
  if (categoriesLoadMoreTrigger.value) categoriesObserver.observe(categoriesLoadMoreTrigger.value)
})

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (filterTimeout) clearTimeout(filterTimeout)
  observer?.disconnect()
  categoriesObserver?.disconnect()
})
</script>

<template>
  <HeroSection v-if="!user" />

  <div id="catalog-start" class="scroll-mt-24"></div>

  <section class="w-full flex flex-col items-center">
    <div class="relative z-20 flex flex-col items-center w-full px-2 lg:px-4 py-6 min-h-screen">
        <SearchField v-model="searchQuery" :placeholder="$t('pages.index.searchPlaceholder')"
          @search-change="debouncedSearch" class="w-full lg:max-w-2xl" />

        <div class="mt-16 w-full">
          <Title :text="t('common.categories')" />

          <div v-if="isCategoriesLoading" class="flex gap-3 overflow-x-auto">
            <div v-for="n in 5" :key="n" class="w-20 h-20 bg-dark-600 animate-pulse rounded-lg" />
          </div>

          <div v-else ref="categoriesScroll" 
               @wheel="handleCategoriesWheel"
               class="overflow-x-auto overflow-y-hidden  w-full relative cursor-grab active:cursor-grabbing">
            <div class="flex gap-3 min-w-max py-2">
              <div v-for="cat in mainCategories" :key="cat.id" @click="onMainCategoryClick(cat.id)"
                class="flex-shrink-0 cursor-pointer flex flex-col items-center p-2 rounded-lg transition" 
                :class="selectedMainCategoryId === cat.id ? 'bg-white/20' : 'hover:bg-dark-700/40'">
                <div class="w-16 h-16 flex items-center justify-center bg-dark-700 rounded-lg overflow-hidden border border-white/5 shadow-inner">
                  <img v-if="cat.image_url" :src="`${API_HOST}${cat.image_url}`" class="w-full h-full object-cover" />
                  <Folder v-else class="w-8 h-8 text-gray-400" />
                </div>
                <span class="text-sm mt-2 text-center truncate w-16 font-medium">{{ cat.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="subCategories.length" class="mt-4 w-full">
          <div class="flex gap-2 flex-wrap">
            <button v-for="sub in subCategories" :key="sub.id" @click="onSubCategoryClick(sub.id)"
              class="px-5 py-2.5 rounded-full text-sm font-bold border transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
              :class="selectedSubCategoryId === sub.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'">
              {{ sub.name }}
            </button>
          </div>
        </div>

        <div class="mt-6 w-full rounded-xl border border-dark-700 bg-dark-600/30 p-4 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-white">{{ t('pages.index.filtersTitle') }}</h3>
            <button
              type="button"
              class="text-xs text-gray-300 hover:text-white transition"
              @click="onResetProductFilters"
            >
              {{ t('pages.index.resetFilters') }}
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-xs text-gray-400">{{ t('pages.index.priceFrom') }}</label>
              <input
                v-model="minPriceFilter"
                type="number"
                min="0"
                inputmode="decimal"
                class="w-full rounded-lg bg-dark-600 border border-dark-700 px-3 py-2 text-sm text-white outline-none placeholder-gray-500"
                :placeholder="t('pages.index.priceFrom')"
                @input="debouncedApplyProductFilters"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs text-gray-400">{{ t('pages.index.priceTo') }}</label>
              <input
                v-model="maxPriceFilter"
                type="number"
                min="0"
                inputmode="decimal"
                class="w-full rounded-lg bg-dark-600 border border-dark-700 px-3 py-2 text-sm text-white outline-none placeholder-gray-500"
                :placeholder="t('pages.index.priceTo')"
                @input="debouncedApplyProductFilters"
              />
            </div>
          </div>
        </div>

        <Title class="mt-12 w-full" :text="t('common.products')" />

        <div v-if="isProductsLoading" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 w-full">
          <div v-for="n in perPage" :key="n" class="h-64 bg-dark-600 animate-pulse rounded-2xl" />
        </div>

        <div v-else-if="products.length === 0" class="text-center text-gray-400 py-20">
          {{ t('pages.index.noProducts') }}
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 w-full">
          <MainProductCard v-for="product in products" :key="product.id" :product="product" @click="goToProduct" />
        </div>
    </div>

    <div ref="loadMoreTrigger" class="h-10"></div>
  </section>
</template>
