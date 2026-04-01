<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
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
  SteamTopUpCreatePaymentPayload,
  SteamTopUpCreateOrderPayload,
  SteamTopUpOrder,
  SteamTopUpPayOrderPayload,
  SteamTopUpService,
} from '@/validation/steamTopup/steamTopup'
import { isValidSteamTopUpAccount, normalizeSteamTopUpAccount } from '@/validation/steamTopup/steamTopup'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Folder, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-vue-next'
import { Icon } from '@iconify/vue'
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
const onlineSellersOnly = ref(false)
const autoDeliveryOnly = ref(false)
const isFiltersOpen = ref(false)
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid'
    ? perPage.value
    : Math.min(perPage.value, 12)
))
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const categorySearchResults = computed(() => {
  if (normalizedSearchQuery.value.length < 1) return []
  return searchableCategories.value
    .filter((category) => category.name.toLowerCase().includes(normalizedSearchQuery.value))
    .slice(0, 8)
})
type SteamPromoChipVariant = 'minimal' | 'neon' | 'glass'
const STEAM_PROMO_CHIP_VARIANT: SteamPromoChipVariant = 'glass'

const steamPromoChipWrapperClass = computed(() => {
  if (STEAM_PROMO_CHIP_VARIANT === 'neon') {
    return 'border-blue-400/40 bg-[#111c2e] shadow-[0_0_0_1px_rgba(96,165,250,0.15),0_10px_28px_rgba(30,64,175,0.35)] hover:border-blue-300/70 hover:bg-[#162640]'
  }
  if (STEAM_PROMO_CHIP_VARIANT === 'glass') {
    return 'border-white/15 bg-white/5 backdrop-blur-md shadow-[0_8px_26px_rgba(0,0,0,0.28)] hover:border-blue-200/40 hover:bg-white/10'
  }
  return 'border-slate-700/80 bg-[#0f1823]/85 shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:border-blue-400/45 hover:bg-[#132030]'
})

const steamPromoIconClass = computed(() => {
  if (STEAM_PROMO_CHIP_VARIANT === 'neon') {
    return 'border-blue-300/35 bg-[#0b1220] text-white'
  }
  if (STEAM_PROMO_CHIP_VARIANT === 'glass') {
    return 'border-white/20 bg-black/20 text-white'
  }
  return 'border-slate-500/40 bg-[#0b1118] text-white'
})

const steamPromoBadgeClass = computed(() => {
  if (STEAM_PROMO_CHIP_VARIANT === 'neon') {
    return 'border-blue-300/50 bg-blue-500/20 text-blue-100'
  }
  if (STEAM_PROMO_CHIP_VARIANT === 'glass') {
    return 'border-white/20 bg-white/10 text-blue-100'
  }
  return 'border-blue-400/35 bg-blue-500/10 text-blue-300'
})

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
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

const hasPriceFilter = computed(() =>
  parsePriceFilterInRub(minPriceFilter.value) !== undefined
  || parsePriceFilterInRub(maxPriceFilter.value) !== undefined,
)

const activeProductFiltersCount = computed(() =>
  Number(hasPriceFilter.value)
  + Number(onlineSellersOnly.value)
  + Number(autoDeliveryOnly.value),
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

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
}

function goToCategoryPage(category: Category) {
  const categoryKey = buildCategoryKey(category)
  if (!categoryKey) return
  router.push({ path: `/category/${categoryKey}` })
}

function goToSteamTopUpPage() {
  router.push({ path: '/steam-topup' })
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
  const amountRub = Number.parseFloat(steamQuantity.value)
  if (!Number.isFinite(amountRub) || amountRub <= 0) return null
  return {
    account: steamNormalizedAccount.value,
    amount_rub: amountRub,
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
    window.location.href = response.payment_url
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
    onlineSellersOnly: onlineSellersOnly.value,
    autoDeliveryOnly: autoDeliveryOnly.value,
  }
}

function clearProductFilters() {
  clearPriceFilters()
  onlineSellersOnly.value = false
  autoDeliveryOnly.value = false
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

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
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

        <button
          v-if="user && HOME_STEAM_TOPUP_ENABLED"
          type="button"
          class="mt-4 self-start inline-flex items-center gap-2 rounded-xl border p-2 pr-3 text-left transition"
          :class="steamPromoChipWrapperClass"
          @click="goToSteamTopUpPage"
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-inner"
              :class="steamPromoIconClass"
            >
              <Icon icon="mdi:steam" class="h-6 w-6" />
            </span>
            <span
              class="inline-flex h-6 min-w-9 items-center justify-center rounded-md border px-2 text-xs font-semibold leading-none"
              :class="steamPromoBadgeClass"
            >
              5%
            </span>
          </div>
        </button>

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
          <div class="flex flex-wrap items-center justify-between gap-2">
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
              <span
                v-if="activeProductFiltersCount > 0"
                class="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] text-white"
              >
                {{ activeProductFiltersCount }}
              </span>
            </button>

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

          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="isFiltersOpen" class="mt-3 w-full rounded-2xl border border-dark-700 bg-dark-600/25 p-4 md:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
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

                <button
                  v-if="activeProductFiltersCount > 0"
                  type="button"
                  class="text-xs font-semibold text-gray-400 transition hover:text-white"
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
                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                    : 'border-dark-600 bg-dark-700/30 text-gray-300 hover:bg-dark-700/50 hover:text-white'"
                  :aria-pressed="onlineSellersOnly"
                  @click="toggleOnlineSellersOnlyFilter"
                >
                  {{ t('pages.index.onlineSellersOnly') }}
                </button>

                <button
                  type="button"
                  class="rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="autoDeliveryOnly
                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                    : 'border-dark-600 bg-dark-700/30 text-gray-300 hover:bg-dark-700/50 hover:text-white'"
                  :aria-pressed="autoDeliveryOnly"
                  @click="toggleAutoDeliveryOnlyFilter"
                >
                  {{ t('pages.index.autoDeliveryOnly') }}
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
            class="animate-pulse rounded-2xl bg-dark-600"
            :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
          />
        </div>

        <div v-else-if="products.length === 0" class="text-center text-gray-400 py-20">
          {{ t('pages.index.noProducts') }}
        </div>

        <div
          v-else-if="productCardViewMode === 'grid'"
          class="products-grid grid gap-1 md:gap-2 mt-6 w-full"
        >
          <MainProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            @click="goToProduct"
          />
        </div>

        <div v-else class="products-list mt-6 flex w-full flex-col gap-2 md:gap-3">
          <HomeProductListCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            @click="goToProduct"
          />
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
  background: linear-gradient(
    165deg,
    rgba(39, 42, 48, 0.82) 0%,
    rgba(31, 34, 39, 0.8) 52%,
    rgba(24, 27, 31, 0.82) 100%
  );
  backdrop-filter: blur(18px) saturate(115%);
  -webkit-backdrop-filter: blur(18px) saturate(115%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
</style>
