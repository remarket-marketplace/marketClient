<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
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
import type {
  SteamTopUpCreateOrderPayload,
  SteamTopUpOrder,
  SteamTopUpService,
} from '@/validation/steamTopup/steamTopup'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Folder, SlidersHorizontal } from 'lucide-vue-next'
import axios from 'axios'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  preferredCurrency,
} from '@/utils/currency'
import { buildCategoryKey } from '@/utils/urlKeys'
import { getErrorMessage } from '@/utils/errorsMap'

const { t } = useI18n()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST
const HOME_STEAM_TOPUP_ENABLED = false
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
const createdFromFilter = ref('')
const createdToFilter = ref('')
const isFiltersOpen = ref(false)
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const categorySearchResults = computed(() => {
  if (normalizedSearchQuery.value.length < 1) return []
  return searchableCategories.value
    .filter((category) => category.name.toLowerCase().includes(normalizedSearchQuery.value))
    .slice(0, 8)
})

type SteamAmountMode = 'denomination' | 'quantity'

const steamServices = ref<SteamTopUpService[]>([])
const selectedSteamServiceId = ref<number | null>(null)
const steamAccount = ref('')
const steamRegion = ref('')
const steamServer = ref('')
const steamQuantity = ref('')
const steamDenominationId = ref<number | null>(null)
const steamAmountMode = ref<SteamAmountMode>('denomination')
const steamOrder = ref<SteamTopUpOrder | null>(null)
const steamError = ref('')
const steamSuccess = ref('')
const steamServicesLoading = ref(false)
const steamCreatingOrder = ref(false)
const steamRefreshingOrder = ref(false)
const steamPayingOrder = ref(false)
const steamChargedAmountRub = ref<number | null>(null)
const steamBalanceAfterRub = ref<number | null>(null)

const selectedSteamService = computed(() => {
  if (selectedSteamServiceId.value === null) return null
  return steamServices.value.find((service) => service.id === selectedSteamServiceId.value) ?? null
})

const steamSupportsQuantity = computed(
  () => selectedSteamService.value?.params?.some((param) => param.param_key === 'Quantity') ?? false,
)
const steamSupportsRegion = computed(
  () => selectedSteamService.value?.params?.some((param) => param.param_key === 'Region') ?? false,
)
const steamSupportsServer = computed(
  () => selectedSteamService.value?.params?.some((param) => param.param_key === 'Server') ?? false,
)
const steamHasDenominations = computed(
  () => (selectedSteamService.value?.denominations?.length ?? 0) > 0,
)
const steamCanToggleAmountMode = computed(
  () => steamSupportsQuantity.value && steamHasDenominations.value,
)
const steamOrderStatus = computed(() => steamOrder.value?.status?.toLowerCase() ?? '')
const steamOrderReadyToPay = computed(() => steamOrderStatus.value === 'verified')
const steamOrderPaid = computed(
  () => steamOrderStatus.value === 'paid' || steamOrderStatus.value === 'shipped',
)
const steamOrderPriceLabel = computed(() => {
  if (!steamOrder.value) return ''
  const price = Number(steamOrder.value.price)
  const normalizedPrice = Number.isFinite(price) ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : steamOrder.value.price
  return `${normalizedPrice} ${steamOrder.value.currency || 'RUB'}`
})
const steamCanCreateOrder = computed(() => {
  if (!user.value || !selectedSteamService.value) return false
  if (steamAccount.value.trim().length < 2) return false

  if (steamAmountMode.value === 'denomination') {
    return steamDenominationId.value !== null
  }

  const quantity = Number.parseFloat(steamQuantity.value)
  return Number.isFinite(quantity) && quantity > 0
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
    clearPriceFilters()
    await applyProductFilters()
    return
  }

  minPriceFilter.value = preset.minRub === undefined ? '' : formatFilterValueFromRub(preset.minRub)
  maxPriceFilter.value = preset.maxRub === undefined ? '' : formatFilterValueFromRub(preset.maxRub)
  await applyProductFilters()
}

const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
}

function goToCategoryPage(category: Category) {
  const categoryKey = buildCategoryKey(category)
  if (!categoryKey) return
  router.push({ path: `/category/${categoryKey}` })
}

function resolveCategoryImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

function resolveSteamErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return getErrorMessage(error.response?.data?.detail ?? error.message, t)
  }
  return getErrorMessage(error, t)
}

function setDefaultSteamService(service: SteamTopUpService | null): void {
  steamDenominationId.value = service?.denominations?.[0]?.id ?? null
  if (service?.denominations?.length) {
    steamAmountMode.value = 'denomination'
    steamQuantity.value = ''
  } else if (service?.params?.some((param) => param.param_key === 'Quantity')) {
    steamAmountMode.value = 'quantity'
    steamQuantity.value = steamQuantity.value || '1'
  } else {
    steamAmountMode.value = 'denomination'
    steamQuantity.value = ''
  }
}

function clearSteamFeedback(): void {
  steamError.value = ''
  steamSuccess.value = ''
}

function buildSteamCreateOrderPayload(): SteamTopUpCreateOrderPayload | null {
  if (!selectedSteamService.value) return null

  const account = steamAccount.value.trim()
  if (account.length < 2) return null

  const payload: SteamTopUpCreateOrderPayload = {
    service_id: selectedSteamService.value.id,
    account,
  }

  if (steamSupportsRegion.value && steamRegion.value.trim()) {
    payload.region = steamRegion.value.trim()
  }
  if (steamSupportsServer.value && steamServer.value.trim()) {
    payload.server = steamServer.value.trim()
  }

  if (steamAmountMode.value === 'denomination') {
    if (steamDenominationId.value === null) return null
    payload.denomination_id = steamDenominationId.value
    return payload
  }

  const quantity = Number.parseFloat(steamQuantity.value)
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  payload.quantity = quantity
  return payload
}

async function loadSteamServices() {
  if (!user.value) return
  steamServicesLoading.value = true
  clearSteamFeedback()
  try {
    const response = await steamTopupService.getServices()
    steamServices.value = response.services
    if (!steamServices.value.length) {
      selectedSteamServiceId.value = null
      steamOrder.value = null
      return
    }
    if (!steamServices.value.some((service) => service.id === selectedSteamServiceId.value)) {
      selectedSteamServiceId.value = steamServices.value[0]!.id
    }
    const selected = selectedSteamService.value ?? steamServices.value[0] ?? null
    setDefaultSteamService(selected)
  } catch (error) {
    steamServices.value = []
    selectedSteamServiceId.value = null
    steamOrder.value = null
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamServicesLoading.value = false
  }
}

async function createSteamOrder() {
  if (steamCreatingOrder.value) return
  const payload = buildSteamCreateOrderPayload()
  if (!payload) return

  steamCreatingOrder.value = true
  clearSteamFeedback()
  steamChargedAmountRub.value = null
  steamBalanceAfterRub.value = null
  try {
    steamOrder.value = await steamTopupService.createOrder(payload)
    steamSuccess.value = t('pages.index.steamTopUp.orderCreated')
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamCreatingOrder.value = false
  }
}

async function refreshSteamOrder() {
  if (!steamOrder.value || steamRefreshingOrder.value) return

  steamRefreshingOrder.value = true
  clearSteamFeedback()
  try {
    steamOrder.value = await steamTopupService.getOrder(steamOrder.value.id)
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamRefreshingOrder.value = false
  }
}

async function paySteamOrder() {
  if (!steamOrder.value || steamPayingOrder.value) return

  steamPayingOrder.value = true
  clearSteamFeedback()
  try {
    const response = await steamTopupService.payOrder(steamOrder.value.id)
    steamOrder.value = response.order
    steamChargedAmountRub.value = response.charged_amount_rub
    steamBalanceAfterRub.value = response.user_balance_after_rub
    steamSuccess.value = t('pages.index.steamTopUp.orderPaid')
    await userStore.fetchUser()
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamPayingOrder.value = false
  }
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

function onMainCategoryClick(category: Category) {
  goToCategoryPage(category)
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

function parseDateFilter(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined

  const parsedDate = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return undefined

  return normalized
}

function getProductFiltersParams(): ProductsFilterParams {
  const minPriceRaw = parsePriceFilterInRub(minPriceFilter.value)
  const maxPriceRaw = parsePriceFilterInRub(maxPriceFilter.value)
  const createdFromRaw = parseDateFilter(createdFromFilter.value)
  const createdToRaw = parseDateFilter(createdToFilter.value)

  const minPrice =
    minPriceRaw !== undefined && maxPriceRaw !== undefined && minPriceRaw > maxPriceRaw
      ? maxPriceRaw
      : minPriceRaw
  const maxPrice =
    minPriceRaw !== undefined && maxPriceRaw !== undefined && minPriceRaw > maxPriceRaw
      ? minPriceRaw
      : maxPriceRaw

  const createdFrom =
    createdFromRaw && createdToRaw && createdFromRaw > createdToRaw
      ? createdToRaw
      : createdFromRaw
  const createdTo =
    createdFromRaw && createdToRaw && createdFromRaw > createdToRaw
      ? createdFromRaw
      : createdToRaw

  return {
    minPrice,
    maxPrice,
    createdFrom,
    createdTo,
  }
}

function clearProductFilters() {
  clearPriceFilters()
  clearDateFilters()
}

function clearPriceFilters() {
  minPriceFilter.value = ''
  maxPriceFilter.value = ''
}

function clearDateFilters() {
  createdFromFilter.value = ''
  createdToFilter.value = ''
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

watch(selectedSteamServiceId, () => {
  steamOrder.value = null
  steamChargedAmountRub.value = null
  steamBalanceAfterRub.value = null
  setDefaultSteamService(selectedSteamService.value)

  if (!steamSupportsRegion.value) {
    steamRegion.value = ''
  }
  if (!steamSupportsServer.value) {
    steamServer.value = ''
  }
})

watch(
  () => user.value?.id,
  async (currentUserId, previousUserId) => {
    if (!HOME_STEAM_TOPUP_ENABLED) return
    if (!currentUserId) {
      steamServices.value = []
      selectedSteamServiceId.value = null
      steamOrder.value = null
      return
    }
    if (currentUserId !== previousUserId || steamServices.value.length === 0) {
      await loadSteamServices()
    }
  },
)

onMounted(async () => {
  await Promise.all([
    loadProducts(),
    loadMainCategories(),
    loadSearchableCategories(),
  ])
  if (HOME_STEAM_TOPUP_ENABLED && user.value) {
    await loadSteamServices()
  }
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
            @click="goToCategoryPage(category)"
          >
            <img
              v-if="category.image_url"
              :src="resolveCategoryImageUrl(category.image_url)"
              :alt="category.name"
              class="h-6 w-6 rounded object-cover border border-dark-600/80 shrink-0"
            />
            <Folder v-else class="h-5 w-5 text-gray-400 shrink-0" />
            <span class="truncate text-sm leading-5">{{ category.name }}</span>
          </button>
        </div>

        <div
          v-if="user && HOME_STEAM_TOPUP_ENABLED"
          class="mt-4 w-full rounded-2xl border border-dark-700 bg-dark-700/45 p-4 lg:max-w-2xl"
        >
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold text-white">{{ t('pages.index.steamTopUp.title') }}</h2>
            <p class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.subtitle') }}</p>
          </div>

          <p v-if="steamError" class="mt-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {{ steamError }}
          </p>
          <p v-if="steamSuccess" class="mt-3 rounded-lg border border-green-500/35 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {{ steamSuccess }}
          </p>

          <div v-if="steamServicesLoading" class="mt-3 text-sm text-gray-400">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="!steamServices.length" class="mt-3 text-sm text-gray-400">
            {{ t('pages.index.steamTopUp.noServices') }}
          </div>
          <div v-else class="mt-3 space-y-3">
            <label class="block">
              <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.service') }}</span>
              <select
                v-model.number="selectedSteamServiceId"
                class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition focus:border-blue-400/40"
              >
                <option
                  v-for="service in steamServices"
                  :key="service.id"
                  :value="service.id"
                >
                  {{ service.name }}
                </option>
              </select>
            </label>

            <label class="block">
              <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.account') }}</span>
              <input
                v-model.trim="steamAccount"
                type="text"
                autocomplete="off"
                class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
                :placeholder="t('pages.index.steamTopUp.accountPlaceholder')"
              />
            </label>

            <div v-if="steamCanToggleAmountMode">
              <p class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.amountType') }}</p>
              <div class="mt-1 flex gap-2">
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                  :class="steamAmountMode === 'denomination'
                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                    : 'border-dark-600 bg-dark-700/45 text-gray-300 hover:bg-dark-700/60'"
                  @click="steamAmountMode = 'denomination'"
                >
                  {{ t('pages.index.steamTopUp.amountTypeFixed') }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                  :class="steamAmountMode === 'quantity'
                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                    : 'border-dark-600 bg-dark-700/45 text-gray-300 hover:bg-dark-700/60'"
                  @click="steamAmountMode = 'quantity'"
                >
                  {{ t('pages.index.steamTopUp.amountTypeCustom') }}
                </button>
              </div>
            </div>

            <label
              v-if="steamAmountMode === 'denomination' && steamHasDenominations"
              class="block"
            >
              <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.denomination') }}</span>
              <select
                v-model.number="steamDenominationId"
                class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition focus:border-blue-400/40"
              >
                <option
                  v-for="denomination in selectedSteamService?.denominations ?? []"
                  :key="denomination.id"
                  :value="denomination.id"
                >
                  {{ denomination.name }} ({{ denomination.price }} {{ denomination.currency }})
                </option>
              </select>
            </label>

            <label
              v-else-if="steamSupportsQuantity"
              class="block"
            >
              <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.quantity') }}</span>
              <input
                v-model.trim="steamQuantity"
                type="number"
                min="0.01"
                step="0.01"
                inputmode="decimal"
                class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
                :placeholder="t('pages.index.steamTopUp.quantityPlaceholder')"
              />
            </label>

            <div
              v-if="steamSupportsRegion || steamSupportsServer"
              class="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <label v-if="steamSupportsRegion" class="block">
                <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.region') }}</span>
                <input
                  v-model.trim="steamRegion"
                  type="text"
                  class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
                  :placeholder="t('pages.index.steamTopUp.regionPlaceholder')"
                />
              </label>
              <label v-if="steamSupportsServer" class="block">
                <span class="text-xs text-gray-400">{{ t('pages.index.steamTopUp.server') }}</span>
                <input
                  v-model.trim="steamServer"
                  type="text"
                  class="mt-1 h-10 w-full rounded-xl border border-dark-600 bg-dark-700/45 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
                  :placeholder="t('pages.index.steamTopUp.serverPlaceholder')"
                />
              </label>
            </div>

            <button
              type="button"
              class="h-10 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!steamCanCreateOrder || steamCreatingOrder"
              @click="createSteamOrder"
            >
              {{ steamCreatingOrder ? t('pages.index.steamTopUp.creatingOrder') : t('pages.index.steamTopUp.createOrder') }}
            </button>
          </div>

          <div
            v-if="steamOrder"
            class="mt-4 rounded-xl border border-dark-600 bg-dark-700/35 p-3"
          >
            <p class="text-sm font-semibold text-white">
              {{ t('pages.index.steamTopUp.orderTitle') }} #{{ steamOrder.id }}
            </p>
            <div class="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
              <p>
                <span class="text-gray-400">{{ t('pages.index.steamTopUp.orderStatus') }}:</span>
                <span class="ml-1">{{ steamOrder.status }}</span>
              </p>
              <p>
                <span class="text-gray-400">{{ t('pages.index.steamTopUp.orderPrice') }}:</span>
                <span class="ml-1">{{ steamOrderPriceLabel }}</span>
              </p>
              <p v-if="steamOrder.denomination">
                <span class="text-gray-400">{{ t('pages.index.steamTopUp.denomination') }}:</span>
                <span class="ml-1">{{ steamOrder.denomination.name }}</span>
              </p>
              <p v-if="steamChargedAmountRub !== null">
                <span class="text-gray-400">{{ t('pages.index.steamTopUp.chargedAmount') }}:</span>
                <span class="ml-1">{{ formatCurrencyAmount(steamChargedAmountRub, { fromCurrency: 'RUB', currency: 'RUB' }) }}</span>
              </p>
              <p v-if="steamBalanceAfterRub !== null">
                <span class="text-gray-400">{{ t('pages.index.steamTopUp.balanceAfter') }}:</span>
                <span class="ml-1">{{ formatCurrencyAmount(steamBalanceAfterRub, { fromCurrency: 'RUB', currency: 'RUB' }) }}</span>
              </p>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="h-9 rounded-lg border border-dark-600 bg-dark-700/50 px-3 text-xs font-semibold text-gray-200 transition hover:bg-dark-700/70 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="steamRefreshingOrder"
                @click="refreshSteamOrder"
              >
                {{ steamRefreshingOrder ? t('pages.index.steamTopUp.refreshingOrder') : t('pages.index.steamTopUp.refreshOrder') }}
              </button>
              <button
                type="button"
                class="h-9 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!steamOrderReadyToPay || steamOrderPaid || steamPayingOrder"
                @click="paySteamOrder"
              >
                {{ steamPayingOrder ? t('pages.index.steamTopUp.payingOrder') : t('pages.index.steamTopUp.payOrder') }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-10 w-full sm:mt-16">
          <Title :text="t('common.categories')" />

          <div v-if="isCategoriesLoading" class="flex gap-2 overflow-x-auto sm:gap-3">
            <div v-for="n in 5" :key="n" class="h-16 w-16 bg-dark-600 animate-pulse rounded-lg sm:h-20 sm:w-20" />
          </div>

          <div
            v-else
            ref="categoriesScroll"
            @wheel="handleCategoriesWheel"
            class="overflow-x-auto overflow-y-hidden w-full relative"
          >
            <div class="flex min-w-max gap-2 py-1.5 sm:gap-3 sm:py-2">
              <div
                v-for="cat in mainCategories"
                :key="cat.id"
                @click="onMainCategoryClick(cat)"
                class="flex-shrink-0 cursor-pointer flex flex-col items-center p-1.5 rounded-lg transition sm:p-2"
              >
                <div class="h-12 w-12 flex items-center justify-center bg-dark-700 rounded-lg overflow-hidden border border-white/5 shadow-inner sm:h-16 sm:w-16">
                  <img v-if="cat.image_url" :src="`${API_HOST}${cat.image_url}`" class="w-full h-full object-cover" />
                  <Folder v-else class="h-6 w-6 text-gray-400 sm:h-8 sm:w-8" />
                </div>
                <span class="mt-1.5 w-12 truncate text-center text-xs font-medium leading-tight sm:mt-2 sm:w-16 sm:text-sm">{{ cat.name }}</span>
              </div>
            </div>
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

              <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 transition focus-within:border-blue-400/40 focus-within:bg-dark-700/55">
                  <span class="block text-xs text-gray-400">{{ t('pages.index.dateFrom') }}</span>
                  <input
                    v-model="createdFromFilter"
                    type="date"
                    class="mt-1.5 w-full bg-transparent text-sm text-white outline-none placeholder-gray-500"
                    :max="createdToFilter || undefined"
                    @input="debouncedApplyProductFilters"
                  />
                </label>

                <label class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 transition focus-within:border-blue-400/40 focus-within:bg-dark-700/55">
                  <span class="block text-xs text-gray-400">{{ t('pages.index.dateTo') }}</span>
                  <input
                    v-model="createdToFilter"
                    type="date"
                    class="mt-1.5 w-full bg-transparent text-sm text-white outline-none placeholder-gray-500"
                    :min="createdFromFilter || undefined"
                    @input="debouncedApplyProductFilters"
                  />
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
