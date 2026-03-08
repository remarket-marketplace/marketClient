<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import SearchField from '@/components/SearchField.vue'
import Title from '@/components/Title.vue'
import HeroSection from '@/components/HeroSection.vue'
import HeroBackground from '@/components/HeroBackground.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Folder, SlidersHorizontal } from 'lucide-vue-next'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  preferredCurrency,
} from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const selectedCurrency = computed(() => preferredCurrency.value)
const currencySymbol = computed(() => getCurrencySymbol(selectedCurrency.value))

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
const searchableCategories = ref<Category[]>([])
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
const isFiltersOpen = ref(false)
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const categorySearchResults = computed(() => {
  if (normalizedSearchQuery.value.length < 1) return []
  return searchableCategories.value
    .filter((category) => category.name.toLowerCase().includes(normalizedSearchQuery.value))
    .slice(0, 8)
})

interface PricePreset {
  id: string
  label: string
  minRub?: number
  maxRub?: number
}

function isVisibleCategory(category: Category): boolean {
  return category.is_active
}

function filterVisibleCategories(categories: Category[]): Category[] {
  return categories.filter(isVisibleCategory)
}

function isVisibleProduct(product: Product): boolean {
  return (
    product.status === 'active'
    && product.category?.is_active
    && !product.seller?.is_banned
  )
}

function filterVisibleProducts(productsList: Product[]): Product[] {
  return productsList.filter(isVisibleProduct)
}

function formatPrice(value: number): string {
  return formatCurrencyAmount(value, { fromCurrency: 'RUB' })
}

function formatFilterValueFromRub(value: number): string {
  const converted = convertCurrencyAmount(value, 'RUB', selectedCurrency.value)
  return selectedCurrency.value === 'USD' ? converted.toFixed(2) : Math.round(converted).toString()
}

function parsePriceFilterInRub(value: string | number | null | undefined): number | undefined {
  const parsed = parseFilterNumber(value)
  if (parsed === undefined) return undefined
  return Math.round(convertCurrencyAmount(parsed, selectedCurrency.value, 'RUB'))
}

function toRubFromUsd(value: number): number {
  return Math.round(convertCurrencyAmount(value, 'USD', 'RUB'))
}

const pricePresets = computed<PricePreset[]>(() => {
  if (selectedCurrency.value === 'USD') {
    return [
      {
        id: 'up-to-10-usd',
        label: `≤ ${formatCurrencyAmount(10, { fromCurrency: 'USD', currency: 'USD' })}`,
        maxRub: toRubFromUsd(10),
      },
      {
        id: '10-50-usd',
        label: `${formatCurrencyAmount(10, { fromCurrency: 'USD', currency: 'USD' })} - ${formatCurrencyAmount(50, { fromCurrency: 'USD', currency: 'USD' })}`,
        minRub: toRubFromUsd(10),
        maxRub: toRubFromUsd(50),
      },
      {
        id: '50-100-usd',
        label: `${formatCurrencyAmount(50, { fromCurrency: 'USD', currency: 'USD' })} - ${formatCurrencyAmount(100, { fromCurrency: 'USD', currency: 'USD' })}`,
        minRub: toRubFromUsd(50),
        maxRub: toRubFromUsd(100),
      },
      {
        id: '100-plus-usd',
        label: `≥ ${formatCurrencyAmount(100, { fromCurrency: 'USD', currency: 'USD' })}`,
        minRub: toRubFromUsd(100),
      },
    ]
  }

  return [
    { id: 'up-to-1000-rub', label: `≤ ${formatPrice(1000)}`, maxRub: 1000 },
    { id: '1000-5000-rub', label: `${formatPrice(1000)} - ${formatPrice(5000)}`, minRub: 1000, maxRub: 5000 },
    { id: '5000-10000-rub', label: `${formatPrice(5000)} - ${formatPrice(10000)}`, minRub: 5000, maxRub: 10000 },
    { id: '10000-plus-rub', label: `≥ ${formatPrice(10000)}`, minRub: 10000 },
  ]
})

function isPricePresetActive(preset: PricePreset): boolean {
  const min = parsePriceFilterInRub(minPriceFilter.value)
  const max = parsePriceFilterInRub(maxPriceFilter.value)
  return min === preset.minRub && max === preset.maxRub
}

async function onPricePresetClick(preset: PricePreset) {
  if (isPricePresetActive(preset)) {
    clearProductFilters()
    await applyProductFilters()
    return
  }

  minPriceFilter.value = preset.minRub === undefined ? '' : formatFilterValueFromRub(preset.minRub)
  maxPriceFilter.value = preset.maxRub === undefined ? '' : formatFilterValueFromRub(preset.maxRub)
  await applyProductFilters()
}

const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

function goToCategoryPage(id: string) {
  if (!id) return
  router.push({ path: `/category/${id}` })
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
    products.value = filterVisibleProducts(res.products)
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
  const visibleProducts = filterVisibleProducts(res.products)
  products.value = append ? [...products.value, ...visibleProducts] : visibleProducts
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
  const visibleProducts = filterVisibleProducts(res.products)
  products.value = append ? [...products.value, ...visibleProducts] : visibleProducts
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
    products.value = [...products.value, ...filterVisibleProducts(res.products)]
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
  const visibleMainCategories = filterVisibleCategories(res.categories).filter((category) => !category.parent_id)
  mainCategories.value = append
    ? [...mainCategories.value, ...visibleMainCategories]
    : visibleMainCategories
  categoryPage.value = res.currentPage
  categoryTotalPages.value = res.totalPages
  isCategoriesLoading.value = false
}

async function loadSearchableCategories() {
  const categories = await categoryService.getAllCategoriesFlat(100, 20)
  searchableCategories.value = filterVisibleCategories(categories)
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
  subCategories.value = filterVisibleCategories(res.categories)
  subCategoryTotalPages.value = res.totalPages
  isSubCategoriesLoading.value = false
  await loadCategoryProducts(id, 1, false)
}

async function loadMoreSubCategories() {
  if (isLoadingMoreSubCategories.value) return
  if (subCategoryPage.value >= subCategoryTotalPages.value) return
  isLoadingMoreSubCategories.value = true
  const res = await categoryService.getSubcategories(selectedMainCategoryId.value, subCategoryPage.value + 1, categoriesPerPage.value)
  subCategories.value = [...subCategories.value, ...filterVisibleCategories(res.categories)]
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
  const minPriceRaw = parsePriceFilterInRub(minPriceFilter.value)
  const maxPriceRaw = parsePriceFilterInRub(maxPriceFilter.value)

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
    products.value = filterVisibleProducts(res.products)
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

function toggleFiltersVisibility() {
  isFiltersOpen.value = !isFiltersOpen.value
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
  await Promise.all([
    loadProducts(),
    loadMainCategories(),
    loadSearchableCategories(),
  ])
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

  <section class="relative w-full flex flex-col items-center">
    <div
      v-if="user"
      class="pointer-events-none absolute top-0 left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] h-[70vh] w-screen z-0"
    >
      <HeroBackground />
    </div>

    <div
      class="relative z-20 flex min-h-screen w-full flex-col items-center px-1 pb-6 sm:px-2 lg:px-2"
      :class="user ? 'pt-20' : 'pt-6'"
    >
        <SearchField v-model="searchQuery" :placeholder="$t('pages.index.searchPlaceholder')"
          @search-change="debouncedSearch" class="w-full lg:max-w-2xl" />

        <div
          v-if="categorySearchResults.length"
          class="mt-2 w-full rounded-xl border border-dark-700 bg-dark-700/70 p-2 lg:max-w-2xl"
        >
          <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {{ t('pages.index.categoriesFound') }}
          </p>
          <button
            v-for="category in categorySearchResults"
            :key="`search-category-${category.id}`"
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white transition hover:bg-dark-600"
            @click="goToCategoryPage(category.id)"
          >
            <img
              v-if="category.image_url"
              :src="`${API_HOST}${category.image_url}`"
              :alt="category.name"
              class="h-5 w-5 rounded object-cover border border-dark-600/80"
            />
            <Folder v-else class="h-4 w-4 text-gray-400" />
            <span class="truncate">{{ category.name }}</span>
          </button>
        </div>

        <div class="mt-10 w-full sm:mt-16">
          <Title :text="t('common.categories')" />

          <div v-if="isCategoriesLoading" class="flex gap-2 overflow-x-auto sm:gap-3">
            <div v-for="n in 5" :key="n" class="h-16 w-16 bg-dark-600 animate-pulse rounded-lg sm:h-20 sm:w-20" />
          </div>

          <div v-else ref="categoriesScroll" 
               @wheel="handleCategoriesWheel"
               class="overflow-x-auto overflow-y-hidden w-full relative">
            <div class="flex min-w-max gap-2 py-1.5 sm:gap-3 sm:py-2">
              <div v-for="cat in mainCategories" :key="cat.id" @click="onMainCategoryClick(cat.id)"
                class="flex-shrink-0 cursor-pointer flex flex-col items-center p-1.5 rounded-lg transition sm:p-2"
                :class="selectedMainCategoryId === cat.id ? 'bg-white/20' : ''">
                <div class="h-12 w-12 flex items-center justify-center bg-dark-700 rounded-lg overflow-hidden border border-white/5 shadow-inner sm:h-16 sm:w-16">
                  <img v-if="cat.image_url" :src="`${API_HOST}${cat.image_url}`" class="w-full h-full object-cover" />
                  <Folder v-else class="h-6 w-6 text-gray-400 sm:h-8 sm:w-8" />
                </div>
                <span class="mt-1.5 w-12 truncate text-center text-xs font-medium leading-tight sm:mt-2 sm:w-16 sm:text-sm">{{ cat.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="subCategories.length" class="mt-3 w-full sm:mt-4">
          <div class="flex flex-wrap gap-1.5 sm:gap-2">
            <button v-for="sub in subCategories" :key="sub.id" @click="onSubCategoryClick(sub.id)"
              class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors backdrop-blur-md sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm sm:font-bold"
              :class="selectedSubCategoryId === sub.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'">
              {{ sub.name }}
            </button>
          </div>
        </div>

        <Title class="mt-12 w-full" :text="t('common.products')" />

        <div class="mt-4 w-full">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition"
            :class="isFiltersOpen
              ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
              : 'border-dark-600 bg-dark-700/40 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55'"
            :aria-expanded="isFiltersOpen"
            :aria-label="t('pages.index.filtersTitle')"
            :title="t('pages.index.filtersTitle')"
            @click="toggleFiltersVisibility"
          >
            <SlidersHorizontal class="h-4 w-4" />
            <span>{{ t('pages.index.filtersTitle') }}</span>
          </button>

          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="isFiltersOpen" class="mt-3 w-full rounded-2xl border border-dark-700 bg-dark-600/25 p-4 md:p-5">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in pricePresets"
                  :key="preset.id"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  :class="isPricePresetActive(preset)
                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                    : 'border-dark-600 bg-dark-700/30 text-gray-300 hover:bg-dark-700/50 hover:text-white'"
                  @click="onPricePresetClick(preset)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 transition focus-within:border-blue-400/40 focus-within:bg-dark-700/55">
                  <span class="block text-xs text-gray-400">{{ t('pages.index.priceFrom') }}</span>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      v-model="minPriceFilter"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      class="w-full bg-transparent text-sm text-white outline-none placeholder-gray-500"
                      :placeholder="t('pages.index.priceFrom')"
                      @input="debouncedApplyProductFilters"
                    />
                    <span class="text-xs font-semibold text-gray-400">{{ currencySymbol }}</span>
                  </div>
                </label>

                <label class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 transition focus-within:border-blue-400/40 focus-within:bg-dark-700/55">
                  <span class="block text-xs text-gray-400">{{ t('pages.index.priceTo') }}</span>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      v-model="maxPriceFilter"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      class="w-full bg-transparent text-sm text-white outline-none placeholder-gray-500"
                      :placeholder="t('pages.index.priceTo')"
                      @input="debouncedApplyProductFilters"
                    />
                    <span class="text-xs font-semibold text-gray-400">{{ currencySymbol }}</span>
                  </div>
                </label>
              </div>
            </div>
          </transition>
        </div>

        <div v-if="isProductsLoading" class="products-grid grid gap-1 md:gap-2 mt-6 w-full">
          <div v-for="n in perPage" :key="n" class="h-64 bg-dark-600 animate-pulse rounded-2xl" />
        </div>

        <div v-else-if="products.length === 0" class="text-center text-gray-400 py-20">
          {{ t('pages.index.noProducts') }}
        </div>

        <div v-else class="products-grid grid gap-1 md:gap-2 mt-6 w-full">
          <MainProductCard v-for="product in products" :key="product.id" :product="product" @click="goToProduct" />
        </div>
    </div>

    <div ref="loadMoreTrigger" class="h-10"></div>
  </section>
</template>

<style scoped>
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
