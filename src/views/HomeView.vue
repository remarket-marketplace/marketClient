<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import OfficialProductsShowcase from '@/components/OfficialProductsShowcase.vue'
import Title from '@/components/Title.vue'
import TelegramStarsCta from '@/components/TelegramStarsCta.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import type {
  SteamTopUpCreatePaymentPayload,
  SteamTopUpCreateOrderPayload,
  SteamTopUpOrder,
  SteamTopUpPayOrderPayload,
  SteamTopUpService,
} from '@/validation/steamTopup/steamTopup'
import { isValidSteamTopUpAccount, normalizeSteamTopUpAccount } from '@/validation/steamTopup/steamTopup'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ChevronRight, Folder, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-vue-next'
import axios from 'axios'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  preferredCurrency,
} from '@/utils/currency'
import { buildCategoryKey, buildProductKey } from '@/utils/urlKeys'
import { getErrorMessage } from '@/utils/errorsMap'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const API_HOST = import.meta.env.VITE_API_HOST
const HOME_STEAM_TOPUP_ENABLED = import.meta.env.VITE_STEAM_TOPUP_ENABLED !== 'false'
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
const searchQuery = ref(getRouteSearchQuery())
const isServerPagination = ref(true)
const isCategoryPagination = ref(false)
const isLoadingMore = ref(false)
const isProductsLoading = ref(false)
const isCategoriesLoading = ref(true)
const isSubCategoriesLoading = ref(false)
const isLoadingMoreCategories = ref(false)
const isLoadingMoreSubCategories = ref(false)
const isExpandingCategories = ref(false)
const isSearchPagination = ref(false)
const minPriceFilter = ref('')
const maxPriceFilter = ref('')
const onlineSellersOnly = ref(false)
const autoDeliveryOnly = ref(false)
const sellersWithReviewsOnly = ref(false)
const isFiltersOpen = ref(false)
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const CATEGORY_PLACEHOLDER_COUNT = 8
const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid'
    ? perPage.value
    : Math.min(perPage.value, 12)
))
const brokenCategoryImages = ref<Record<string, true>>({})
const officialHomeProducts = ref<Product[]>([])
const isOfficialHomeLoading = ref(false)
const shouldShowOfficialHomeShowcase = computed(() => (
  !isOfficialHomeLoading.value && officialHomeProducts.value.length > 0
))
const areCategoriesExpanded = ref(false)
const shouldShowCategoryExpandButton = computed(() => (
  mainCategories.value.length > 8 || categoryTotalPages.value > 1
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

function isCategoryImageAvailable(categoryId: string, imageUrl: string | null): boolean {
  return Boolean(imageUrl) && !brokenCategoryImages.value[categoryId]
}

function markCategoryImageBroken(categoryId: string): void {
  brokenCategoryImages.value = {
    ...brokenCategoryImages.value,
    [categoryId]: true,
  }
}

type SteamAmountMode = 'denomination' | 'quantity'
type SteamCheckoutCurrency = 'RUB' | 'USD'

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
const steamDiscountAmountRub = ref<number | null>(null)
const steamAppliedPromoCode = ref<string | null>(null)
const steamPromoDiscountPercent = ref<number | null>(null)
const steamCheckoutModalOpen = ref(false)
const steamCheckoutCurrency = ref<SteamCheckoutCurrency>(
  selectedCurrency.value === 'USD' ? 'USD' : 'RUB',
)
const steamCheckoutSubmitting = ref(false)

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
const selectedSteamDenomination = computed(() => {
  if (steamDenominationId.value === null) return null
  return selectedSteamService.value?.denominations?.find((item) => item.id === steamDenominationId.value) ?? null
})
const steamAmountPreviewLabel = computed(() => {
  if (steamAmountMode.value === 'denomination' && selectedSteamDenomination.value) {
    const denominationPrice = Number(selectedSteamDenomination.value.price)
    const normalizedPrice = Number.isFinite(denominationPrice)
      ? denominationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : selectedSteamDenomination.value.price
    const denominationCurrency = selectedSteamDenomination.value.currency || selectedSteamService.value?.currency || ''
    return `${normalizedPrice} ${denominationCurrency}`.trim()
  }

  const quantity = Number.parseFloat(steamQuantity.value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return t('pages.index.steamTopUp.quantityPlaceholder')
  }

  const serviceCurrency = selectedSteamService.value?.currency || selectedSteamService.value?.in_game_currency || ''
  return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${serviceCurrency}`.trim()
})
const steamAmountInputDisabled = computed(() => false)
const steamCheckoutCurrencySymbol = computed(() => (steamCheckoutCurrency.value === 'USD' ? '$' : '₽'))
const steamCheckoutAmountLabel = computed(() => {
  const numericAmount = Number.parseFloat(steamQuantity.value)
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    return `${numericAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${steamCheckoutCurrencySymbol.value}`
  }
  return steamAmountPreviewLabel.value
})
const steamNormalizedAccount = computed(() => normalizeSteamTopUpAccount(steamAccount.value))
const steamIsAccountValid = computed(() => isValidSteamTopUpAccount(steamAccount.value))
const steamCanCreateOrder = computed(() => {
  if (!user.value) return false
  if (!steamIsAccountValid.value) return false

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

function normalizeRouteSearchQuery(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function getRouteSearchQuery(): string {
  return normalizeRouteSearchQuery(route.query.search).trim()
}

function mergeUniqueCategories(currentCategories: Category[], nextCategories: Category[]): Category[] {
  const seenCategoryIds = new Set(currentCategories.map((category) => category.id))
  const uniqueNextCategories = nextCategories.filter((category) => {
    if (seenCategoryIds.has(category.id)) return false
    seenCategoryIds.add(category.id)
    return true
  })
  return [...currentCategories, ...uniqueNextCategories]
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

const hasPriceFilter = computed(() =>
  parsePriceFilterInRub(minPriceFilter.value) !== undefined
  || parsePriceFilterInRub(maxPriceFilter.value) !== undefined,
)

const activeProductFiltersCount = computed(() =>
  Number(hasPriceFilter.value)
  + Number(onlineSellersOnly.value)
  + Number(autoDeliveryOnly.value)
  + Number(sellersWithReviewsOnly.value),
)

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
const PRODUCT_REVEAL_STAGGER_MS = 55
const PRODUCT_CARD_PRELOAD_TIMEOUT_MS = 1800
const readyHomeProductCardIds = ref<Record<string, true>>({})
const homeProductCardPreloads = new Map<string, Promise<void>>()

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
}

function getProductRevealDelayStyle(index: number): Record<string, string> {
  return {
    transitionDelay: `${index * PRODUCT_REVEAL_STAGGER_MS}ms`,
  }
}

function isHomeProductCardReady(productId: string): boolean {
  return Boolean(readyHomeProductCardIds.value[productId])
}

function markHomeProductCardReady(productId: string): void {
  if (readyHomeProductCardIds.value[productId]) return
  readyHomeProductCardIds.value = {
    ...readyHomeProductCardIds.value,
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

function preloadHomeProductCard(product: Product): Promise<void> {
  if (readyHomeProductCardIds.value[product.id]) {
    return Promise.resolve()
  }

  const existingPreload = homeProductCardPreloads.get(product.id)
  if (existingPreload) {
    return existingPreload
  }

  const coverImageUrl = resolveProductCoverImageUrl(product)
  if (!coverImageUrl || typeof Image === 'undefined') {
    markHomeProductCardReady(product.id)
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
      markHomeProductCardReady(product.id)
      homeProductCardPreloads.delete(product.id)
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

  homeProductCardPreloads.set(product.id, preloadPromise)
  return preloadPromise
}

function syncHomeProductCardReadiness(nextProducts: Product[]): void {
  const nextReadyState: Record<string, true> = {}

  nextProducts.forEach((product) => {
    if (readyHomeProductCardIds.value[product.id]) {
      nextReadyState[product.id] = true
      return
    }

    void preloadHomeProductCard(product)
  })

  readyHomeProductCardIds.value = nextReadyState
}

function setVisibleHomeProducts(nextProducts: Product[], append = false): void {
  products.value = append ? [...products.value, ...nextProducts] : nextProducts
  syncHomeProductCardReadiness(products.value)
}

function goToProductByModel(product: Product) {
  const productKey = buildProductKey(product)
  if (!productKey) return
  goToProduct(productKey)
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

async function loadOfficialHomeProducts() {
  isOfficialHomeLoading.value = true
  officialHomeProducts.value = []

  try {
    const overview = await productService.getOfficialStoreOverview()
    const categories = (overview?.categories ?? []).filter((category) => category.is_active)
    if (!categories.length) return

    const categoryProducts = await Promise.all(
      categories.map(async (category) => {
        const categoryKey = buildCategoryKey(category) || category.id
        const response = await productService.getProductsByCategory(
          categoryKey,
          1,
          1,
          { isOfficialOnly: true },
        )
        const product = response.products[0]
        return product ?? null
      }),
    )

    officialHomeProducts.value = categoryProducts.filter(
      (item): item is Product => item !== null,
    )
  } finally {
    isOfficialHomeLoading.value = false
  }
}

function resolveSteamErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return getErrorMessage(error.response?.data?.detail ?? error.message, t)
  }
  return getErrorMessage(error, t)
}

function setDefaultSteamService(service: SteamTopUpService | null): void {
  steamDenominationId.value = service?.denominations?.[0]?.id ?? null
  if (service?.params?.some((param) => param.param_key === 'Quantity')) {
    steamAmountMode.value = 'quantity'
    steamQuantity.value = steamQuantity.value || '1000'
  } else if (service?.denominations?.length) {
    steamAmountMode.value = 'denomination'
    steamQuantity.value = ''
  } else {
    steamAmountMode.value = 'denomination'
    steamQuantity.value = ''
  }
}

function buildSteamPayOrderPayload(): SteamTopUpPayOrderPayload {
  return {
    payment_method: 'lava',
  }
}

function buildSteamCreatePaymentPayload(): SteamTopUpCreatePaymentPayload | null {
  if (!steamIsAccountValid.value) return null
  const amount = Number.parseFloat(steamQuantity.value)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return {
    account: steamNormalizedAccount.value,
    amount,
    currency: steamCheckoutCurrency.value,
  }
}

function clearSteamFeedback(): void {
  steamError.value = ''
  steamSuccess.value = ''
}

function buildSteamCreateOrderPayload(): SteamTopUpCreateOrderPayload | null {
  if (!selectedSteamService.value) return null

  if (!steamIsAccountValid.value) return null
  const account = steamNormalizedAccount.value

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
  steamDiscountAmountRub.value = null
  steamAppliedPromoCode.value = null
  steamPromoDiscountPercent.value = null
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
    const response = await steamTopupService.payOrder(
      steamOrder.value.id,
      buildSteamPayOrderPayload(),
    )
    steamOrder.value = response.order
    steamChargedAmountRub.value = response.charged_amount_rub
    steamBalanceAfterRub.value = response.user_balance_after_rub
    steamDiscountAmountRub.value = response.discount_amount_rub ?? null
    steamAppliedPromoCode.value = response.applied_promo_code ?? null
    steamPromoDiscountPercent.value = response.promo_discount_percent ?? null
    if (response.payment_url) {
      steamSuccess.value = t('pages.index.steamTopUp.redirectToPayment')
      window.location.href = response.payment_url
      return
    }

    steamSuccess.value = t('pages.index.steamTopUp.orderPaid')
    await userStore.fetchUser()
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamPayingOrder.value = false
  }
}

async function submitSteamTopUpPayment() {
  if (steamCheckoutSubmitting.value) return

  const payload = buildSteamCreatePaymentPayload()
  if (!payload) {
    steamError.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  steamCheckoutSubmitting.value = true
  clearSteamFeedback()
  steamSuccess.value = t('pages.index.steamTopUp.redirectToPayment')

  try {
    const response = await steamTopupService.createPayment(payload)
    if (response.payment_url) {
      window.location.href = response.payment_url
      return
    }
    await userStore.fetchUser()
    steamSuccess.value = t('pages.index.steamTopUp.orderPaid')
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
    steamSuccess.value = ''
  } finally {
    steamCheckoutSubmitting.value = false
  }
}

function openSteamCheckoutModal() {
  if (!steamCanCreateOrder.value) return
  steamCheckoutCurrency.value = selectedCurrency.value === 'USD' ? 'USD' : 'RUB'
  steamCheckoutModalOpen.value = true
}

function closeSteamCheckoutModal() {
  if (steamCheckoutSubmitting.value) return
  steamCheckoutModalOpen.value = false
}

async function confirmSteamCheckout() {
  if (steamCheckoutSubmitting.value) return

  steamCheckoutSubmitting.value = true
  clearSteamFeedback()
  try {
    await createSteamOrder()
    if (!steamOrder.value) return

    if (!steamOrderReadyToPay.value) {
      await refreshSteamOrder()
    }

    if (steamOrderReadyToPay.value && !steamOrderPaid.value) {
      await paySteamOrder()
    }

    steamCheckoutModalOpen.value = false
  } finally {
    steamCheckoutSubmitting.value = false
  }
}

let filterTimeout: ReturnType<typeof setTimeout> | null = null

async function searchProductsByQuery(query: string, page = 1, append = false) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    await resetAllFilters()
    return
  }

  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true

  const res = await productService.searchProducts(
    trimmedQuery,
    page,
    perPage.value,
    getProductFiltersParams(),
  )
  setVisibleHomeProducts(res.products, append)
  currentPage.value = res.currentPage
  totalPages.value = res.totalPages
  isSearchPagination.value = true
  isCategoryPagination.value = false
  isServerPagination.value = false
  isLoadingMore.value = false
  isProductsLoading.value = false
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
  setVisibleHomeProducts(res.products, append)
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
  setVisibleHomeProducts(res.products, append)
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
    await searchProductsByQuery(searchQuery.value, nextPage, true)
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
  try {
    const res = await categoryService.getAllCategories(page, categoriesPerPage.value)
    const visibleMainCategories = filterVisibleCategories(res.categories)
      .filter((category) => !category.parent_id)

    mainCategories.value = append
      ? mergeUniqueCategories(mainCategories.value, visibleMainCategories)
      : visibleMainCategories
    categoryPage.value = res.currentPage
    categoryTotalPages.value = res.totalPages
  } finally {
    if (!append) isCategoriesLoading.value = false
  }
}

async function loadMoreMainCategories() {
  if (isLoadingMoreCategories.value) return
  if (categoryPage.value >= categoryTotalPages.value) return
  isLoadingMoreCategories.value = true
  await loadMainCategories(categoryPage.value + 1, true)
  isLoadingMoreCategories.value = false
}

async function expandAllMainCategories() {
  if (isExpandingCategories.value) return
  isExpandingCategories.value = true
  try {
    while (categoryPage.value < categoryTotalPages.value) {
      await loadMainCategories(categoryPage.value + 1, true)
    }
  } finally {
    isExpandingCategories.value = false
  }
}

async function toggleCategoriesExpanded() {
  areCategoriesExpanded.value = !areCategoriesExpanded.value
  if (areCategoriesExpanded.value) {
    await expandAllMainCategories()
  }
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

function getProductFiltersParams(): ProductsFilterParams {
  const minPriceRaw = parsePriceFilterInRub(minPriceFilter.value)
  const maxPriceRaw = parsePriceFilterInRub(maxPriceFilter.value)

  const minPrice =
    minPriceRaw !== undefined && maxPriceRaw !== undefined && minPriceRaw > maxPriceRaw
      ? maxPriceRaw
      : minPriceRaw
  const maxPrice =
    minPriceRaw !== undefined && maxPriceRaw !== undefined && minPriceRaw > maxPriceRaw
      ? minPriceRaw
      : maxPriceRaw

  return {
    minPrice,
    maxPrice,
    sellersWithReviewsOnly: sellersWithReviewsOnly.value,
    onlineSellersOnly: onlineSellersOnly.value,
    autoDeliveryOnly: autoDeliveryOnly.value,
    excludeOfficial: true,
  }
}

function clearProductFilters() {
  clearPriceFilters()
  onlineSellersOnly.value = false
  autoDeliveryOnly.value = false
  sellersWithReviewsOnly.value = false
}

function clearPriceFilters() {
  minPriceFilter.value = ''
  maxPriceFilter.value = ''
}

async function resetProductFilters() {
  clearProductFilters()
  await applyProductFilters()
}

async function toggleOnlineSellersOnlyFilter() {
  onlineSellersOnly.value = !onlineSellersOnly.value
  await applyProductFilters()
}

async function toggleAutoDeliveryOnlyFilter() {
  autoDeliveryOnly.value = !autoDeliveryOnly.value
  await applyProductFilters()
}

async function toggleSellersWithReviewsOnlyFilter() {
  sellersWithReviewsOnly.value = !sellersWithReviewsOnly.value
  await applyProductFilters()
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
    setVisibleHomeProducts(res.products)
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

watch(selectedSteamServiceId, () => {
  steamOrder.value = null
  steamChargedAmountRub.value = null
  steamBalanceAfterRub.value = null
  steamDiscountAmountRub.value = null
  steamAppliedPromoCode.value = null
  steamPromoDiscountPercent.value = null
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
  (currentUserId) => {
    if (!HOME_STEAM_TOPUP_ENABLED) return
    if (!currentUserId) {
      steamServices.value = []
      selectedSteamServiceId.value = null
      steamOrder.value = null
      steamChargedAmountRub.value = null
      steamBalanceAfterRub.value = null
      steamDiscountAmountRub.value = null
      steamAppliedPromoCode.value = null
      steamPromoDiscountPercent.value = null
      steamCheckoutModalOpen.value = false
    }
  },
)

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
})

watch(
  () => route.query.search,
  async (value) => {
    const nextQuery = normalizeRouteSearchQuery(value).trim()
    if (nextQuery === searchQuery.value.trim()) return

    searchQuery.value = nextQuery
    if (nextQuery) {
      selectedMainCategoryId.value = ''
      selectedSubCategoryId.value = ''
      subCategories.value = []
      await searchProductsByQuery(nextQuery, 1, false)
      return
    }

    if (isSearchPagination.value) {
      await resetAllFilters()
    }
  },
)

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
  await Promise.all([
    searchQuery.value ? searchProductsByQuery(searchQuery.value, 1, false) : loadProducts(),
    loadMainCategories(),
    loadOfficialHomeProducts(),
  ])
  observer = new IntersectionObserver((entries) => { if (entries[0]!.isIntersecting) loadMoreProducts() }, { rootMargin: '300px' })
  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value)
})

onBeforeUnmount(() => {
  if (filterTimeout) clearTimeout(filterTimeout)
  observer?.disconnect()
})

</script>

<template>
  <div id="catalog-start" class="scroll-mt-24"></div>

  <section class="relative w-full flex flex-col items-center">
    <div
      class="relative z-20 flex min-h-screen w-full flex-col items-center px-1 pb-6 sm:px-2 lg:px-2"
      :class="user ? 'pt-14 md:pt-20' : 'pt-14 md:pt-20'"
    >
        <TelegramStarsCta class="mt-2 w-full" :show-steam-link="HOME_STEAM_TOPUP_ENABLED" />

        <OfficialProductsShowcase
          v-if="shouldShowOfficialHomeShowcase"
          :products="officialHomeProducts"
          class="mt-2 w-full p-3"
          @product-click="goToProductByModel"
          @view-all="router.push('/official')"
        />

        <div class="mt-10 w-full sm:mt-16">
          <Title :text="t('common.categories')" />

          <transition name="home-categories-fade" mode="out-in">
            <div
              v-if="isCategoriesLoading"
              key="categories-loading"
              class="home-categories-loading-row"
              aria-hidden="true"
            >
              <div
                v-for="n in CATEGORY_PLACEHOLDER_COUNT"
                :key="`category-placeholder-${n}`"
                class="home-category-skeleton"
              >
                <div class="home-category-skeleton-thumb"></div>
                <div class="home-category-skeleton-label"></div>
              </div>
            </div>

            <div v-else key="categories-loaded" class="w-full">
              <div class="relative">
                <div
                  v-if="!areCategoriesExpanded"
                  class="w-full overflow-hidden"
                >
                  <div class="home-categories-row">
                    <button
                      v-for="cat in mainCategories"
                      :key="cat.id"
                      type="button"
                      @click="onMainCategoryClick(cat)"
                      class="home-category-button flex-shrink-0"
                    >
                      <div class="home-category-thumb">
                        <img
                          v-if="isCategoryImageAvailable(cat.id, cat.image_url)"
                          :src="resolveCategoryImageUrl(cat.image_url)"
                          class="home-category-image"
                          @error="markCategoryImageBroken(cat.id)"
                        />
                        <Folder v-else class="h-6 w-6 text-[var(--text-muted)] sm:h-8 sm:w-8" />
                      </div>
                      <span class="home-category-label mt-1.5 sm:mt-2">{{ cat.name }}</span>
                    </button>
                  </div>
                </div>

                <button
                  v-if="shouldShowCategoryExpandButton && !areCategoriesExpanded"
                  type="button"
                  class="home-category-expand-btn market-primary-surface market-primary-hover absolute right-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[rgb(var(--palette-blue-400)/0.25)] text-[var(--text-title)] ring-4 ring-[rgb(var(--palette-dark-800)/0.55)] transition disabled:cursor-default disabled:opacity-60 sm:h-12 sm:w-12"
                  :aria-expanded="areCategoriesExpanded"
                  :aria-label="areCategoriesExpanded ? t('pages.index.collapseCategories') : t('pages.index.expandCategories')"
                  :title="areCategoriesExpanded ? t('pages.index.collapseCategories') : t('pages.index.expandCategories')"
                  :disabled="isExpandingCategories"
                  @click="toggleCategoriesExpanded"
                >
                  <ChevronRight
                    class="h-5 w-5 transition-transform duration-200 sm:h-6 sm:w-6"
                    :class="areCategoriesExpanded ? 'rotate-90' : ''"
                  />
                </button>
              </div>

              <div
                v-if="areCategoriesExpanded"
                class="home-expanded-categories-grid mt-2"
              >
                <button
                  v-for="cat in mainCategories"
                  :key="cat.id"
                  type="button"
                  @click="onMainCategoryClick(cat)"
                  class="home-category-button home-expanded-category-card"
                >
                  <div class="home-category-thumb">
                    <img
                      v-if="isCategoryImageAvailable(cat.id, cat.image_url)"
                      :src="resolveCategoryImageUrl(cat.image_url)"
                      class="home-category-image"
                      @error="markCategoryImageBroken(cat.id)"
                    />
                    <Folder v-else class="h-6 w-6 text-[var(--text-muted)] sm:h-8 sm:w-8" />
                  </div>
                  <span class="home-category-label mt-1.5 sm:mt-2">
                    {{ cat.name }}
                  </span>
                </button>

                <button
                  v-if="shouldShowCategoryExpandButton"
                  type="button"
                  class="home-expanded-category-card flex w-full flex-col items-center rounded-lg p-1 text-[var(--text-title)] transition disabled:cursor-default disabled:opacity-60 sm:p-1.5"
                  :aria-expanded="areCategoriesExpanded"
                  :aria-label="t('pages.index.collapseCategories')"
                  :title="t('pages.index.collapseCategories')"
                  :disabled="isExpandingCategories"
                  @click="toggleCategoriesExpanded"
                >
                  <div class="flex h-12 w-12 items-center justify-center rounded-full border border-[rgb(var(--palette-white)/0.1)] sm:h-16 sm:w-16">
                    <ChevronRight class="h-5 w-5 rotate-270 sm:h-6 sm:w-6" />
                  </div>
                  <span class="home-category-label mt-1.5 sm:mt-2">
                    {{ t('pages.index.collapseCategoriesShort') }}
                  </span>
                </button>
              </div>
            </div>
          </transition>
        </div>

        <Title class="mt-12 w-full check-text" :text="t('common.products')" />

        <div class="mt-4 w-full">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition"
              :class="isFiltersOpen
                ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-700)/0.55)]'"
              :aria-expanded="isFiltersOpen"
              :aria-label="t('pages.index.filtersTitle')"
              :title="t('pages.index.filtersTitle')"
              @click="toggleFiltersVisibility"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span>{{ t('pages.index.filtersTitle') }}</span>
              <span
                v-if="activeProductFiltersCount > 0"
                class="inline-flex min-w-5 items-center justify-center rounded-full bg-[rgb(var(--palette-blue-600))] px-1.5 text-[11px] text-[var(--text-title)]"
              >
                {{ activeProductFiltersCount }}
              </span>
            </button>

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

          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="isFiltersOpen" class="mt-3 w-full rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.25)] p-4 md:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="preset in pricePresets"
                    :key="preset.id"
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    :class="isPricePresetActive(preset)
                      ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                      : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                    @click="onPricePresetClick(preset)"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <button
                  v-if="activeProductFiltersCount > 0"
                  type="button"
                  class="text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-title)]"
                  @click="resetProductFilters"
                >
                  {{ t('pages.index.resetFilters') }}
                </button>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="onlineSellersOnly
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  :aria-pressed="onlineSellersOnly"
                  @click="toggleOnlineSellersOnlyFilter"
                >
                  {{ t('pages.index.onlineSellersOnly') }}
                </button>

                <button
                  type="button"
                  class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="autoDeliveryOnly
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  :aria-pressed="autoDeliveryOnly"
                  @click="toggleAutoDeliveryOnlyFilter"
                >
                  {{ t('pages.index.autoDeliveryOnly') }}
                </button>

                <button
                  type="button"
                  class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="sellersWithReviewsOnly
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  :aria-pressed="sellersWithReviewsOnly"
                  @click="toggleSellersWithReviewsOnlyFilter"
                >
                  {{ t('pages.index.sellersWithReviewsOnly') }}
                </button>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5 transition focus-within:border-[rgb(var(--palette-blue-400)/0.4)] focus-within:bg-[rgb(var(--palette-dark-700)/0.55)]">
                  <span class="block text-xs text-[var(--text-muted)]">{{ t('pages.index.priceFrom') }}</span>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      v-model="minPriceFilter"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none placeholder-[var(--text-placeholder)]"
                      :placeholder="t('pages.index.priceFrom')"
                      @input="debouncedApplyProductFilters"
                    />
                    <span class="text-xs font-semibold text-[var(--text-muted)]">{{ currencySymbol }}</span>
                  </div>
                </label>

                <label class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5 transition focus-within:border-[rgb(var(--palette-blue-400)/0.4)] focus-within:bg-[rgb(var(--palette-dark-700)/0.55)]">
                  <span class="block text-xs text-[var(--text-muted)]">{{ t('pages.index.priceTo') }}</span>
                  <div class="mt-1.5 flex items-center gap-2">
                    <input
                      v-model="maxPriceFilter"
                      type="number"
                      min="0"
                      inputmode="decimal"
                      class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none placeholder-[var(--text-placeholder)]"
                      :placeholder="t('pages.index.priceTo')"
                      @input="debouncedApplyProductFilters"
                    />
                    <span class="text-xs font-semibold text-[var(--text-muted)]">{{ currencySymbol }}</span>
                  </div>
                </label>
              </div>

            </div>
          </transition>
        </div>

        <div
          v-if="isProductsLoading"
          class="mt-6 w-full"
          :class="productCardViewMode === 'grid'
            ? 'products-grid grid gap-1 md:gap-2'
            : 'products-list flex flex-col gap-2 md:gap-3'"
        >
          <div
            v-for="n in loadingSkeletonCount"
            :key="n"
            class="animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-600))]"
            :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
          />
        </div>

        <div v-else-if="products.length === 0" class="text-center text-[var(--text-muted)] py-20">
          {{ t('pages.index.noProducts') }}
        </div>

        <div
          v-else-if="productCardViewMode === 'grid'"
          class="products-grid grid gap-1 md:gap-2 mt-6 w-full"
        >
          <template v-for="(product, index) in products" :key="product.id">
            <Transition name="home-product-reveal" mode="out-in">
              <MainProductCard
                v-if="isHomeProductCardReady(product.id)"
                :key="product.id"
                :product="product"
                :style="getProductRevealDelayStyle(index)"
                @click="goToProduct"
              />
              <div
                v-else
                :key="`${product.id}-skeleton`"
                class="animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-600))] h-64"
                aria-hidden="true"
              />
            </Transition>
          </template>
        </div>

        <div
          v-else
          class="products-list mt-6 flex w-full flex-col gap-2 md:gap-3"
        >
          <template v-for="(product, index) in products" :key="product.id">
            <Transition name="home-product-reveal" mode="out-in">
              <HomeProductListCard
                v-if="isHomeProductCardReady(product.id)"
                :key="product.id"
                :product="product"
                :style="getProductRevealDelayStyle(index)"
                @click="goToProduct"
              />
              <div
                v-else
                :key="`${product.id}-skeleton`"
                class="animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-600))] h-[118px] sm:h-[134px]"
                aria-hidden="true"
              />
            </Transition>
          </template>
        </div>
    </div>

    <div ref="loadMoreTrigger" class="h-10"></div>
  </section>
</template>

<style scoped>
.products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 860px) {
  .products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1080px) {
  .products-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1320px) {
  .products-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

/* When main content switches to 50% width (2xl layout), reset density to 4 cards. */
@media (min-width: 1536px) {
  .products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1920px) {
  .products-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 2320px) {
  .products-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.steam-topup-amount-input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.steam-topup-amount-input[type='number']::-webkit-outer-spin-button,
.steam-topup-amount-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.steam-checkout-modal {
  background: var(--steam-checkout-modal-bg);
  backdrop-filter: blur(18px) saturate(115%);
  -webkit-backdrop-filter: blur(18px) saturate(115%);
  box-shadow: var(--steam-checkout-modal-inset);
}

.steam-checkout-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27none%27%3E%3Cpath d=%27M6 8l4 4 4-4%27 stroke=%27%2394a3b8%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.9rem center;
  background-size: 0.85rem 0.85rem;
}

.home-categories-fade-enter-active,
.home-categories-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.home-categories-fade-enter-from,
.home-categories-fade-leave-to {
  opacity: 0;
  transform: translateY(0.25rem);
}

.home-categories-loading-row {
  display: flex;
  min-height: 5.25rem;
  gap: 0.5rem;
  overflow: hidden;
  padding: 0.375rem 0 0.5rem;
}

.home-categories-row {
  display: flex;
  min-width: max-content;
  gap: 0.25rem;
  padding: 0.375rem 0 0.5rem;
}

.home-category-skeleton,
.home-category-button {
  display: flex;
  width: 3.75rem;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  border-radius: 0.75rem;
  padding: 0.375rem;
}

.home-category-button {
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.home-category-button:hover {
  background: rgb(var(--palette-white) / 0.035);
  transform: translateY(-1px);
}

.home-category-thumb,
.home-category-skeleton-thumb {
  display: flex;
  height: 3rem;
  width: 3rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.75rem;
  background: rgb(var(--palette-dark-700));
}

.home-category-skeleton-thumb {
  border: 1px solid rgb(var(--palette-white) / 0.06);
  box-shadow: inset 0 1px 0 rgb(var(--palette-white) / 0.04);
}

.home-category-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.home-category-skeleton-thumb,
.home-category-skeleton-label {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(
      100deg,
      rgb(var(--palette-white) / 0.035) 0%,
      rgb(var(--palette-white) / 0.095) 42%,
      rgb(var(--palette-white) / 0.035) 76%
    ),
    rgb(var(--palette-dark-700));
  background-size: 220% 100%;
  animation: home-category-shimmer 1.25s ease-in-out infinite;
}

.home-category-skeleton-label {
  margin-top: 0.55rem;
  height: 0.5rem;
  width: 2.4rem;
  border-radius: 999px;
}

@keyframes home-category-shimmer {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.home-category-label {
  display: block;
  width: 3rem;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  font-size: 0.6875rem;
  line-height: 1.15;
  font-weight: 500;
  -webkit-mask-image: linear-gradient(to right, rgb(var(--palette-black)) 0%, rgb(var(--palette-black)) 78%, transparent 100%);
  mask-image: linear-gradient(to right, rgb(var(--palette-black)) 0%, rgb(var(--palette-black)) 78%, transparent 100%);
}

.home-category-expand-btn {
  box-shadow: 0 10px 24px rgb(var(--palette-black) / 0.32);
}

.home-expanded-categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3.75rem, 1fr));
  gap: 0.25rem;
  align-items: start;
}

.home-expanded-category-card {
  max-width: 3.75rem;
  justify-self: center;
}

@media (min-width: 640px) {
  .home-categories-loading-row {
    min-height: 6.75rem;
    gap: 0.75rem;
    padding: 0.5rem 0 0.625rem;
  }

  .home-categories-row {
    gap: 0.5rem;
    padding: 0.5rem 0 0.625rem;
  }

  .home-category-skeleton,
  .home-category-button {
    width: 5rem;
    padding: 0.5rem;
  }

  .home-category-thumb,
  .home-category-skeleton-thumb {
    height: 4rem;
    width: 4rem;
  }

  .home-category-skeleton-label {
    height: 0.625rem;
    width: 3.2rem;
  }

  .home-category-label {
    width: 4rem;
    font-size: 0.75rem;
  }

  .home-expanded-categories-grid {
    grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
    gap: 0.5rem;
  }

  .home-expanded-category-card {
    max-width: 5rem;
  }
}

.check-text {
  color: #E5E7EB
}

.home-product-reveal-enter-active {
  transition: opacity 380ms ease, transform 380ms ease, filter 380ms ease;
}

.home-product-reveal-enter-from {
  opacity: 0;
  transform: translateY(9px) scale(0.98);
  filter: blur(2px);
}

.home-product-reveal-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
</style>
