<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const category = ref<Category | null>(null)
const subcategories = ref<Category[]>([])
const selectedSubcategoryId = ref('')
const products = ref<Product[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(30)
const isCategoryLoading = ref(true)
const isProductsLoading = ref(true)
const isLoadingMore = ref(false)
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const categoryId = computed(() => String(route.params.categoryId ?? ''))
const requestedSubcategoryId = computed(() => {
  const subcategory = route.query.subcategory
  if (Array.isArray(subcategory)) {
    return String(subcategory[0] ?? '')
  }
  return String(subcategory ?? '')
})

const categoryBannerUrl = computed(() => {
  return resolveCategoryImageUrl(category.value?.banner_url ?? null)
})

function resolveCategoryImageUrl(imageUrl: string | null): string {
  if (!imageUrl) {
    return ''
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

function getActiveCategoryFilterId() {
  return selectedSubcategoryId.value || categoryId.value
}

async function onSubcategoryClick(id: string) {
  if (!id) {
    return
  }

  if (selectedSubcategoryId.value === id) {
    selectedSubcategoryId.value = ''
  } else {
    selectedSubcategoryId.value = id
  }

  if (selectedSubcategoryId.value) {
    await router.replace({
      path: `/category/${categoryId.value}`,
      query: { subcategory: selectedSubcategoryId.value },
    })
  } else {
    await router.replace({
      path: `/category/${categoryId.value}`,
      query: {},
    })
  }

  await loadCategoryProducts(1, false)
}

async function loadCategoryMeta() {
  isCategoryLoading.value = true
  category.value = await categoryService.getCategoryById(categoryId.value)
  const subcategoriesResponse = await categoryService.getSubcategories(categoryId.value, 1, 100)
  subcategories.value = subcategoriesResponse.categories
  if (
    requestedSubcategoryId.value
    && subcategories.value.some((subcategory) => subcategory.id === requestedSubcategoryId.value)
  ) {
    selectedSubcategoryId.value = requestedSubcategoryId.value
  } else {
    selectedSubcategoryId.value = ''
  }
  isCategoryLoading.value = false
}

async function loadCategoryProducts(page = 1, append = false) {
  if (append && isLoadingMore.value) return
  isLoadingMore.value = append
  if (!append) isProductsLoading.value = true

  const response = await productService.getProductsByCategory(
    getActiveCategoryFilterId(),
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
  if (!categoryId.value) return
  await loadCategoryMeta()
  await loadCategoryProducts(1, false)
}

async function loadMoreProducts() {
  if (currentPage.value >= totalPages.value) return
  await loadCategoryProducts(currentPage.value + 1, true)
}

watch(categoryId, async () => {
  await loadCategoryPageData()
})

watch(requestedSubcategoryId, async (newValue) => {
  if (!newValue) {
    if (!selectedSubcategoryId.value) {
      return
    }
    selectedSubcategoryId.value = ''
    await loadCategoryProducts(1, false)
    return
  }

  if (!subcategories.value.some((subcategory) => subcategory.id === newValue)) {
    if (!selectedSubcategoryId.value) {
      return
    }
    selectedSubcategoryId.value = ''
    await loadCategoryProducts(1, false)
    return
  }

  if (selectedSubcategoryId.value === newValue) {
    return
  }

  selectedSubcategoryId.value = newValue
  await loadCategoryProducts(1, false)
})

onMounted(async () => {
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
            <h1 class="max-w-4xl text-3xl font-semibold leading-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.65)] sm:text-5xl lg:text-6xl">
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
      <div>
        <Title :text="t('common.subcategories')" />
        <div v-if="isCategoryLoading" class="mt-4 flex gap-2">
          <div v-for="n in 4" :key="n" class="h-10 w-28 animate-pulse rounded-lg bg-dark-600"></div>
        </div>
        <div v-else-if="subcategories.length" class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="subcategory in subcategories"
            :key="subcategory.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-white transition"
            :class="selectedSubcategoryId === subcategory.id
              ? 'border-blue-500 bg-blue-600/20'
              : 'border-dark-600 bg-dark-700/30 hover:bg-dark-700/50'"
            @click="onSubcategoryClick(subcategory.id)"
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

      <div class="mt-10">
        <Title :text="t('common.products')" />
        <div v-if="isProductsLoading" class="products-grid grid gap-1 md:gap-2 mt-6 w-full">
          <div v-for="n in perPage" :key="n" class="h-64 animate-pulse rounded-2xl bg-dark-600"></div>
        </div>
        <div v-else-if="products.length === 0" class="mt-6 text-sm text-gray-400">
          {{ t('pages.category.noProducts') }}
        </div>
        <div v-else class="products-grid grid gap-1 md:gap-2 mt-6 w-full">
          <MainProductCard
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
    rgba(10, 14, 22, 0) 0%,
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
  background:
    radial-gradient(120% 120% at 10% 0%, rgba(56, 189, 248, 0.25) 0%, rgba(10, 14, 22, 0.4) 45%, rgba(6, 9, 14, 0.85) 100%),
    linear-gradient(130deg, rgba(59, 130, 246, 0.2) 0%, rgba(10, 14, 22, 0.9) 62%);
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
