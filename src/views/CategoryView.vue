<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import ScopeVpnCta from '@/components/ScopeVpnCta.vue'
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
import { BadgeCheck, ChevronLeft, ChevronRight, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-vue-next'

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
const officialSubcategoryCounts = ref<Record<string, number>>({})
const isOfficialSubcategoryCountsLoading = ref(false)
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
const fortniteFilters = reactive(createEmptyFortniteAccountFilters())
const fortniteCountryOptions = computed(() => getCountryOptions(locale.value))

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
    if (selectedCategoryPath.value.length === 0) {
      await loadOfficialCountsForSubcategories(subcategories.value)
      return
    }
  } finally {
    isSubcategoriesLoading.value = false
  }
}

async function getOfficialProductsCountForCategory(categoryValue: Category): Promise<number> {
  const categoryFilterKey = buildCategoryKey(categoryValue) || categoryValue.id
  if (!categoryFilterKey) return 0

  const response = await productService.getProductsByCategory(
    categoryFilterKey,
    1,
    1,
    { isOfficialOnly: true },
  )
  return response.total > 0 ? response.total : response.products.length
}

async function loadOfficialCountsForSubcategories(subcategoriesList: Category[]) {
  if (!subcategoriesList.length) {
    officialSubcategoryCounts.value = {}
    return
  }

  isOfficialSubcategoryCountsLoading.value = true
  try {
    const countsEntries = await Promise.all(
      subcategoriesList.map(async (subcategory) => {
        const count = await getOfficialProductsCountForCategory(subcategory)
        return [subcategory.id, count] as const
      }),
    )

    officialSubcategoryCounts.value = countsEntries.reduce<Record<string, number>>((acc, [id, count]) => {
      acc[id] = count
      return acc
    }, {})
  } finally {
    isOfficialSubcategoryCountsLoading.value = false
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

  let sourceCategory: Category | null = null
  if (currentActiveCategory.parent_id !== null) {
    const knownOfficialCount = officialSubcategoryCounts.value[currentActiveCategory.id]
    if (knownOfficialCount === 0) {
      officialProducts.value = []
      officialProductsSourceCategory.value = null
      isOfficialProductsLoading.value = false
      updateOfficialCarouselState()
      return
    }
    sourceCategory = currentActiveCategory
  } else {
    const knownCounts = officialSubcategoryCounts.value
    const missingCounts = subcategories.value.some((subcategory) => knownCounts[subcategory.id] === undefined)
    if ((Object.keys(knownCounts).length === 0 || missingCounts) && subcategories.value.length > 0) {
      await loadOfficialCountsForSubcategories(subcategories.value)
    }

    sourceCategory = subcategories.value.find((subcategory) =>
      (officialSubcategoryCounts.value[subcategory.id] ?? 0) > 0
    ) ?? null
  }

  if (!sourceCategory) {
    officialProducts.value = []
    officialProductsSourceCategory.value = null
    isOfficialProductsLoading.value = false
    updateOfficialCarouselState()
    return
  }

  isOfficialProductsLoading.value = true
  try {
    const sourceCategoryKey = buildCategoryKey(sourceCategory) || sourceCategory.id
    const response = await productService.getProductsByCategory(
      sourceCategoryKey,
      1,
      officialProductsPerPage.value,
      { isOfficialOnly: true },
    )
    officialSubcategoryCounts.value[sourceCategory.id] = response.total
    officialProducts.value = response.products
    officialProductsSourceCategory.value = sourceCategory
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
  if (!shouldShowFortniteAccountFilters.value) {
    return undefined
  }

  const filters: ProductsFilterParams = {}

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
  if (fortniteFilters.last_login_from) {
    filters.fortniteLastLoginFrom = fortniteFilters.last_login_from
  }
  if (fortniteFilters.last_login_to) {
    filters.fortniteLastLoginTo = fortniteFilters.last_login_to
  }
  if (fortniteFilters.last_display_name_change_from) {
    filters.fortniteLastDisplayNameChangeFrom = fortniteFilters.last_display_name_change_from
  }
  if (fortniteFilters.last_display_name_change_to) {
    filters.fortniteLastDisplayNameChangeTo = fortniteFilters.last_display_name_change_to
  }
  if (fortniteFilters.last_match_date_from) {
    filters.fortniteLastMatchDateFrom = fortniteFilters.last_match_date_from
  }
  if (fortniteFilters.last_match_date_to) {
    filters.fortniteLastMatchDateTo = fortniteFilters.last_match_date_to
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

async function resetAndApplyFortniteFilters() {
  resetFortniteFilters()
  await applyFortniteFilters()
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

async function applyFortniteFilters() {
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

watch(shouldShowFortniteAccountFilters, (nextValue) => {
  if (nextValue) {
    return
  }

  resetFortniteFilters()
  isFiltersOpen.value = false
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
})
</script>

<template>
  <section class="relative w-full pb-8">
    <div class="relative">
      <div v-if="isCategoryLoading" class="relative h-[252px] sm:h-[320px]">
        <div class="category-content-shell relative z-10 h-full pt-3 sm:pt-4">
          <BackButton />
          <div class="mt-3 h-[194px] animate-pulse rounded-2xl bg-dark-700/70 sm:mt-4 sm:h-[258px] sm:rounded-3xl"></div>
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
                class="absolute inset-0 h-full w-full object-cover object-[center_18%] px-0 sm:object-contain sm:object-[center_12%] sm:px-6"
              />
            </template>
            <div v-else class="absolute inset-0 category-hero-fallback"></div>
            <div class="absolute inset-0 bg-black/42"></div>
            <div class="category-hero-bottom-fade"></div>

            <div class="relative z-10 flex h-full flex-col justify-end p-3 sm:p-5">
              <h1 class="category-hero-title max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                {{ category.name }}
              </h1>

              <div
                v-if="breadcrumbItems.length"
                class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-200/90 sm:text-sm"
              >
                <button
                  type="button"
                  class="rounded px-1 py-0.5 transition hover:text-white"
                  @click="goHome"
                >
                  {{ t('common.home') }}
                </button>
                <ChevronRight class="h-3.5 w-3.5 text-gray-300/80" />
                <template v-for="(breadcrumb, index) in breadcrumbItems" :key="`${breadcrumb.id}-${index}`">
                  <button
                    type="button"
                    class="rounded px-1 py-0.5 transition"
                    :class="index === breadcrumbItems.length - 1 ? 'text-white cursor-default' : 'hover:text-white'"
                    :disabled="index === breadcrumbItems.length - 1"
                    @click="onBreadcrumbClick(index)"
                  >
                    {{ breadcrumb.name }}
                  </button>
                  <ChevronRight
                    v-if="index < breadcrumbItems.length - 1"
                    class="h-3.5 w-3.5 text-gray-300/80"
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
          <div class="absolute inset-0 bg-black/55"></div>
          <div class="category-hero-bottom-fade"></div>
        </div>
        <div class="category-content-shell relative z-10 h-full py-8">
          <div class="mb-3">
            <BackButton />
          </div>
          <div class="text-sm text-gray-300">{{ t('pages.category.notFound') }}</div>
        </div>
      </div>
    </div>

    <div class="category-content-shell mt-0 sm:mt-1">
      <div
        v-if="breadcrumbItems.length && !category"
        class="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-300 sm:text-sm"
      >
        <button
          type="button"
          class="rounded px-1 py-0.5 transition hover:text-white"
          @click="goHome"
        >
          {{ t('common.home') }}
        </button>
        <ChevronRight class="h-3.5 w-3.5 text-gray-500" />
        <template v-for="(breadcrumb, index) in breadcrumbItems" :key="`${breadcrumb.id}-${index}`">
          <button
            type="button"
            class="rounded px-1 py-0.5 transition"
            :class="index === breadcrumbItems.length - 1 ? 'text-white cursor-default' : 'hover:text-white'"
            :disabled="index === breadcrumbItems.length - 1"
            @click="onBreadcrumbClick(index)"
          >
            {{ breadcrumb.name }}
          </button>
          <ChevronRight
            v-if="index < breadcrumbItems.length - 1"
            class="h-3.5 w-3.5 text-gray-500"
          />
        </template>
      </div>

      <ScopeVpnCta v-if="shouldShowVpnCta" variant="category" />

      <div v-if="shouldShowSubcategoriesBlock">
        <Title :text="t('common.subcategories')" />
        <div v-if="isCategoryLoading || isSubcategoriesLoading" class="mt-3 flex gap-2">
          <div v-for="n in 4" :key="n" class="h-10 w-28 animate-pulse rounded-lg bg-dark-600"></div>
        </div>
        <div v-else-if="subcategories.length" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="subcategory in subcategories"
            :key="subcategory.id"
            type="button"
            class="inline-flex rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2 text-sm text-white transition hover:bg-dark-700/50"
            @click="onSubcategoryClick(subcategory)"
          >
            <span>{{ subcategory.name }}</span>
          </button>
        </div>
        <div v-else class="mt-3 text-sm text-gray-400">{{ t('pages.category.noSubcategories') }}</div>
      </div>

      <div
        v-if="shouldShowOfficialRemarketCarousel"
        class="official-showcase mt-5 rounded-3xl border border-white/12 p-4 sm:mt-6 sm:p-5"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="inline-flex items-center gap-2 rounded-full border border-blue-300/70 bg-blue-500/32 px-3 py-1.5 text-sm font-semibold tracking-wide text-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.22)_inset]">
              <BadgeCheck class="h-4 w-4" />
              <span>Официально от remarket</span>
            </div>
            <span class="hidden text-sm font-medium text-blue-100/85 sm:inline-flex sm:items-center sm:gap-2">
              {{ officialProductsCountText }}
              <span v-if="officialProductsSourceText" class="text-blue-200/85">{{ officialProductsSourceText }}</span>
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

            <div class="hidden items-center gap-1 rounded-full border border-[rgba(219,224,232,0.32)] bg-[rgba(56,61,73,0.54)] p-1 sm:inline-flex">
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

        <div class="mb-3 text-sm font-medium text-blue-100/85 sm:hidden">
          {{ officialProductsCountText }}
          <span v-if="officialProductsSourceText" class="ml-1 text-blue-200/85">• {{ officialProductsSourceText }}</span>
        </div>

        <div v-if="isOfficialProductsLoading" class="official-carousel flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div
            v-for="n in 7"
            :key="`official-skeleton-${n}`"
            class="h-[234px] w-[188px] shrink-0 animate-pulse rounded-2xl bg-dark-700/70 sm:h-[276px] sm:w-[232px]"
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
              class="official-card group h-[234px] w-[188px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/12 bg-dark-900/90 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-dark-900 sm:h-[276px] sm:w-[232px]"
              @click="goToProductByModel(product)"
            >
              <div class="official-card__media relative h-[140px] w-full overflow-hidden sm:h-[170px]">
                <img
                  v-if="resolveProductImageUrl(product)"
                  :src="resolveProductImageUrl(product)"
                  :alt="product.title"
                  class="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-xs text-gray-300">
                  {{ t('common.noImage') }}
                </div>
                <div class="official-card__overlay absolute inset-0"></div>
              </div>
              <div class="space-y-2 px-3.5 py-3">
                <p class="official-card__price text-[1.3rem] font-bold leading-none tracking-tight text-blue-100 sm:text-[1.55rem]">
                  {{ formatOfficialPrice(product.price) }}
                </p>
                <p class="official-card__title min-h-[2.5rem] text-[0.93rem] leading-5 text-white/95 sm:text-[1.03rem] sm:leading-6">
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

        <div v-else class="rounded-xl border border-white/10 bg-dark-800/50 px-4 py-3 text-sm text-gray-200">
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
          <div
            v-if="shouldShowFortniteAccountFilters"
            class="flex flex-wrap items-center justify-between gap-2"
          >
            <button
              type="button"
              class="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition"
              :class="isFiltersOpen
                ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                : 'border-dark-600 bg-dark-700/40 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55'"
              @click="isFiltersOpen = !isFiltersOpen"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span>{{ t('pages.category.fortniteFiltersTitle') }}</span>
              <span
                v-if="activeFortniteFiltersCount > 0"
                class="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] text-white"
              >
                {{ activeFortniteFiltersCount }}
              </span>
            </button>
          </div>

          <div
            v-if="shouldShowFortniteAccountFilters && isFiltersOpen"
            class="rounded-2xl border border-dark-700 bg-dark-600/25 p-4 md:p-5"
          >
            <div class="space-y-5">
              <div class="grid gap-3 md:grid-cols-2">
                <label class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5">
                  <span class="block text-xs text-gray-400">{{ t('common.fortniteAccount.fields.country') }}</span>
                  <select
                    v-model="fortniteFilters.country"
                    class="mt-1.5 w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="">{{ t('common.all') }}</option>
                    <option
                      v-for="option in fortniteCountryOptions"
                      :key="option.code"
                      :value="option.code"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label
                  v-for="field in FORTNITE_ACCOUNT_BOOLEAN_FIELDS"
                  :key="field.key"
                  class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5"
                >
                  <span class="block text-xs text-gray-400">{{ t(field.labelKey) }}</span>
                  <select
                    v-model="fortniteFilters[field.key]"
                    class="mt-1.5 w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="">{{ t('common.all') }}</option>
                    <option value="true">{{ t('common.fortniteAccount.booleanValues.true') }}</option>
                    <option value="false">{{ t('common.fortniteAccount.booleanValues.false') }}</option>
                  </select>
                </label>
              </div>

              <div class="space-y-3">
                <p class="text-sm font-semibold text-white">
                  {{ t('common.fortniteAccount.sections.activity') }}
                </p>
                <div class="grid gap-3 md:grid-cols-2">
                  <div
                    v-for="field in FORTNITE_ACCOUNT_DATE_FIELDS"
                    :key="field.key"
                    class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5"
                  >
                    <span class="block text-xs text-gray-400">{{ t(field.labelKey) }}</span>
                    <div class="mt-2 grid grid-cols-2 gap-2">
                      <input
                        :value="getFortniteDateFilterValue(field.key, 'from')"
                        type="date"
                        class="w-full bg-transparent text-sm text-white outline-none"
                        @input="setFortniteDateFilterValue(field.key, 'from', ($event.target as HTMLInputElement).value)"
                      />
                      <input
                        :value="getFortniteDateFilterValue(field.key, 'to')"
                        type="date"
                        class="w-full bg-transparent text-sm text-white outline-none"
                        @input="setFortniteDateFilterValue(field.key, 'to', ($event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <p class="text-sm font-semibold text-white">
                  {{ t('common.fortniteAccount.sections.inventory') }}
                </p>
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div
                    v-for="field in FORTNITE_ACCOUNT_COUNT_FIELDS"
                    :key="field.key"
                    class="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5"
                  >
                    <span class="block text-xs text-gray-400">{{ t(field.labelKey) }}</span>
                    <div class="mt-2 grid grid-cols-2 gap-2">
                      <input
                        :value="getFortniteCountFilterValue(field.key, 'min')"
                        type="number"
                        min="0"
                        step="1"
                        inputmode="numeric"
                        class="w-full bg-transparent text-sm text-white outline-none"
                        :placeholder="t('pages.category.minValue')"
                        @input="setFortniteCountFilterValue(field.key, 'min', ($event.target as HTMLInputElement).value)"
                      />
                      <input
                        :value="getFortniteCountFilterValue(field.key, 'max')"
                        type="number"
                        min="0"
                        step="1"
                        inputmode="numeric"
                        class="w-full bg-transparent text-sm text-white outline-none"
                        :placeholder="t('pages.category.maxValue')"
                        @input="setFortniteCountFilterValue(field.key, 'max', ($event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-dark-600 bg-dark-700/40 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-dark-500 hover:bg-dark-700/60 hover:text-white"
                  @click="resetAndApplyFortniteFilters"
                >
                  {{ t('pages.index.resetFilters') }}
                </button>
                <button
                  type="button"
                  class="market-primary-surface market-primary-hover rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
                  @click="applyFortniteFilters"
                >
                  {{ t('common.apply') }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
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
            class="animate-pulse rounded-2xl bg-dark-600"
            :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
          ></div>
        </div>
        <div
          v-else-if="products.length === 0"
          class="mt-6 flex justify-center text-center text-sm text-gray-400"
        >
          {{
            shouldShowFortniteAccountFilters && activeFortniteFiltersCount > 0
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

.products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.official-showcase {
  background:
    radial-gradient(120% 130% at 0% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 54%),
    linear-gradient(165deg, rgba(21, 23, 28, 0.94), rgba(14, 15, 19, 0.96));
}

.official-showcase__ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid rgba(219, 224, 232, 0.32);
  background: rgba(56, 61, 73, 0.54);
  padding: 0.42rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(229, 241, 255, 0.95);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.official-showcase__ghost-btn:hover {
  border-color: rgba(231, 235, 241, 0.55);
  background: rgba(70, 76, 91, 0.78);
  color: #fff;
}

.official-showcase__arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.85rem;
  width: 1.85rem;
  border-radius: 9999px;
  color: #e5f1ff;
  background: rgba(96, 103, 120, 0.26);
  border: 1px solid rgba(215, 222, 235, 0.24);
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.official-showcase__arrow-btn:hover:not(:disabled) {
  color: #fff;
  border-color: rgba(229, 235, 246, 0.54);
  background: rgba(114, 123, 145, 0.42);
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
  background: linear-gradient(to right, rgba(30, 33, 40, 0.94), rgba(30, 33, 40, 0));
}

.official-carousel__edge--right {
  right: 0;
  background: linear-gradient(to left, rgba(30, 33, 40, 0.94), rgba(30, 33, 40, 0));
}

.official-card__overlay {
  background: linear-gradient(
    to top,
    rgba(9, 15, 32, 0.24) 0%,
    rgba(9, 15, 32, 0.02) 55%,
    rgba(9, 15, 32, 0) 100%
  );
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
