<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import MainProductCard from '@/components/mainProductCard.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import Title from '@/components/Title.vue'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { Folder } from 'lucide-vue-next'
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
  <section class="relative w-full flex flex-col items-center px-3 pb-10 pt-8 sm:px-4 lg:px-2">
    <div class="w-full lg:max-w-[1460px]">
      <div class="mb-3">
        <BackButton />
      </div>
      <div class="rounded-2xl border border-dark-700 bg-dark-600/35 p-4 sm:p-5">
        <div v-if="isCategoryLoading" class="h-10 w-64 animate-pulse rounded-lg bg-dark-600"></div>
        <div v-else-if="category" class="flex items-center gap-3">
          <div class="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-dark-700 bg-dark-700 flex items-center justify-center">
            <img
              v-if="category.image_url"
              :src="resolveCategoryImageUrl(category.image_url)"
              :alt="category.name"
              class="h-full w-full object-cover"
            />
            <Folder v-else class="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-white sm:text-2xl">{{ category.name }}</h1>
            <p v-if="category.description" class="mt-1 text-sm text-gray-300">{{ category.description }}</p>
          </div>
        </div>
        <div v-else class="text-sm text-gray-300">{{ t('pages.category.notFound') }}</div>
      </div>

      <div class="mt-8">
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
