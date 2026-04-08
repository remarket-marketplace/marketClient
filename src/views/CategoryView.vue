<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import type { ProductsFilterParams } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getCountryOptions } from '@/utils/countryOptions'
import { buildCategoryKey, extractIdFromSlugKey } from '@/utils/urlKeys'
import {
  FORTNITE_ACCOUNT_BOOLEAN_FIELDS,
  FORTNITE_ACCOUNT_COUNT_FIELDS,
  FORTNITE_ACCOUNT_DATE_FIELDS,
  createEmptyFortniteAccountFilters,
  type FortniteAccountCountFieldKey,
  type FortniteAccountDateFieldKey,
  isFortniteAccountsCategory,
} from '@/utils/fortniteAccount'
import { ChevronRight, LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-vue-next'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const category = ref<Category | null>(null)
const subcategories = ref<Category[]>([])
const selectedCategoryPath = ref<Category[]>([])
const products = ref<Product[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(30)
const isCategoryLoading = ref(true)
const isSubcategoriesLoading = ref(false)
const isProductsLoading = ref(true)
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

function resolveCategoryImageUrl(imageUrl: string | null): string {
  if (!imageUrl) {
    return ''
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
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
  await Promise.all([
    loadSubcategoriesForActiveCategory(),
    loadCategoryProducts(1, false),
  ])
  await syncPathQueryWithState()
}

async function onSubcategoryClick(subcategory: Category) {
  selectedCategoryPath.value = [...selectedCategoryPath.value, subcategory]
  await syncPathQueryWithState()
  await Promise.all([
    loadSubcategoriesForActiveCategory(),
    loadCategoryProducts(1, false),
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
    getProductFiltersParams(),
  )
  products.value = append ? [...products.value, ...response.products] : response.products
  currentPage.value = response.currentPage
  totalPages.value = response.totalPages

  isLoadingMore.value = false
  isProductsLoading.value = false
}

async function loadCategoryPageData() {
  if (!categoryKey.value) return
  await loadCategoryMeta()
  if (!category.value) {
    products.value = []
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

onMounted(async () => {
  restoreProductCardViewModeFromStorage()
  await loadCategoryPageData()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMoreProducts()
    }
  }, { rootMargin: '300px' })
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <section class="relative w-full pb-10">
    <div class="relative">
      <div v-if="isCategoryLoading" class="relative h-[336px] sm:h-[432px]">
        <div class="category-hero-bg-fullbleed absolute inset-y-0 overflow-hidden animate-pulse bg-dark-700/70"></div>
      </div>
      <div v-else-if="category" class="relative h-[336px] sm:h-[432px]">
        <div class="category-hero-bg-fullbleed absolute inset-y-0 overflow-hidden">
          <img
            v-if="categoryBannerUrl"
            :src="categoryBannerUrl"
            :alt="category.name"
            class="absolute inset-0 h-full w-full object-cover"
          />
          <div v-else class="absolute inset-0 category-hero-fallback"></div>
          <div class="absolute inset-0 bg-black/55"></div>
          <div class="category-hero-bottom-fade"></div>
        </div>
        <div class="category-content-shell relative z-10 flex h-full flex-col">
          <div class="pt-6 sm:pt-8">
            <BackButton />
          </div>
          <div class="mt-auto pb-6 sm:pb-7">
            <h1 class="category-hero-title max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              {{ category.name }}
            </h1>
          </div>
        </div>
      </div>
      <div v-else class="relative h-[336px] sm:h-[432px]">
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

    <div class="category-content-shell mt-8">
      <div
        v-if="breadcrumbItems.length"
        class="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-gray-300 sm:text-sm"
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

      <div v-if="shouldShowSubcategoriesBlock">
        <Title :text="t('common.subcategories')" />
        <div v-if="isCategoryLoading || isSubcategoriesLoading" class="mt-4 flex gap-2">
          <div v-for="n in 4" :key="n" class="h-10 w-28 animate-pulse rounded-lg bg-dark-600"></div>
        </div>
        <div v-else-if="subcategories.length" class="mt-4 flex flex-wrap gap-2">
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
        <div v-else class="mt-4 text-sm text-gray-400">{{ t('pages.category.noSubcategories') }}</div>
      </div>

      <div class="mt-10">
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
