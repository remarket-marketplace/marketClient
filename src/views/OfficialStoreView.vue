<script setup lang="ts">
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
const selectedRootCategory = ref<Category | null>(null)
const officialProducts = ref<Product[]>([])
const officialProductsTotal = ref(0)
const officialStoreHeroImageUrl = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(24)
const isCategoryLoading = ref(true)
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
  selectedRootCategory.value
)

const selectedRootCategoryBannerUrl = computed(() =>
  resolveCategoryBannerUrl(officialStoreHeroImageUrl.value ?? selectedRootCategory.value?.banner_url)
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
  const currentGameCategoryId = getQueryValue('gameCategoryId')

  if (currentGameCategoryId === nextGameCategoryId) {
    return
  }

  const nextQuery = { ...route.query } as Record<string, string | string[] | null | undefined>
  if (nextGameCategoryId) {
    nextQuery.gameCategoryId = nextGameCategoryId
  } else {
    delete nextQuery.gameCategoryId
  }

  delete nextQuery.subcategoryId

  isSyncingRouteQuery.value = true
  try {
    await router.replace({ path: '/official', query: nextQuery })
  } finally {
    isSyncingRouteQuery.value = false
  }
}

async function loadRootCategories() {
  const overview = await productService.getOfficialStoreOverview()
  const categories = overview?.categories ?? []
  officialStoreHeroImageUrl.value = overview?.hero_image_url ?? null
  rootCategories.value = sortCategoriesByActiveProductsCount(
    categories.filter((item) => !item.parent_id && isVisibleCategory(item)),
  )
}

async function applySelectionFromRouteQuery() {
  if (!rootCategories.value.length) {
    selectedRootCategory.value = null
    return
  }

  const gameCategoryQuery = getQueryValue('gameCategoryId')
  selectedRootCategory.value = findCategoryByQueryKey(rootCategories.value, gameCategoryQuery)
    ?? rootCategories.value[0]
    ?? null
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
  await syncRouteQueryWithSelection()
  await loadOfficialProducts(1, false)
}

async function loadMoreProducts() {
  if (!canLoadMore.value) return
  await loadOfficialProducts(currentPage.value + 1, true)
}

watch(
  () => route.query.gameCategoryId,
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
        <div class="absolute inset-0 bg-[rgb(var(--palette-black)/0.42)]"></div>
        <div class="official-page-hero-bottom-fade"></div>
      </div>
      <div class="official-page-content-shell relative z-10 flex h-full flex-col">
        <div class="pt-4 sm:pt-6">
          <BackButton />
        </div>
        <div class="mt-auto pb-4 sm:pb-5">
          <h1 class="max-w-4xl text-3xl font-semibold leading-tight text-[var(--text-title)] sm:text-5xl">
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
            class="h-11 w-40 shrink-0 animate-pulse rounded-xl bg-[rgb(var(--palette-dark-600)/0.7)]"
          ></div>
        </div>
        <div v-else-if="rootCategories.length" class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            v-for="rootCategory in rootCategories"
            :key="`official-root-category-${rootCategory.id}`"
            type="button"
            class="official-category-pill inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition"
            :class="selectedRootCategory?.id === rootCategory.id
              ? 'official-category-pill--active border-[rgb(var(--palette-blue-400)/0.55)] bg-[rgb(var(--palette-blue-600)/0.25)] text-[var(--text-title)]'
              : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.35)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-700)/0.55)] hover:text-[var(--text-title)]'"
            @click="onRootCategoryClick(rootCategory)"
          >
            <span>{{ rootCategory.name }}</span>
          </button>
        </div>

      </div>

      <div class="mt-8">
        <div class="mb-4 flex items-center justify-between gap-3">
          <Title text="Официальные товары" />
          <span class="text-sm text-[rgb(var(--text-accent-strong-rgb)/0.85)]">
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
            class="h-64 animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-600))]"
          ></div>
        </div>

        <div
          v-else-if="officialProducts.length === 0"
          class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.3)] px-4 py-6 text-center text-sm text-[var(--text-body)]"
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
            class="market-primary-surface market-primary-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--text-title)] transition"
            @click="loadMoreProducts"
          >
            Показать ещё
          </button>
        </div>

        <div v-else-if="officialProducts.length > 0" class="mt-5 text-center text-xs text-[var(--text-muted)]">
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
  background: var(--official-page-hero-fallback);
}

.official-page-hero-bottom-fade {
  pointer-events: none;
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 92px;
  background: var(--official-page-hero-bottom-fade);
}

.official-category-pill {
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease;
}

.official-category-pill:hover,
.official-category-pill:focus-visible {
  border-color: rgb(var(--palette-blue-400) / 0.58);
  box-shadow: inset 0 0 0 1px rgb(var(--palette-blue-400) / 0.2), inset 0 0 14px rgb(var(--palette-blue-500) / 0.2);
}

.official-category-pill--active {
  box-shadow: inset 0 0 0 1px rgb(var(--palette-blue-400) / 0.2), inset 0 0 12px rgb(var(--palette-blue-500) / 0.16);
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
