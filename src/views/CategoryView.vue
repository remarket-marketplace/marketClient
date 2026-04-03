<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { buildCategoryKey, extractIdFromSlugKey } from '@/utils/urlKeys'
import { ChevronRight, LayoutGrid, Rows3 } from 'lucide-vue-next'

const { t } = useI18n()
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
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const loadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid'
    ? perPage.value
    : Math.min(perPage.value, 12)
))
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

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
    if (!matched) break
    resolvedPath.push(matched)
    parentKey = buildCategoryKey(matched) || matched.id
  }

  return resolvedPath
}

async function loadSubcategoriesForActiveCategory() {
  isSubcategoriesLoading.value = true
  try {
    const response = await categoryService.getSubcategories(getActiveCategoryFilterKey(), 1, 100)
    subcategories.value = response.categories
  } finally {
    isSubcategoriesLoading.value = false
  }
}

async function applyPathFromQuery(pathRaw: string) {
  if (!category.value) return
  const requestedPath = splitPathQueryValue(pathRaw)
  selectedCategoryPath.value = await resolveCategoryPath(requestedPath)
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
            class="inline-flex items-center gap-2 rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2 text-sm text-white transition hover:bg-dark-700/50"
            @click="onSubcategoryClick(subcategory)"
          >
            <img
              v-if="subcategory.image_url"
              :src="resolveCategoryImageUrl(subcategory.image_url)"
              :alt="subcategory.name"
              class="h-5 w-5 rounded object-cover border border-dark-600/80"
            />
            <span>{{ subcategory.name }}</span>
          </button>
        </div>
        <div v-else class="mt-4 text-sm text-gray-400">{{ t('pages.category.noSubcategories') }}</div>
      </div>

      <div v-if="products.length === 0" class="mt-4 text-sm text-gray-400 flex justify-center items-center">
        {{ t('pages.category.noProducts') }}
      </div>
      <div class="mt-10" v-else>
        <Title :text="t('common.products')" />
        <div class="mt-4 flex justify-end">
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
        <div v-else-if="products.length === 0" class="mt-6 text-sm text-gray-400">
          {{ t('pages.category.noProducts') }}
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
