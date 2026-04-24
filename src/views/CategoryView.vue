<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import ScopeVpnCta from '@/components/ScopeVpnCta.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { formatCurrencyAmount } from '@/utils/currency'
import { getCountryOptions } from '@/utils/countryOptions'
import { buildCategoryKey, buildProductKey, extractIdFromSlugKey } from '@/utils/urlKeys'
import {
  FORTNITE_ACCOUNT_BOOLEAN_FIELDS,
  FORTNITE_ACCOUNT_COUNT_FIELDS,
  FORTNITE_ACCOUNT_DATE_FIELDS,
  createEmptyFortniteAccountFilters,
  type FortniteAccountCountFieldKey,
  type FortniteAccountDateFieldKey,
  isFortniteAccountsCategory,
} from '@/utils/fortniteAccount'
import { ArrowDown, ArrowUp, BadgeCheck, ChevronLeft, ChevronRight, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-vue-next'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const category = ref<Category | null>(null)
const subcategories = ref<Category[]>([])
const selectedCategoryPath = ref<Category[]>([])
const products = ref<Product[]>([])
const officialProducts = ref<Product[]>([])
const officialProductsSourceCategory = ref<Category | null>(null)
const officialCarouselRef = ref<HTMLElement | null>(null)
const isOfficialCarouselAtStart = ref(true)
const isOfficialCarouselAtEnd = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(30)
const officialProductsPerPage = ref(14)
const isCategoryLoading = ref(true)
const isSubcategoriesLoading = ref(false)
const isProductsLoading = ref(true)
const isOfficialProductsLoading = ref(false)
const isLoadingMore = ref(false)
const isFiltersOpen = ref(false)
type ProductSortMode = 'price_desc' | 'price_asc' | 'seller_rating_desc' | 'created_at_desc' | 'seller_reviews_desc'
const priceSortOrder = ref<'desc' | 'asc' | null>(null)
const sellerRatingSortEnabled = ref(false)
const createdAtSortEnabled = ref(false)
const sellerReviewsSortEnabled = ref(false)
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid'
    ? perPage.value
    : Math.min(perPage.value, 12)
))

function sortCategoriesByActiveProductsCount(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const countDiff = (b.active_products_count ?? 0) - (a.active_products_count ?? 0)
    if (countDiff !== 0) return countDiff
    return a.name.localeCompare(b.name)
  })
}
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let productFiltersApplyTimer: ReturnType<typeof setTimeout> | null = null
const fortniteFilters = reactive(createEmptyFortniteAccountFilters())
const fortniteCountryOptions = computed(() => getCountryOptions(locale.value))
const fortniteCountrySelectOptions = computed(() => ([
  { value: '', label: t('common.all') },
  ...fortniteCountryOptions.value.map(option => ({
    value: option.code,
    label: option.label,
  })),
]))
const fortniteBooleanSelectOptions = computed(() => ([
  { value: '', label: t('common.all') },
  { value: 'true', label: t('common.fortniteAccount.booleanValues.true') },
  { value: 'false', label: t('common.fortniteAccount.booleanValues.false') },
]))
const FORTNITE_RELATIVE_DAYS_DATE_FIELDS: FortniteAccountDateFieldKey[] = [
  'last_match_date',
]
const fortniteActivityDateFields = computed(() => (
  FORTNITE_ACCOUNT_DATE_FIELDS.filter(field => (
    FORTNITE_RELATIVE_DAYS_DATE_FIELDS.includes(field.key)
  ))
))

const categoryKey = computed(() => String(route.params.categoryId ?? ''))
const requestedPathRaw = computed(() => {
  const path = route.query.path
  if (Array.isArray(path)) {
    return String(path[0] ?? '')
  }
  if (typeof path === 'string' && path.trim()) {
    return path
  }

  // Legacy single-level query support.
  const legacySubcategory = route.query.subcategory
  if (Array.isArray(legacySubcategory)) {
    return String(legacySubcategory[0] ?? '')
  }
  return String(legacySubcategory ?? '')
})

const categoryBannerUrl = computed(() => {
  return resolveCategoryImageUrl(category.value?.banner_url ?? null)
})

const breadcrumbItems = computed(() => {
  const items: Category[] = []
  if (category.value) {
    items.push(category.value)
  }
  items.push(...selectedCategoryPath.value)
  return items
})

const activeCategory = computed(() =>
  selectedCategoryPath.value[selectedCategoryPath.value.length - 1] ?? category.value
)

const shouldShowFortniteAccountFilters = computed(() => isFortniteAccountsCategory({
  parentCategory: category.value,
  subcategory: activeCategory.value?.parent_id ? activeCategory.value : null,
}))

const activeFortniteFiltersCount = computed<number>(() => (
  Object.values(fortniteFilters).reduce<number>((count, value) => {
    if (value === '' || value === null || value === undefined) {
      return count
    }
    return count + 1
  }, 0)
))
const activeSortingCount = computed(() => (
  Number(priceSortOrder.value !== null)
  + Number(sellerRatingSortEnabled.value)
  + Number(createdAtSortEnabled.value)
  + Number(sellerReviewsSortEnabled.value)
))
const activeFiltersCount = computed(() => (
  activeSortingCount.value
  + (shouldShowFortniteAccountFilters.value ? activeFortniteFiltersCount.value : 0)
))
const hasActiveFilteringCriteria = computed(() => (
  shouldShowFortniteAccountFilters.value && activeFortniteFiltersCount.value > 0
))

const shouldShowSubcategoriesBlock = computed(() =>
  Boolean(activeCategory.value && activeCategory.value.parent_id === null)
)

const shouldShowVpnCta = computed(() => {
  const candidates = [
    category.value,
    activeCategory.value,
    ...selectedCategoryPath.value,
  ]

  return candidates.some(isVpnCategoryCandidate) || isVpnTextCandidate(categoryKey.value)
})

function isVpnTextCandidate(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return false
  return /(^|[^a-z0-9])vpn([^a-z0-9]|$)/i.test(normalized) || normalized.includes('впн')
}

function isVpnCategoryCandidate(item: Category | null | undefined): boolean {
  if (!item) return false
  return [item.name, item.name_ru, item.name_en, item.slug].some(isVpnTextCandidate)
}

const shouldShowOfficialRemarketCarousel = computed(() =>
  isOfficialProductsLoading.value || officialProducts.value.length > 0
)

const officialProductsCountText = computed(() => {
  const count = officialProducts.value.length
  return `${count} ${getProductWordFormRu(count)}`
})

const officialProductsSourceText = computed(() => {
  const sourceCategory = officialProductsSourceCategory.value
  if (!sourceCategory) return ''
  return `из раздела ${sourceCategory.name}`
})

function getProductWordFormRu(count: number): string {
  const normalizedCount = Math.abs(Math.trunc(count))
  const mod10 = normalizedCount % 10
  const mod100 = normalizedCount % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}

function formatOfficialPrice(price: number): string {
  return formatCurrencyAmount(price, {
    currency: 'RUB',
    fromCurrency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function toggleAndApplyProductSort(mode: ProductSortMode) {
  if (mode === 'price_desc') {
    priceSortOrder.value = priceSortOrder.value === 'desc' ? null : 'desc'
  } else if (mode === 'price_asc') {
    priceSortOrder.value = priceSortOrder.value === 'asc' ? null : 'asc'
  } else if (mode === 'seller_rating_desc') {
    sellerRatingSortEnabled.value = !sellerRatingSortEnabled.value
  } else if (mode === 'created_at_desc') {
    createdAtSortEnabled.value = !createdAtSortEnabled.value
  } else if (mode === 'seller_reviews_desc') {
    sellerReviewsSortEnabled.value = !sellerReviewsSortEnabled.value
  }

  void applyProductFilters()
}

function isProductSortModeActive(mode: ProductSortMode): boolean {
  if (mode === 'price_desc') {
    return priceSortOrder.value === 'desc'
  }
  if (mode === 'price_asc') {
    return priceSortOrder.value === 'asc'
  }
  if (mode === 'seller_rating_desc') {
    return sellerRatingSortEnabled.value
  }
  if (mode === 'created_at_desc') {
    return createdAtSortEnabled.value
  }
  return sellerReviewsSortEnabled.value
}

function scheduleApplyProductFilters(delayMs = 250) {
  if (productFiltersApplyTimer !== null) {
    clearTimeout(productFiltersApplyTimer)
  }
  productFiltersApplyTimer = setTimeout(() => {
    productFiltersApplyTimer = null
    void applyProductFilters()
  }, delayMs)
}

function updateOfficialCarouselState() {
  const carouselElement = officialCarouselRef.value
  if (!carouselElement) {
    isOfficialCarouselAtStart.value = true
    isOfficialCarouselAtEnd.value = true
    return
  }

  const maxScrollLeft = Math.max(0, carouselElement.scrollWidth - carouselElement.clientWidth)
  const scrollLeft = Math.max(0, carouselElement.scrollLeft)
  const edgeThreshold = 8
  isOfficialCarouselAtStart.value = scrollLeft <= edgeThreshold
  isOfficialCarouselAtEnd.value = scrollLeft >= maxScrollLeft - edgeThreshold
}

function handleOfficialCarouselScroll() {
  updateOfficialCarouselState()
}

function scrollOfficialCarousel(direction: 'prev' | 'next') {
  const carouselElement = officialCarouselRef.value
  if (!carouselElement) return

  const firstCard = carouselElement.querySelector<HTMLElement>('[data-official-card]')
  const scrollStep = firstCard
    ? firstCard.offsetWidth + 16
    : Math.max(320, Math.round(carouselElement.clientWidth * 0.82))

  carouselElement.scrollBy({
    left: direction === 'next' ? scrollStep : -scrollStep,
    behavior: 'smooth',
  })

  window.setTimeout(updateOfficialCarouselState, 320)
}

function openOfficialStorePage() {
  const rootCategory = category.value
  if (!rootCategory) return

  const query: Record<string, string> = {}
  const rootCategoryKey = buildCategoryKey(rootCategory) || rootCategory.id
  if (rootCategoryKey) {
    query.gameCategoryId = rootCategoryKey
  }

  const currentActiveCategory = activeCategory.value
  const selectedSubcategoryForQuery = (
    currentActiveCategory && currentActiveCategory.parent_id !== null
      ? currentActiveCategory
      : officialProductsSourceCategory.value
  )
  if (selectedSubcategoryForQuery) {
    const subcategoryKey = buildCategoryKey(selectedSubcategoryForQuery) || selectedSubcategoryForQuery.id
    if (subcategoryKey) {
      query.subcategoryId = subcategoryKey
    }
  }

  router.push({ path: '/official', query })
}

function resolveCategoryImageUrl(imageUrl: string | null): string {
  if (!imageUrl) {
    return ''
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

function resolveProductImageUrl(product: Product): string {
  const firstImage = product.images[0]?.image_url ?? ''
  if (!firstImage) return ''
  if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
    return firstImage
  }
  return `${API_HOST}${firstImage}`
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
}

function goToProductByModel(product: Product) {
  const productKey = buildProductKey(product)
  if (!productKey) return
  goToProduct(productKey)
}

function goHome() {
  router.push('/')
}

async function redirectToNotFound() {
  if (route.name === 'notAccess') return
  await router.replace({ name: 'notAccess' })
}

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
}

function getRootCategoryKey() {
  return buildCategoryKey(category.value) || categoryKey.value
}

function normalizePathQueryValue(value: string): string {
  return value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

function splitPathQueryValue(value: string): string[] {
  const normalized = normalizePathQueryValue(value)
  if (!normalized) return []
  return normalized.split('/')
}

function findCategoryByQueryKey(categories: Category[], rawKey: string) {
  const normalizedKey = rawKey.trim()
  if (!normalizedKey) return null

  const bySlug = categories.find((item) => item.slug === normalizedKey)
  if (bySlug) return bySlug

  const extractedId = extractIdFromSlugKey(normalizedKey)
  if (extractedId) {
    const byExtractedId = categories.find((item) => item.id === extractedId)
    if (byExtractedId) return byExtractedId
  }

  return categories.find((item) => item.id === normalizedKey) ?? null
}

function getPathQueryFromState(path = selectedCategoryPath.value): string {
  return path
    .map((item) => buildCategoryKey(item) || item.id)
    .filter(Boolean)
    .join('/')
}

function getActiveCategoryFilterKey() {
  const activeCategory = selectedCategoryPath.value[selectedCategoryPath.value.length - 1]
  if (activeCategory) {
    return buildCategoryKey(activeCategory) || activeCategory.id
  }
  return getRootCategoryKey()
}

async function syncPathQueryWithState() {
  const resolvedCategoryKey = getRootCategoryKey()
  const currentPath = normalizePathQueryValue(requestedPathRaw.value)
  const nextPath = getPathQueryFromState()
  const hasLegacySubcategoryQuery = Object.prototype.hasOwnProperty.call(route.query, 'subcategory')

  if (currentPath === nextPath && !hasLegacySubcategoryQuery) {
    return
  }

  const nextQuery = { ...route.query } as Record<string, string | string[] | null | undefined>
  delete nextQuery.subcategory
  if (nextPath) {
    nextQuery.path = nextPath
  } else {
    delete nextQuery.path
  }

  await router.replace({ path: `/category/${resolvedCategoryKey}`, query: nextQuery })
}

async function resolveCategoryPath(pathSegments: string[]) {
  const resolvedPath: Category[] = []
  let parentKey = getRootCategoryKey()

  for (const segment of pathSegments) {
    const response = await categoryService.getSubcategories(parentKey, 1, 100)
    const matched = findCategoryByQueryKey(response.categories, segment)
    if (!matched) {
      return null
    }
    resolvedPath.push(matched)
    parentKey = buildCategoryKey(matched) || matched.id
  }

  return resolvedPath
}

async function loadSubcategoriesForActiveCategory() {
  isSubcategoriesLoading.value = true
  try {
    const response = await categoryService.getSubcategories(getActiveCategoryFilterKey(), 1, 100)
    subcategories.value = sortCategoriesByActiveProductsCount(response.categories)
  } finally {
    isSubcategoriesLoading.value = false
  }
}

async function applyPathFromQuery(pathRaw: string) {
  if (!category.value) return
  const requestedPath = splitPathQueryValue(pathRaw)
  const resolvedPath = await resolveCategoryPath(requestedPath)
  if (requestedPath.length > 0 && resolvedPath === null) {
    await redirectToNotFound()
    return
  }
  selectedCategoryPath.value = resolvedPath ?? []
  await loadSubcategoriesForActiveCategory()

  await Promise.all([
    loadCategoryProducts(1, false),
    loadOfficialProductsForCarousel(),
  ])
  await syncPathQueryWithState()
}

async function onSubcategoryClick(subcategory: Category) {
  selectedCategoryPath.value = [...selectedCategoryPath.value, subcategory]
  await syncPathQueryWithState()
  await Promise.all([
    loadSubcategoriesForActiveCategory(),
    loadCategoryProducts(1, false),
    loadOfficialProductsForCarousel(),
  ])
}

async function onBreadcrumbClick(index: number) {
  if (!category.value) return
  // index 0 is root category; following items are nested path entries.
  selectedCategoryPath.value = index <= 0 ? [] : selectedCategoryPath.value.slice(0, index)
  await syncPathQueryWithState()
  await Promise.all([
    loadSubcategoriesForActiveCategory(),
    loadCategoryProducts(1, false),
    loadOfficialProductsForCarousel(),
  ])
}

async function loadCategoryMeta() {
  isCategoryLoading.value = true
  category.value = await categoryService.getCategoryById(categoryKey.value)

  if (!category.value) {
    subcategories.value = []
    selectedCategoryPath.value = []
    isCategoryLoading.value = false
    await redirectToNotFound()
    return
  }

  const resolvedCategoryKey = getRootCategoryKey()
  if (resolvedCategoryKey && resolvedCategoryKey !== categoryKey.value) {
    await router.replace({
      path: `/category/${resolvedCategoryKey}`,
      query: route.query,
    })
  }
  isCategoryLoading.value = false
}

async function loadCategoryProducts(page = 1, append = false) {
  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true

  const response = await productService.getProductsByCategory(
    getActiveCategoryFilterKey(),
    page,
    perPage.value,
    {
      ...(getProductFiltersParams() ?? {}),
      excludeOfficial: true,
    },
  )
  products.value = append ? [...products.value, ...response.products] : response.products
  currentPage.value = response.currentPage
  totalPages.value = response.totalPages

  isLoadingMore.value = false
  isProductsLoading.value = false
}

async function loadOfficialProductsForCarousel() {
  const currentActiveCategory = activeCategory.value
  if (!currentActiveCategory) {
    officialProducts.value = []
    officialProductsSourceCategory.value = null
    isOfficialProductsLoading.value = false
    updateOfficialCarouselState()
    return
  }

  const sourceCategory = currentActiveCategory
  isOfficialProductsLoading.value = true
  try {
    const sourceCategoryKey = buildCategoryKey(sourceCategory) || sourceCategory.id
    const response = await productService.getProductsByCategory(
      sourceCategoryKey,
      1,
      officialProductsPerPage.value,
      { isOfficialOnly: true },
    )
    officialProducts.value = response.products
    officialProductsSourceCategory.value = response.total > 0 ? sourceCategory : null
    await nextTick()
    updateOfficialCarouselState()
  } finally {
    isOfficialProductsLoading.value = false
  }
}

async function loadCategoryPageData() {
  if (!categoryKey.value) return
  await loadCategoryMeta()
  if (!category.value) {
    products.value = []
    officialProducts.value = []
    officialProductsSourceCategory.value = null
    isProductsLoading.value = false
    return
  }
  await applyPathFromQuery(requestedPathRaw.value)
}

async function loadMoreProducts() {
  if (currentPage.value >= totalPages.value) return
  await loadCategoryProducts(currentPage.value + 1, true)
}

function getProductFiltersParams(): ProductsFilterParams | undefined {
  const filters: ProductsFilterParams = {}
  const sortStack: NonNullable<ProductsFilterParams['sortStack']> = []

  if (priceSortOrder.value === 'desc') {
    sortStack.push('price_desc')
  } else if (priceSortOrder.value === 'asc') {
    sortStack.push('price_asc')
  }
  if (sellerRatingSortEnabled.value) {
    sortStack.push('seller_rating_desc')
  }
  if (createdAtSortEnabled.value) {
    sortStack.push('created_at_desc')
  }
  if (sellerReviewsSortEnabled.value) {
    sortStack.push('seller_reviews_desc')
  }

  if (sortStack.length > 0) {
    filters.sortStack = sortStack
  }

  if (!shouldShowFortniteAccountFilters.value) {
    return Object.keys(filters).length ? filters : undefined
  }

  if (fortniteFilters.country.trim()) {
    filters.fortniteCountry = fortniteFilters.country.trim().toUpperCase()
  }
  if (fortniteFilters.can_change_email !== '') {
    filters.fortniteCanChangeEmail = fortniteFilters.can_change_email === 'true'
  }
  if (fortniteFilters.first_email !== '') {
    filters.fortniteFirstEmail = fortniteFilters.first_email === 'true'
  }
  if (fortniteFilters.email_confirmed !== '') {
    filters.fortniteEmailConfirmed = fortniteFilters.email_confirmed === 'true'
  }
  if (fortniteFilters.parental_control !== '') {
    filters.fortniteParentalControl = fortniteFilters.parental_control === 'true'
  }
  if (fortniteFilters.two_factor_enabled !== '') {
    filters.fortniteTwoFactorEnabled = fortniteFilters.two_factor_enabled === 'true'
  }
  if (fortniteFilters.registration_date_from) {
    filters.fortniteRegistrationDateFrom = fortniteFilters.registration_date_from
  }
  if (fortniteFilters.registration_date_to) {
    filters.fortniteRegistrationDateTo = fortniteFilters.registration_date_to
  }
  if (fortniteFilters.last_email_change_from) {
    filters.fortniteLastEmailChangeFrom = fortniteFilters.last_email_change_from
  }
  if (fortniteFilters.last_email_change_to) {
    filters.fortniteLastEmailChangeTo = fortniteFilters.last_email_change_to
  }
  if (fortniteFilters.last_display_name_change_from) {
    filters.fortniteLastDisplayNameChangeFrom = fortniteFilters.last_display_name_change_from
  }
  if (fortniteFilters.last_display_name_change_to) {
    filters.fortniteLastDisplayNameChangeTo = fortniteFilters.last_display_name_change_to
  }
  const lastMatchRange = buildRelativeDaysDateRange(
    fortniteFilters.last_match_date_from,
    fortniteFilters.last_match_date_to,
  )
  if (lastMatchRange.from) {
    filters.fortniteLastMatchDateFrom = lastMatchRange.from
  }
  if (lastMatchRange.to) {
    filters.fortniteLastMatchDateTo = lastMatchRange.to
  }
  if (fortniteFilters.skins_count_min !== '') {
    filters.fortniteSkinsCountMin = Number(fortniteFilters.skins_count_min)
  }
  if (fortniteFilters.skins_count_max !== '') {
    filters.fortniteSkinsCountMax = Number(fortniteFilters.skins_count_max)
  }
  if (fortniteFilters.backpacks_count_min !== '') {
    filters.fortniteBackpacksCountMin = Number(fortniteFilters.backpacks_count_min)
  }
  if (fortniteFilters.backpacks_count_max !== '') {
    filters.fortniteBackpacksCountMax = Number(fortniteFilters.backpacks_count_max)
  }
  if (fortniteFilters.pickaxes_count_min !== '') {
    filters.fortnitePickaxesCountMin = Number(fortniteFilters.pickaxes_count_min)
  }
  if (fortniteFilters.pickaxes_count_max !== '') {
    filters.fortnitePickaxesCountMax = Number(fortniteFilters.pickaxes_count_max)
  }
  if (fortniteFilters.emotes_count_min !== '') {
    filters.fortniteEmotesCountMin = Number(fortniteFilters.emotes_count_min)
  }
  if (fortniteFilters.emotes_count_max !== '') {
    filters.fortniteEmotesCountMax = Number(fortniteFilters.emotes_count_max)
  }
  if (fortniteFilters.gliders_count_min !== '') {
    filters.fortniteGlidersCountMin = Number(fortniteFilters.gliders_count_min)
  }
  if (fortniteFilters.gliders_count_max !== '') {
    filters.fortniteGlidersCountMax = Number(fortniteFilters.gliders_count_max)
  }
  if (fortniteFilters.wraps_count_min !== '') {
    filters.fortniteWrapsCountMin = Number(fortniteFilters.wraps_count_min)
  }
  if (fortniteFilters.wraps_count_max !== '') {
    filters.fortniteWrapsCountMax = Number(fortniteFilters.wraps_count_max)
  }
  if (fortniteFilters.banners_count_min !== '') {
    filters.fortniteBannersCountMin = Number(fortniteFilters.banners_count_min)
  }
  if (fortniteFilters.banners_count_max !== '') {
    filters.fortniteBannersCountMax = Number(fortniteFilters.banners_count_max)
  }
  if (fortniteFilters.sprays_count_min !== '') {
    filters.fortniteSpraysCountMin = Number(fortniteFilters.sprays_count_min)
  }
  if (fortniteFilters.sprays_count_max !== '') {
    filters.fortniteSpraysCountMax = Number(fortniteFilters.sprays_count_max)
  }
  if (fortniteFilters.exclusives_count_min !== '') {
    filters.fortniteExclusivesCountMin = Number(fortniteFilters.exclusives_count_min)
  }
  if (fortniteFilters.exclusives_count_max !== '') {
    filters.fortniteExclusivesCountMax = Number(fortniteFilters.exclusives_count_max)
  }

  return Object.keys(filters).length ? filters : undefined
}

function resetFortniteFilters() {
  Object.assign(fortniteFilters, createEmptyFortniteAccountFilters())
}

function getFortniteDateFilterValue(
  key: FortniteAccountDateFieldKey,
  bound: 'from' | 'to',
): string {
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  const value = fortniteFilters[filterKey]
  return typeof value === 'string' ? value : ''
}

function setFortniteDateFilterValue(
  key: FortniteAccountDateFieldKey,
  bound: 'from' | 'to',
  value: string,
) {
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  fortniteFilters[filterKey] = value as never
}

function isRelativeDaysDateField(key: FortniteAccountDateFieldKey): boolean {
  return FORTNITE_RELATIVE_DAYS_DATE_FIELDS.includes(key)
}

function getFortniteRelativeDaysFilterValue(
  key: FortniteAccountDateFieldKey,
  bound: 'from' | 'to',
): number | '' {
  if (!isRelativeDaysDateField(key)) return ''
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  const value = fortniteFilters[filterKey]
  if (typeof value !== 'string' || !value.trim()) return ''
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return ''
  return Math.max(0, Math.trunc(parsedValue))
}

function setFortniteRelativeDaysFilterValue(
  key: FortniteAccountDateFieldKey,
  bound: 'from' | 'to',
  value: string,
) {
  if (!isRelativeDaysDateField(key)) return
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  if (!value.trim()) {
    fortniteFilters[filterKey] = '' as never
    return
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return
  fortniteFilters[filterKey] = String(Math.max(0, Math.trunc(parsedValue))) as never
}

function setFortniteRelativeDaysFromOnlyValue(
  key: FortniteAccountDateFieldKey,
  value: string,
) {
  setFortniteRelativeDaysFilterValue(key, 'from', value)
  setFortniteRelativeDaysFilterValue(key, 'to', '')
}

function parseNonNegativeInteger(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.trunc(parsed))
}

function toApiDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateMinusDays(days: number): Date {
  const result = new Date()
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - days)
  return result
}

function buildRelativeDaysDateRange(
  fromValue: string,
  toValue: string,
): { from?: string, to?: string } {
  let minDays = parseNonNegativeInteger(fromValue)
  let maxDays = parseNonNegativeInteger(toValue)

  if (minDays === null && maxDays === null) {
    return {}
  }

  if (minDays !== null && maxDays !== null && minDays > maxDays) {
    [minDays, maxDays] = [maxDays, minDays]
  }

  const range: { from?: string, to?: string } = {}

  if (maxDays !== null) {
    range.from = toApiDateString(dateMinusDays(maxDays))
  }
  if (minDays !== null) {
    range.to = toApiDateString(dateMinusDays(minDays))
  }

  return range
}

function getFortniteCountFilterValue(
  key: FortniteAccountCountFieldKey,
  bound: 'min' | 'max',
): number | '' {
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  const value = fortniteFilters[filterKey]
  return typeof value === 'number' ? value : ''
}

function setFortniteCountFilterValue(
  key: FortniteAccountCountFieldKey,
  bound: 'min' | 'max',
  value: string,
) {
  const filterKey = `${key}_${bound}` as keyof typeof fortniteFilters
  if (!value.trim()) {
    fortniteFilters[filterKey] = '' as never
    return
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    return
  }

  fortniteFilters[filterKey] = Math.max(0, Math.trunc(parsedValue)) as never
}

async function applyProductFilters() {
  await loadCategoryProducts(1, false)
}

watch(categoryKey, async () => {
  await loadCategoryPageData()
})

watch(requestedPathRaw, async (nextValue) => {
  if (!category.value) return
  const nextPath = normalizePathQueryValue(nextValue)
  const currentPath = getPathQueryFromState()
  const hasLegacySubcategoryQuery = Object.prototype.hasOwnProperty.call(route.query, 'subcategory')
  if (nextPath === currentPath && !hasLegacySubcategoryQuery) {
    return
  }
  await applyPathFromQuery(nextValue)
})

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
})

watch(fortniteFilters, () => {
  if (!shouldShowFortniteAccountFilters.value) return
  scheduleApplyProductFilters()
}, { deep: true })

watch(shouldShowFortniteAccountFilters, (nextValue) => {
  if (nextValue) {
    return
  }

  resetFortniteFilters()
})

watch(() => officialProducts.value.length, async () => {
  await nextTick()
  updateOfficialCarouselState()
})

watch(shouldShowOfficialRemarketCarousel, async (nextValue) => {
  if (nextValue) {
    await nextTick()
    updateOfficialCarouselState()
    return
  }
  isOfficialCarouselAtStart.value = true
  isOfficialCarouselAtEnd.value = true
})

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
  await loadCategoryPageData()
  window.addEventListener('resize', updateOfficialCarouselState, { passive: true })
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMoreProducts()
    }
  }, { rootMargin: '300px' })
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
  await nextTick()
  updateOfficialCarouselState()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateOfficialCarouselState)
  if (productFiltersApplyTimer !== null) {
    clearTimeout(productFiltersApplyTimer)
    productFiltersApplyTimer = null
  }
})
</script>

<template>
  <section class="relative w-full pb-8">
    <div class="relative">
      <div v-if="isCategoryLoading" class="relative h-[252px] sm:h-[320px]">
        <div class="category-content-shell relative z-10 h-full pt-3 sm:pt-4">
          <BackButton />
          <div class="mt-3 h-[194px] animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-700)/0.7)] sm:mt-4 sm:h-[258px] sm:rounded-3xl"></div>
        </div>
      </div>
      <div v-else-if="category" class="relative h-[252px] sm:h-[320px]">
        <div class="category-content-shell relative z-10 h-full pt-3 sm:pt-4">
          <BackButton />

          <div class="relative mt-3 h-[194px] overflow-hidden rounded-2xl sm:mt-4 sm:h-[258px] sm:rounded-3xl">
            <template v-if="categoryBannerUrl">
              <img
                :src="categoryBannerUrl"
                :alt="category.name"
                class="absolute inset-0 h-full w-full object-cover scale-105 blur-xl opacity-35"
              />
              <img
                :src="categoryBannerUrl"
                :alt="category.name"
                class="absolute inset-0 h-full w-full object-cover object-center"
              />
            </template>
            <div v-else class="absolute inset-0 category-hero-fallback"></div>
            <div class="absolute inset-0 bg-[rgb(var(--palette-black)/0.42)]"></div>
            <div class="category-hero-bottom-fade"></div>

            <div class="relative z-10 flex h-full flex-col justify-end p-3 sm:p-5">
              <h1 class="category-hero-title max-w-4xl text-3xl font-semibold leading-tight text-[var(--text-title)] sm:text-5xl lg:text-6xl">
                {{ category.name }}
              </h1>

              <div
                v-if="breadcrumbItems.length"
                class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[rgb(var(--text-body-strong-rgb)/0.9)] sm:text-sm"
              >
                <button
                  type="button"
                  class="rounded px-1 py-0.5 transition hover:text-[var(--text-title)]"
                  @click="goHome"
                >
                  {{ t('common.home') }}
                </button>
                <ChevronRight class="h-3.5 w-3.5 text-[rgb(var(--text-body-rgb)/0.8)]" />
                <template v-for="(breadcrumb, index) in breadcrumbItems" :key="`${breadcrumb.id}-${index}`">
                  <button
                    type="button"
                    class="rounded px-1 py-0.5 transition"
                    :class="index === breadcrumbItems.length - 1 ? 'text-[var(--text-title)] cursor-default' : 'hover:text-[var(--text-title)]'"
                    :disabled="index === breadcrumbItems.length - 1"
                    @click="onBreadcrumbClick(index)"
                  >
                    {{ breadcrumb.name }}
                  </button>
                  <ChevronRight
                    v-if="index < breadcrumbItems.length - 1"
                    class="h-3.5 w-3.5 text-[rgb(var(--text-body-rgb)/0.8)]"
                  />
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="relative h-[252px] sm:h-[320px]">
        <div class="category-hero-bg-fullbleed absolute inset-y-0 overflow-hidden">
          <div class="absolute inset-0 category-hero-fallback"></div>
          <div class="absolute inset-0 bg-[rgb(var(--palette-black)/0.55)]"></div>
          <div class="category-hero-bottom-fade"></div>
        </div>
        <div class="category-content-shell relative z-10 h-full py-8">
          <div class="mb-3">
            <BackButton />
          </div>
          <div class="text-sm text-[var(--text-body)]">{{ t('pages.category.notFound') }}</div>
        </div>
      </div>
    </div>

    <div class="category-content-shell mt-0 sm:mt-1">
      <div
        v-if="breadcrumbItems.length && !category"
        class="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-body)] sm:text-sm"
      >
        <button
          type="button"
          class="rounded px-1 py-0.5 transition hover:text-[var(--text-title)]"
          @click="goHome"
        >
          {{ t('common.home') }}
        </button>
        <ChevronRight class="h-3.5 w-3.5 text-[var(--text-meta)]" />
        <template v-for="(breadcrumb, index) in breadcrumbItems" :key="`${breadcrumb.id}-${index}`">
          <button
            type="button"
            class="rounded px-1 py-0.5 transition"
            :class="index === breadcrumbItems.length - 1 ? 'text-[var(--text-title)] cursor-default' : 'hover:text-[var(--text-title)]'"
            :disabled="index === breadcrumbItems.length - 1"
            @click="onBreadcrumbClick(index)"
          >
            {{ breadcrumb.name }}
          </button>
          <ChevronRight
            v-if="index < breadcrumbItems.length - 1"
            class="h-3.5 w-3.5 text-[var(--text-meta)]"
          />
        </template>
      </div>

      <ScopeVpnCta v-if="shouldShowVpnCta" variant="category" />

      <div v-if="shouldShowSubcategoriesBlock">
        <Title :text="t('common.subcategories')" />
        <div v-if="isCategoryLoading || isSubcategoriesLoading" class="mt-3 flex gap-2">
          <div v-for="n in 4" :key="n" class="h-10 w-28 animate-pulse rounded-lg bg-[rgb(var(--palette-dark-600))]"></div>
        </div>
        <div v-else-if="subcategories.length" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="subcategory in subcategories"
            :key="subcategory.id"
            type="button"
            class="subcategory-pill inline-flex rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2 text-sm text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-dark-700)/0.5)]"
            @click="onSubcategoryClick(subcategory)"
          >
            <span>{{ subcategory.name }}</span>
          </button>
        </div>
        <div v-else class="mt-3 text-sm text-[var(--text-muted)]">{{ t('pages.category.noSubcategories') }}</div>
      </div>

      <div
        v-if="shouldShowOfficialRemarketCarousel"
        class="official-showcase mt-5 rounded-3xl border border-[rgb(var(--palette-white)/0.12)] p-4 sm:mt-6 sm:p-5"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--palette-blue-300)/0.7)] bg-[rgb(var(--palette-blue-500)/0.32)] px-3 py-1.5 text-sm font-semibold tracking-wide text-[var(--text-accent-strong)] shadow-[var(--official-showcase-badge-shadow)]">
              <BadgeCheck class="h-4 w-4" />
              <span>Официально от remarket</span>
            </div>
            <span class="hidden text-sm font-medium text-[rgb(var(--text-accent-strong-rgb)/0.85)] sm:inline-flex sm:items-center sm:gap-2">
              {{ officialProductsCountText }}
              <span v-if="officialProductsSourceText" class="text-[rgb(var(--text-accent-rgb)/0.85)]">{{ officialProductsSourceText }}</span>
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="official-showcase__ghost-btn !hidden sm:!inline-flex"
              @click="openOfficialStorePage"
            >
              <span>Смотреть все</span>
              <ChevronRight class="h-4 w-4" />
            </button>

            <div class="hidden items-center gap-1 rounded-full border border-[var(--official-showcase-control-border)] bg-[var(--official-showcase-control-bg)] p-1 sm:inline-flex">
              <button
                type="button"
                class="official-showcase__arrow-btn"
                :disabled="isOfficialCarouselAtStart || officialProducts.length <= 1"
                aria-label="Прокрутить влево"
                @click="scrollOfficialCarousel('prev')"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="official-showcase__arrow-btn"
                :disabled="isOfficialCarouselAtEnd || officialProducts.length <= 1"
                aria-label="Прокрутить вправо"
                @click="scrollOfficialCarousel('next')"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="mb-3 text-sm font-medium text-[rgb(var(--text-accent-strong-rgb)/0.85)] sm:hidden">
          {{ officialProductsCountText }}
          <span v-if="officialProductsSourceText" class="ml-1 text-[rgb(var(--text-accent-rgb)/0.85)]">• {{ officialProductsSourceText }}</span>
        </div>

        <div v-if="isOfficialProductsLoading" class="official-carousel flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div
            v-for="n in 7"
            :key="`official-skeleton-${n}`"
            class="h-[234px] w-[188px] shrink-0 animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-700)/0.7)] sm:h-[276px] sm:w-[232px]"
          ></div>
        </div>

        <div
          v-else-if="officialProducts.length > 0"
          class="official-carousel-wrap relative"
        >
          <div
            ref="officialCarouselRef"
            class="official-carousel flex gap-4 overflow-x-auto pb-2 pr-1 no-scrollbar snap-x snap-mandatory"
            @scroll.passive="handleOfficialCarouselScroll"
          >
            <button
              v-for="product in officialProducts"
              :key="`official-${product.id}`"
              type="button"
              data-official-card
              class="official-card group h-[234px] w-[188px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-dark-900)/0.9)] text-left transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--palette-blue-300)/0.4)] hover:bg-[rgb(var(--palette-dark-900))] sm:h-[276px] sm:w-[232px]"
              @click="goToProductByModel(product)"
            >
              <div class="official-card__media relative h-[140px] w-full overflow-hidden sm:h-[170px]">
                <img
                  v-if="resolveProductImageUrl(product)"
                  :src="resolveProductImageUrl(product)"
                  :alt="product.title"
                  class="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-xs text-[var(--text-body)]">
                  {{ t('common.noImage') }}
                </div>
                <div class="official-card__overlay absolute inset-0"></div>
              </div>
              <div class="space-y-2 px-3.5 py-3">
                <p class="official-card__price text-[1.3rem] font-bold leading-none tracking-tight text-[var(--text-accent-strong)] sm:text-[1.55rem]">
                  {{ formatOfficialPrice(product.price) }}
                </p>
                <p class="official-card__title min-h-[2.5rem] text-[0.93rem] leading-5 text-[rgb(var(--text-title-rgb)/0.95)] sm:text-[1.03rem] sm:leading-6">
                  {{ product.title }}
                </p>
              </div>
            </button>
          </div>

          <div
            class="official-carousel__edge official-carousel__edge--left"
            :class="isOfficialCarouselAtStart ? 'opacity-0' : 'opacity-100'"
          ></div>
          <div
            class="official-carousel__edge official-carousel__edge--right"
            :class="isOfficialCarouselAtEnd ? 'opacity-0' : 'opacity-100'"
          ></div>
        </div>

        <div v-else class="rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-800)/0.5)] px-4 py-3 text-sm text-[var(--text-body-strong)]">
          Официальные товары появятся после добавления админом.
        </div>

        <div class="mt-3 sm:hidden">
          <button
            type="button"
            class="official-showcase__ghost-btn w-full justify-center"
            @click="openOfficialStorePage"
          >
            <span>Смотреть все товары</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div id="category-products-section" class="mt-10">
        <Title :text="t('common.products')" />
        <div class="mt-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition"
              :class="isFiltersOpen
                ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-700)/0.55)]'"
              @click="isFiltersOpen = !isFiltersOpen"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span>{{ t('pages.index.filtersTitle') }}</span>
              <span
                v-if="activeFiltersCount > 0"
                class="inline-flex min-w-5 items-center justify-center rounded-full bg-[rgb(var(--palette-blue-600))] px-1.5 text-[11px] text-[var(--text-title)]"
              >
                {{ activeFiltersCount }}
              </span>
            </button>
          </div>

          <div
            v-if="isFiltersOpen"
            class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.25)] p-4 md:p-5"
          >
            <div class="space-y-5">
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="isProductSortModeActive('price_desc')
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  @click="toggleAndApplyProductSort('price_desc')"
                >
                  <span>{{ t('common.price') }}</span>
                  <ArrowDown class="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="isProductSortModeActive('price_asc')
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  @click="toggleAndApplyProductSort('price_asc')"
                >
                  <span>{{ t('common.price') }}</span>
                  <ArrowUp class="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="isProductSortModeActive('seller_rating_desc')
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  @click="toggleAndApplyProductSort('seller_rating_desc')"
                >
                  <span>{{ t('pages.index.sortBySellerRating') }}</span>
                  <ArrowUp class="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="isProductSortModeActive('created_at_desc')
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  @click="toggleAndApplyProductSort('created_at_desc')"
                >
                  <span>{{ t('pages.index.sortByDate') }}</span>
                  <ArrowDown class="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                  :class="isProductSortModeActive('seller_reviews_desc')
                    ? 'border-[rgb(var(--palette-blue-400)/0.4)] bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-accent)]'
                    : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]'"
                  @click="toggleAndApplyProductSort('seller_reviews_desc')"
                >
                  <span>{{ t('pages.index.sortByReviews') }}</span>
                  <ArrowUp class="h-3.5 w-3.5" />
                </button>
              </div>

              <template v-if="shouldShowFortniteAccountFilters">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5">
                    <span class="block text-xs text-[var(--text-muted)]">{{ t('common.fortniteAccount.fields.country') }}</span>
                    <div class="mt-1.5">
                      <CustomSelect
                        v-model="fortniteFilters.country"
                        :options="fortniteCountrySelectOptions"
                      />
                    </div>
                  </label>
                </div>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label
                    v-for="field in FORTNITE_ACCOUNT_BOOLEAN_FIELDS"
                    :key="field.key"
                    class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5"
                  >
                    <span class="block text-xs text-[var(--text-muted)]">{{ t(field.labelKey) }}</span>
                    <div class="mt-1.5">
                      <CustomSelect
                        v-model="fortniteFilters[field.key]"
                        :options="fortniteBooleanSelectOptions"
                      />
                    </div>
                  </label>
                </div>

                <div class="space-y-3">
                  <p class="text-sm font-semibold text-[var(--text-title)]">
                    {{ t('common.fortniteAccount.sections.activity') }}
                  </p>
                  <div class="grid gap-3 md:grid-cols-2">
                    <div
                      v-for="field in fortniteActivityDateFields"
                      :key="field.key"
                      class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5"
                    >
                      <span class="block text-xs text-[var(--text-muted)]">{{ t(field.labelKey) }}</span>
                      <div class="mt-2 grid grid-cols-1 gap-2">
                        <template v-if="isRelativeDaysDateField(field.key)">
                          <input
                            :value="getFortniteRelativeDaysFilterValue(field.key, 'from')"
                            type="number"
                            min="0"
                            step="1"
                            inputmode="numeric"
                            class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none"
                            :placeholder="t('pages.category.fromDaysPlaceholder')"
                            @input="setFortniteRelativeDaysFromOnlyValue(field.key, ($event.target as HTMLInputElement).value)"
                          />
                        </template>
                        <template v-else>
                          <input
                            :value="getFortniteDateFilterValue(field.key, 'from')"
                            type="date"
                            class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none"
                            @input="setFortniteDateFilterValue(field.key, 'from', ($event.target as HTMLInputElement).value)"
                          />
                          <input
                            :value="getFortniteDateFilterValue(field.key, 'to')"
                            type="date"
                            class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none"
                            @input="setFortniteDateFilterValue(field.key, 'to', ($event.target as HTMLInputElement).value)"
                          />
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-3">
                  <p class="text-sm font-semibold text-[var(--text-title)]">
                    {{ t('common.fortniteAccount.sections.inventory') }}
                  </p>
                  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div
                      v-for="field in FORTNITE_ACCOUNT_COUNT_FIELDS"
                      :key="field.key"
                      class="rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)] px-3 py-2.5"
                    >
                      <span class="block text-xs text-[var(--text-muted)]">{{ t(field.labelKey) }}</span>
                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <input
                          :value="getFortniteCountFilterValue(field.key, 'min')"
                          type="number"
                          min="0"
                          step="1"
                          inputmode="numeric"
                          class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none"
                          :placeholder="t('pages.category.minValue')"
                          @input="setFortniteCountFilterValue(field.key, 'min', ($event.target as HTMLInputElement).value)"
                        />
                        <input
                          :value="getFortniteCountFilterValue(field.key, 'max')"
                          type="number"
                          min="0"
                          step="1"
                          inputmode="numeric"
                          class="w-full bg-[var(--transparent)] text-sm text-[var(--text-title)] outline-none"
                          :placeholder="t('pages.category.maxValue')"
                          @input="setFortniteCountFilterValue(field.key, 'max', ($event.target as HTMLInputElement).value)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="flex justify-end">
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

        <div
          v-if="isProductsLoading"
          class="mt-6 w-full"
          :class="productCardViewMode === 'grid'
            ? 'products-grid grid gap-1 md:gap-2'
            : 'flex flex-col gap-2'"
        >
          <div
            v-for="n in loadingSkeletonCount"
            :key="n"
            class="animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-600))]"
            :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
          ></div>
        </div>
        <div
          v-else-if="products.length === 0"
          class="mt-6 flex justify-center text-center text-sm text-[var(--text-muted)]"
        >
          {{
            hasActiveFilteringCriteria
              ? t('pages.category.noProductsByFilters')
              : t('pages.category.noProducts')
          }}
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
        <div v-else class="mt-6 w-full flex flex-col gap-2">
          <HomeProductListCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            @click="goToProduct"
          />
        </div>
      </div>
    </div>

    <div ref="loadMoreTrigger" class="h-10"></div>
  </section>
</template>

<style scoped>
.category-hero-bg-fullbleed {
  left: 50%;
  width: 100vw;
  transform: translateX(-50%);
}

.category-content-shell {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.category-hero-bottom-fade {
  pointer-events: none;
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 92px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--background-color) 90%
  );
}

@media (min-width: 640px) {
  .category-content-shell {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 1024px) {
  .category-content-shell {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

.category-hero-fallback {
  background: var(--category-hero-fallback-bg);
}

.category-hero-title {
  filter: drop-shadow(var(--category-hero-title-shadow));
}

.subcategory-pill {
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.subcategory-pill:hover,
.subcategory-pill:focus-visible {
  border-color: rgb(var(--palette-blue-400) / 0.58);
  box-shadow: inset 0 0 0 1px rgb(var(--palette-blue-400) / 0.2), inset 0 0 14px rgb(var(--palette-blue-500) / 0.2);
}

.products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.official-showcase {
  background: var(--official-showcase-bg);
}

.official-showcase__ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid var(--official-showcase-control-border);
  background: var(--official-showcase-control-bg);
  padding: 0.42rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--official-showcase-control-text);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.official-showcase__ghost-btn:hover {
  border-color: var(--official-showcase-control-border-hover);
  background: var(--official-showcase-control-bg-hover);
  color: var(--text-primary-strong);
}

.official-showcase__arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.85rem;
  width: 1.85rem;
  border-radius: 9999px;
  color: var(--official-showcase-arrow-text);
  background: var(--official-showcase-arrow-bg);
  border: 1px solid var(--official-showcase-arrow-border);
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.official-showcase__arrow-btn:hover:not(:disabled) {
  color: var(--text-primary-strong);
  border-color: var(--official-showcase-arrow-border-hover);
  background: var(--official-showcase-arrow-bg-hover);
}

.official-showcase__arrow-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.official-carousel {
  scroll-behavior: smooth;
}

.official-carousel__edge {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0.5rem;
  width: 2.3rem;
  transition: opacity 180ms ease;
}

.official-carousel__edge--left {
  left: 0;
  background: var(--official-carousel-fade-left);
}

.official-carousel__edge--right {
  right: 0;
  background: var(--official-carousel-fade-right);
}

.official-card__overlay {
  background: var(--official-carousel-card-glow);
}

.official-card__price {
  white-space: nowrap;
}

.official-card__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
