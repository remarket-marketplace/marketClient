<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import SearchField from '@/components/SearchField.vue'
import Title from '@/components/Title.vue'
import HeroSection from '@/components/HeroSection.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { demoProductsByPlatform, type DemoProductCard, type ListingType, type PlatformKey } from '@/data/demoProducts'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

type LengthFilter = 'all' | '4' | '5' | '6+'
type PriceFilter = 'all' | 'up_to_100' | '100_1000' | 'whale'
type ProductPlatformKey = PlatformKey | 'numbers'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const platformTabs: Array<{ key: PlatformKey, labelKey: string }> = [
  { key: 'telegram', labelKey: 'pages.index.platformTabs.telegram' },
  { key: 'x', labelKey: 'pages.index.platformTabs.x' },
]

const lengthFilterOptions: Array<{ key: LengthFilter, labelKey: string }> = [
  { key: 'all', labelKey: 'pages.index.filters.lengthAll' },
  { key: '4', labelKey: 'pages.index.filters.length4' },
  { key: '5', labelKey: 'pages.index.filters.length5' },
  { key: '6+', labelKey: 'pages.index.filters.length6Plus' },
]

const typeFilterOptions: Array<{ key: 'all' | ListingType, labelKey: string }> = [
  { key: 'all', labelKey: 'pages.index.filters.typeAll' },
  { key: 'dictionary', labelKey: 'pages.index.filters.typeDictionary' },
  { key: 'crypto', labelKey: 'pages.index.filters.typeCrypto' },
  { key: 'personal', labelKey: 'pages.index.filters.typePersonal' },
]

const priceFilterOptions: Array<{ key: PriceFilter, labelKey: string }> = [
  { key: 'all', labelKey: 'pages.index.filters.priceAll' },
  { key: 'up_to_100', labelKey: 'pages.index.filters.priceUpTo100' },
  { key: '100_1000', labelKey: 'pages.index.filters.price100To1000' },
  { key: 'whale', labelKey: 'pages.index.filters.priceWhale' },
]

const selectedPlatform = ref<PlatformKey>('telegram')
const platformCategoryIds = ref<Record<PlatformKey, string | null>>({
  telegram: null,
  x: null,
})
const selectedLengthFilter = ref<LengthFilter>('all')
const selectedListingType = ref<'all' | ListingType>('all')
const selectedPriceFilter = ref<PriceFilter>('all')

const products = ref<Product[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(24)

const searchQuery = ref('')
const isProductsLoading = ref(true)
const isLoadingMore = ref(false)

const cryptoKeywords = ['crypto', 'nft', 'ton', 'defi', 'chain', 'dao', 'token']
const personalKeywords = ['name', 'личн', 'персонал', 'имя', 'first name', 'surname', 'brand me']
const dictionaryKeywords = ['dictionary', 'word', 'словар']

const hasMoreProducts = computed(() => currentPage.value < totalPages.value)
const catalogTitle = computed(() => {
  if (selectedPlatform.value === 'x') return t('pages.index.catalogTitles.x')
  return t('pages.index.catalogTitles.telegram')
})
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const demoProducts = computed(() => {
  const source = demoProductsByPlatform[selectedPlatform.value]
  const query = normalizedSearchQuery.value

  if (!query) return source

  return source.filter((item) => {
    return (
      item.title.toLowerCase().includes(query)
      || item.description.toLowerCase().includes(query)
    )
  })
})
const displayedProducts = computed<Array<Product | DemoProductCard>>(() => {
  return [...demoProducts.value, ...products.value]
})
const filteredDisplayedProducts = computed<Array<Product | DemoProductCard>>(() => {
  return displayedProducts.value.filter((item) => {
    const platform = getProductPlatform(item)
    if (platform && platform !== selectedPlatform.value) return false
    if (!matchesLengthFilter(item)) return false
    if (!matchesTypeFilter(item)) return false
    if (!matchesPriceFilter(item)) return false
    return true
  })
})
const activeFiltersCount = computed(() => {
  let count = 0
  if (selectedLengthFilter.value !== 'all') count += 1
  if (selectedListingType.value !== 'all') count += 1
  if (selectedPriceFilter.value !== 'all') count += 1
  return count
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function isDemoProduct(item: Product | DemoProductCard): item is DemoProductCard {
  return (item as DemoProductCard).is_demo === true
}

function onProductCardClick(item: Product | DemoProductCard) {
  if (isDemoProduct(item)) {
    router.push({ name: 'nickname page', params: { nicknameId: item.id } })
    return
  }
  router.push({ path: `/product/${item.id}` })
}

function detectPlatformByCategoryName(name: string): ProductPlatformKey | null {
  const normalizedName = name.toLowerCase().trim()

  if (
    normalizedName.includes('+888')
    || normalizedName.includes('888')
    || normalizedName.includes('anonymous')
    || normalizedName.includes('аноним')
    || normalizedName.includes('номер')
    || normalizedName.includes('number')
    || normalizedName.includes('phone')
  ) {
    return 'numbers'
  }

  if (
    normalizedName.includes('telegram')
    || normalizedName.includes('телеграм')
    || normalizedName.includes('тг')
  ) {
    return 'telegram'
  }

  if (
    normalizedName === 'x'
    || normalizedName.includes('twitter')
    || normalizedName.includes('твиттер')
    || normalizedName.includes('икс')
    || normalizedName.includes(' x ')
    || normalizedName.startsWith('x ')
    || normalizedName.endsWith(' x')
  ) {
    return 'x'
  }

  return null
}

function getProductPlatform(item: Product | DemoProductCard): ProductPlatformKey | null {
  if (isDemoProduct(item)) return item.platform
  return detectPlatformByCategoryName(item.category.name)
}

function normalizeAssetValue(title: string): string {
  return title
    .replace(/^@/, '')
    .replace(/\+/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

function getAssetLength(item: Product | DemoProductCard): number {
  return normalizeAssetValue(item.title).length
}

function detectListingType(item: Product | DemoProductCard): ListingType {
  if (isDemoProduct(item)) return item.listing_type

  const text = `${item.title} ${item.description} ${item.category.name}`.toLowerCase()

  if (cryptoKeywords.some((keyword) => text.includes(keyword))) return 'crypto'
  if (personalKeywords.some((keyword) => text.includes(keyword))) return 'personal'
  if (dictionaryKeywords.some((keyword) => text.includes(keyword))) return 'dictionary'

  const normalized = normalizeAssetValue(item.title)
  if (/^[a-z]+$/.test(normalized)) return 'dictionary'
  if (/^[a-z]+[._-]?[a-z]+$/.test(normalized)) return 'personal'

  return 'dictionary'
}

function matchesLengthFilter(item: Product | DemoProductCard): boolean {
  const lengthFilter = selectedLengthFilter.value
  if (lengthFilter === 'all') return true

  const length = getAssetLength(item)
  if (lengthFilter === '4') return length === 4
  if (lengthFilter === '5') return length === 5
  return length >= 6
}

function matchesTypeFilter(item: Product | DemoProductCard): boolean {
  if (selectedListingType.value === 'all') return true

  return detectListingType(item) === selectedListingType.value
}

function matchesPriceFilter(item: Product | DemoProductCard): boolean {
  if (selectedPriceFilter.value === 'all') return true

  if (selectedPriceFilter.value === 'up_to_100') return item.price <= 100
  if (selectedPriceFilter.value === '100_1000') return item.price > 100 && item.price <= 1000
  return item.price >= 10000
}

function getPlatformButtonClass(platform: PlatformKey): string {
  const isActive = selectedPlatform.value === platform

  if (isActive) return 'bg-button-main text-white'
  return 'bg-dark-900 text-gray-300 hover:bg-dark-700 hover:text-white'
}

function resetCatalogFilters() {
  selectedLengthFilter.value = 'all'
  selectedListingType.value = 'all'
  selectedPriceFilter.value = 'all'
}

async function loadPlatformCategoryIds() {
  const response = await categoryService.getAllCategories(1, 100)

  for (const category of response.categories) {
    const detectedPlatform = detectPlatformByCategoryName(category.name)

    if (detectedPlatform !== 'numbers' && detectedPlatform && !platformCategoryIds.value[detectedPlatform]) {
      platformCategoryIds.value[detectedPlatform] = category.id
    }
  }
}

function getActivePlatformCategoryId(): string | undefined {
  return platformCategoryIds.value[selectedPlatform.value] ?? undefined
}

async function fetchProducts(page = 1, append = false) {
  if (append && isLoadingMore.value) return

  if (append) {
    isLoadingMore.value = true
  } else {
    isProductsLoading.value = true
  }

  const query = searchQuery.value.trim()
  const platformCategoryId = getActivePlatformCategoryId()

  let response: {
    products: Product[]
    currentPage: number
    totalPages: number
    total: number
  }

  if (query) {
    response = await productService.searchProducts(
      query,
      page,
      perPage.value,
      undefined,
      platformCategoryId,
    )
  } else if (platformCategoryId) {
    response = await productService.getProductsByCategory(
      platformCategoryId,
      page,
      perPage.value,
    )
  } else {
    response = await productService.getAllProducts(page, perPage.value)
  }

  products.value = append ? [...products.value, ...response.products] : response.products
  currentPage.value = response.currentPage
  totalPages.value = response.totalPages

  isLoadingMore.value = false
  isProductsLoading.value = false
}

async function onPlatformSwitch(platform: PlatformKey) {
  if (selectedPlatform.value === platform) return
  selectedPlatform.value = platform
  await fetchProducts(1, false)
}

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchProducts(1, false)
  }, 300)
}

async function loadMoreProducts() {
  if (!hasMoreProducts.value || isLoadingMore.value) return
  await fetchProducts(currentPage.value + 1, true)
}

onMounted(async () => {
  await loadPlatformCategoryIds()
  await fetchProducts(1, false)
})

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<template>
  <HeroSection
    v-if="!user"
    :selected-platform="selectedPlatform"
    @platform-change="onPlatformSwitch"
  />

  <div id="catalog-start" class="scroll-mt-24"></div>

  <section class="w-full pb-16 md:pb-10">
    <div class="mx-auto flex w-full flex-col gap-6 py-6">
      <SearchField
        v-model="searchQuery"
        :placeholder="$t('pages.index.searchPlaceholder')"
        @search-change="debouncedSearch"
        class="w-full"
      />

      <div class="rounded-2xl border border-dark-700 bg-dark-800/60 p-2">
        <div class="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          {{ t('pages.index.platformTabsTitle') }}
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            v-for="tab in platformTabs"
            :key="tab.key"
            type="button"
            class="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            :class="getPlatformButtonClass(tab.key)"
            @click="onPlatformSwitch(tab.key)"
          >
            {{ t(tab.labelKey) }}
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-dark-700 bg-dark-800/60 p-4">
        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            {{ t('pages.index.filters.smartTitle') }}
          </p>

          <button
            v-if="activeFiltersCount > 0"
            type="button"
            class="rounded-lg border border-dark-600 bg-dark-900 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-dark-500 hover:text-white"
            @click="resetCatalogFilters"
          >
            {{ t('pages.index.resetFilters') }}
          </button>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              {{ t('pages.index.filters.lengthTitle') }}
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="option in lengthFilterOptions"
                :key="option.key"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="selectedLengthFilter === option.key
                  ? 'bg-sky-600 text-white'
                  : 'bg-dark-900 text-gray-300 hover:bg-dark-700 hover:text-white'"
                @click="selectedLengthFilter = option.key"
              >
                {{ t(option.labelKey) }}
              </button>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              {{ t('pages.index.filters.typeTitle') }}
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="option in typeFilterOptions"
                :key="option.key"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="selectedListingType === option.key
                  ? 'bg-sky-600 text-white'
                  : 'bg-dark-900 text-gray-300 hover:bg-dark-700 hover:text-white'"
                @click="selectedListingType = option.key"
              >
                {{ t(option.labelKey) }}
              </button>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              {{ t('pages.index.filters.priceTitle') }}
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="option in priceFilterOptions"
                :key="option.key"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="selectedPriceFilter === option.key
                  ? 'bg-sky-600 text-white'
                  : 'bg-dark-900 text-gray-300 hover:bg-dark-700 hover:text-white'"
                @click="selectedPriceFilter = option.key"
              >
                {{ t(option.labelKey) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <Title class="w-full" :text="catalogTitle" />
        <span class="hidden whitespace-nowrap rounded-full border border-dark-600 bg-dark-900 px-3 py-1 text-xs font-semibold text-gray-300 sm:inline-flex">
          {{ t('pages.index.filteredCount', { count: filteredDisplayedProducts.length }) }}
        </span>
      </div>

      <div v-if="isProductsLoading" class="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        <div v-for="skeleton in perPage" :key="skeleton" class="h-64 animate-pulse rounded-2xl bg-dark-700" />
      </div>

      <div
        v-else-if="filteredDisplayedProducts.length === 0"
        class="rounded-2xl border border-dark-700 bg-dark-800/60 py-16 text-center text-gray-400"
      >
        {{ t('pages.index.noProducts') }}
      </div>

      <div v-else class="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        <MainProductCard
          v-for="product in filteredDisplayedProducts"
          :key="product.id"
          :product="product"
          @click="onProductCardClick"
        />
      </div>

      <div v-if="hasMoreProducts" class="flex justify-center pt-2">
        <button
          type="button"
          :disabled="isLoadingMore"
          class="rounded-xl bg-button-main px-6 py-3 text-sm font-semibold text-white transition hover:bg-button-main/90 disabled:cursor-not-allowed disabled:opacity-60"
          @click="loadMoreProducts"
        >
          {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </section>
</template>
