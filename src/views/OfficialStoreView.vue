<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { buildCategoryKey, extractIdFromSlugKey } from '@/utils/urlKeys'
import { ChevronRight } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const rootCategories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedRootCategory = ref<Category | null>(null)
const selectedSubcategory = ref<Category | null>(null)
const officialProducts = ref<Product[]>([])
const officialProductsTotal = ref(0)
const officialProductsCountByCategoryId = ref<Record<string, number>>({})
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(24)
const isCategoryLoading = ref(true)
const isSubcategoriesLoading = ref(false)
const isProductsLoading = ref(true)
const isLoadingMore = ref(false)
const isSyncingRouteQuery = ref(false)

function isVisibleCategory(category: Category): boolean {
  return category.is_active
}

function sortCategoriesByActiveProductsCount(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const countDiff = (b.active_products_count ?? 0) - (a.active_products_count ?? 0)
    if (countDiff !== 0) return countDiff
    return a.name.localeCompare(b.name)
  })
}

function getCategoryFilterKey(category: Category | null | undefined): string {
  if (!category) return ''
  return buildCategoryKey(category) || category.id
}

async function getOfficialProductsCountForCategory(categoryValue: Category): Promise<number> {
  const cachedCount = officialProductsCountByCategoryId.value[categoryValue.id]
  if (cachedCount !== undefined) return cachedCount

  const categoryFilterKey = getCategoryFilterKey(categoryValue)
  if (!categoryFilterKey) return 0

  const response = await productService.getProductsByCategory(
    categoryFilterKey,
    1,
    1,
    { isOfficialOnly: true },
  )
  const count = response.total > 0 ? response.total : response.products.length
  officialProductsCountByCategoryId.value = {
    ...officialProductsCountByCategoryId.value,
    [categoryValue.id]: count,
  }
  return count
}

async function filterCategoriesWithOfficialProducts(categories: Category[]): Promise<Category[]> {
  if (!categories.length) return []

  const countsById = await Promise.all(
    categories.map(async (category) => {
      const count = await getOfficialProductsCountForCategory(category)
      return [category.id, count] as const
    }),
  )

  const hasOfficialById = countsById.reduce<Record<string, boolean>>((acc, [id, count]) => {
    acc[id] = count > 0
    return acc
  }, {})

  return categories.filter((category) => hasOfficialById[category.id])
}

function normalizeQueryValue(value: unknown): string {
  return String(value ?? '').trim()
}

function getQueryValue(name: string): string {
  const rawValue = route.query[name]
  if (Array.isArray(rawValue)) {
    return normalizeQueryValue(rawValue[0])
  }
  return normalizeQueryValue(rawValue)
}

function findCategoryByQueryKey(categories: Category[], rawKey: string): Category | null {
  const normalizedKey = normalizeQueryValue(rawKey)
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

function resolveCategoryBannerUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

const selectedCategoryForProducts = computed<Category | null>(() =>
  selectedSubcategory.value ?? selectedRootCategory.value
)

const selectedRootCategoryBannerUrl = computed(() =>
  resolveCategoryBannerUrl(selectedRootCategory.value?.banner_url)
)

const officialProductsCountText = computed(() => {
  const total = officialProductsTotal.value
  return `${total} ${getProductWordFormRu(total)}`
})

const canLoadMore = computed(() =>
  currentPage.value < totalPages.value && !isProductsLoading.value && !isLoadingMore.value
)

function getProductWordFormRu(count: number): string {
  const normalizedCount = Math.abs(Math.trunc(count))
  const mod10 = normalizedCount % 10
  const mod100 = normalizedCount % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push({ path: `/product/${productKey}` })
}

function goHome() {
  router.push('/')
}

async function syncRouteQueryWithSelection() {
  const nextGameCategoryId = getCategoryFilterKey(selectedRootCategory.value)
  const nextSubcategoryId = getCategoryFilterKey(selectedSubcategory.value)
  const currentGameCategoryId = getQueryValue('gameCategoryId')
  const currentSubcategoryId = getQueryValue('subcategoryId')

  if (
    currentGameCategoryId === nextGameCategoryId
    && currentSubcategoryId === nextSubcategoryId
  ) {
    return
  }

  const nextQuery = { ...route.query } as Record<string, string | string[] | null | undefined>
  if (nextGameCategoryId) {
    nextQuery.gameCategoryId = nextGameCategoryId
  } else {
    delete nextQuery.gameCategoryId
  }

  if (nextSubcategoryId) {
    nextQuery.subcategoryId = nextSubcategoryId
  } else {
    delete nextQuery.subcategoryId
  }

  isSyncingRouteQuery.value = true
  try {
    await router.replace({ path: '/official', query: nextQuery })
  } finally {
    isSyncingRouteQuery.value = false
  }
}

async function loadRootCategories() {
  const categories = await categoryService.getAllCategoriesFlat(100, 30)
  const visibleRootCategories = sortCategoriesByActiveProductsCount(
    categories.filter((item) => !item.parent_id && isVisibleCategory(item)),
  )
  const officialRootCategories = await filterCategoriesWithOfficialProducts(visibleRootCategories)
  rootCategories.value = sortCategoriesByActiveProductsCount(officialRootCategories)
}

async function loadSubcategoriesForRootCategory() {
  if (!selectedRootCategory.value) {
    subcategories.value = []
    return
  }

  isSubcategoriesLoading.value = true
  try {
    const response = await categoryService.getSubcategories(
      getCategoryFilterKey(selectedRootCategory.value),
      1,
      100,
    )
    const visibleSubcategories = sortCategoriesByActiveProductsCount(
      response.categories.filter(isVisibleCategory),
    )
    subcategories.value = await filterCategoriesWithOfficialProducts(visibleSubcategories)
  } finally {
    isSubcategoriesLoading.value = false
  }
}

async function applySelectionFromRouteQuery() {
  if (!rootCategories.value.length) {
    selectedRootCategory.value = null
    selectedSubcategory.value = null
    subcategories.value = []
    return
  }

  const gameCategoryQuery = getQueryValue('gameCategoryId')
  selectedRootCategory.value = findCategoryByQueryKey(rootCategories.value, gameCategoryQuery)
    ?? rootCategories.value[0]
    ?? null

  await loadSubcategoriesForRootCategory()

  const subcategoryQuery = getQueryValue('subcategoryId')
  selectedSubcategory.value = findCategoryByQueryKey(subcategories.value, subcategoryQuery)
}

async function loadOfficialProducts(page = 1, append = false) {
  const targetCategory = selectedCategoryForProducts.value
  if (!targetCategory) {
    officialProducts.value = []
    officialProductsTotal.value = 0
    currentPage.value = 1
    totalPages.value = 1
    isProductsLoading.value = false
    return
  }

  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true

  try {
    const response = await productService.getProductsByCategory(
      getCategoryFilterKey(targetCategory),
      page,
      perPage.value,
      { isOfficialOnly: true },
    )
    officialProducts.value = append
      ? [...officialProducts.value, ...response.products]
      : response.products
    officialProductsTotal.value = response.total
    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
  } finally {
    isLoadingMore.value = false
    isProductsLoading.value = false
  }
}

async function loadOfficialStorePageData() {
  isCategoryLoading.value = true
  await loadRootCategories()
  await applySelectionFromRouteQuery()
  await syncRouteQueryWithSelection()
  isCategoryLoading.value = false
  await loadOfficialProducts(1, false)
}

async function onRootCategoryClick(category: Category) {
  if (selectedRootCategory.value?.id === category.id) return
  selectedRootCategory.value = category
  selectedSubcategory.value = null
  await loadSubcategoriesForRootCategory()
  await syncRouteQueryWithSelection()
  await loadOfficialProducts(1, false)
}

async function onSubcategoryClick(subcategory: Category | null) {
  if (selectedSubcategory.value?.id === subcategory?.id) return
  selectedSubcategory.value = subcategory
  await syncRouteQueryWithSelection()
  await loadOfficialProducts(1, false)
}

async function loadMoreProducts() {
  if (!canLoadMore.value) return
  await loadOfficialProducts(currentPage.value + 1, true)
}

watch(
  () => [route.query.gameCategoryId, route.query.subcategoryId],
  async () => {
    if (isSyncingRouteQuery.value || !rootCategories.value.length) return
    await applySelectionFromRouteQuery()
    await loadOfficialProducts(1, false)
  },
)

onMounted(async () => {
  await loadOfficialStorePageData()
})
</script>

<template>
  <section class="relative w-full pb-12">
    <div class="relative h-[220px] sm:h-[248px] lg:h-[286px]">
      <div class="official-page-hero-bg-fullbleed absolute inset-y-0 overflow-hidden">
        <template v-if="selectedRootCategoryBannerUrl">
          <img
            :src="selectedRootCategoryBannerUrl"
            :alt="selectedRootCategory?.name ?? 'Official remarket'"
            class="absolute inset-0 h-full w-full object-cover scale-105 blur-xl opacity-35"
          />
          <img
            :src="selectedRootCategoryBannerUrl"
            :alt="selectedRootCategory?.name ?? 'Official remarket'"
            class="absolute inset-0 h-full w-full object-cover object-[center_18%] px-0 sm:object-contain sm:object-[center_12%] sm:px-6"
          />
        </template>
        <div v-else class="absolute inset-0 official-page-hero-fallback"></div>
        <div class="absolute inset-0 bg-black/42"></div>
        <div class="official-page-hero-bottom-fade"></div>
      </div>
      <div class="official-page-content-shell relative z-10 flex h-full flex-col">
        <div class="pt-4 sm:pt-6">
          <BackButton />
        </div>
        <div class="mt-auto pb-4 sm:pb-5">
          <h1 class="max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
            Официальный магазин remarket
          </h1>
        </div>
      </div>
    </div>

    <div class="official-page-content-shell mt-1 sm:mt-2">

      <div class="space-y-3">
        <div
          v-if="isCategoryLoading"
          class="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          <div
            v-for="n in 6"
            :key="`official-root-category-skeleton-${n}`"
            class="h-11 w-40 shrink-0 animate-pulse rounded-xl bg-dark-600/70"
          ></div>
        </div>
        <div v-else-if="rootCategories.length" class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            v-for="rootCategory in rootCategories"
            :key="`official-root-category-${rootCategory.id}`"
            type="button"
            class="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition"
            :class="selectedRootCategory?.id === rootCategory.id
              ? 'border-blue-400/55 bg-blue-600/25 text-white'
              : 'border-dark-600 bg-dark-700/35 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55 hover:text-white'"
            @click="onRootCategoryClick(rootCategory)"
          >
            <span>{{ rootCategory.name }}</span>
          </button>
        </div>

        <div
          v-if="selectedRootCategory"
          class="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          <div
            v-if="isSubcategoriesLoading"
            class="flex gap-2"
          >
            <div
              v-for="n in 4"
              :key="`official-subcategory-skeleton-${n}`"
              class="h-10 w-32 shrink-0 animate-pulse rounded-xl bg-dark-600/70"
            ></div>
          </div>

          <template v-else>
          <button
            type="button"
            class="inline-flex shrink-0 items-center rounded-xl border px-3.5 py-2 text-sm font-medium transition"
            :class="!selectedSubcategory
              ? 'border-blue-400/55 bg-blue-600/25 text-white'
              : 'border-dark-600 bg-dark-700/35 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55 hover:text-white'"
            @click="onSubcategoryClick(null)"
          >
            Все разделы
          </button>

          <button
            v-for="subcategory in subcategories"
            :key="`official-subcategory-${subcategory.id}`"
            type="button"
            class="inline-flex shrink-0 items-center rounded-xl border px-3.5 py-2 text-sm font-medium transition"
            :class="selectedSubcategory?.id === subcategory.id
              ? 'border-blue-400/55 bg-blue-600/25 text-white'
              : 'border-dark-600 bg-dark-700/35 text-gray-300 hover:border-dark-500 hover:bg-dark-700/55 hover:text-white'"
            @click="onSubcategoryClick(subcategory)"
          >
            {{ subcategory.name }}
          </button>
          </template>
        </div>
      </div>

      <div class="mt-8">
        <div class="mb-4 flex items-center justify-between gap-3">
          <Title text="Официальные товары" />
          <span class="text-sm text-blue-100/85">
            {{ officialProductsCountText }}
          </span>
        </div>

        <div
          v-if="isProductsLoading"
          class="official-products-grid grid gap-2"
        >
          <div
            v-for="n in perPage"
            :key="`official-product-skeleton-${n}`"
            class="h-64 animate-pulse rounded-2xl bg-dark-600"
          ></div>
        </div>

        <div
          v-else-if="officialProducts.length === 0"
          class="rounded-2xl border border-dark-700 bg-dark-700/30 px-4 py-6 text-center text-sm text-gray-300"
        >
          По выбранным параметрам пока нет официальных товаров.
        </div>

        <div
          v-else
          class="official-products-grid grid gap-2"
        >
          <MainProductCard
            v-for="product in officialProducts"
            :key="`official-product-${product.id}`"
            :product="product"
            @click="goToProduct"
          />
        </div>

        <div v-if="canLoadMore" class="mt-6 flex justify-center">
          <button
            type="button"
            class="market-primary-surface market-primary-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
            @click="loadMoreProducts"
          >
            Показать ещё
          </button>
        </div>

        <div v-else-if="officialProducts.length > 0" class="mt-5 text-center text-xs text-gray-400">
          Показаны все товары в выбранном разделе.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.official-page-hero-bg-fullbleed {
  left: 50%;
  width: 100vw;
  transform: translateX(-50%);
}

.official-page-content-shell {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.official-page-hero-fallback {
  background:
    radial-gradient(100% 120% at 0% 0%, rgba(56, 105, 255, 0.35) 0%, rgba(56, 105, 255, 0.03) 60%),
    linear-gradient(135deg, rgba(18, 47, 116, 0.82), rgba(14, 33, 74, 0.8));
}

.official-page-hero-bottom-fade {
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

.official-products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .official-page-content-shell {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 680px) {
  .official-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .official-products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1360px) {
  .official-products-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
