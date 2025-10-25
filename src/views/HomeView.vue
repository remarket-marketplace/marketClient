<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import CustomSelect from '@/components/CustomSelect.vue'
import MainProductCard from '@/components/mainProductCard.vue'
import SearchField from '@/components/SearchField.vue'
import router from '@/router'
import type { Category } from '@/validation/category/category'
import type { Product } from '@/validation/product/product'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Типы
interface MainCategory {
  id: string
  name: string
}

// Данные
const mainCategories = ref<MainCategory[]>([])
const selectedMainCategoryId = ref<string>('')

const categories = ref<Category[]>([])
const selectedCategoryFilter = ref<string>('')

const fullProducts = ref<Product[]>([])
const products = ref<Product[]>([])
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = ref(30)
const searchQuery = ref('')
const isLoadingMore = ref(false)

const isServerPagination = ref(true)

const isMobile = ref(false)

// Навигация к продукту
function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

// ===== Поиск =====
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    currentPage.value = 1
    if (searchQuery.value.trim()) {
      let searchResults: Product[] = await productService.searchProducts(searchQuery.value.trim())
      if (selectedMainCategoryId.value && !selectedCategoryFilter.value) {
        const subIds = categories.value.map(c => c.id)
        searchResults = searchResults.filter(
          (p: Product) => p.category.id === selectedMainCategoryId.value || subIds.includes(p.category.id),
        )
      }
      else if (selectedCategoryFilter.value) {
        searchResults = searchResults.filter((p: Product) => p.category.id === selectedCategoryFilter.value)
      }
      fullProducts.value = searchResults
      totalPages.value = Math.ceil(searchResults.length / perPage.value)
      isServerPagination.value = false
      updateDisplayedProducts()
    }
    else {
      loadFilteredProducts()
    }
  }, 300)
}

// ===== Загрузка и пагинация =====
function updateDisplayedProducts() {
  if (isServerPagination.value)
    return
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  products.value = fullProducts.value.slice(start, end)
}

async function loadProducts(page = 1, append = false) {
  currentPage.value = page
  const result = await productService.getAllProducts(page, perPage.value)
  if (append)
    products.value = [...products.value, ...result.products]
  else products.value = result.products
  totalPages.value = Number(result.totalPages) || 1
  isServerPagination.value = true
}

async function loadMoreProducts() {
  if (isLoadingMore.value)
    return
  isLoadingMore.value = true
  const nextPage = currentPage.value + 1
  if (nextPage > totalPages.value) {
    isLoadingMore.value = false
    return
  }
  await loadProducts(nextPage, true)
  currentPage.value = nextPage
  isLoadingMore.value = false
}

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(async () => {
  try {
    await loadProducts()
    const allCategories = await categoryService.getAllCategories()
    mainCategories.value = allCategories.filter((cat: Category) => !cat.parent_id)

    checkMobile()
    window.addEventListener('resize', checkMobile)
  }
  catch (error) {
    console.error('Ошибка при загрузке данных:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

async function onMainCategoryChange() {
  try {
    currentPage.value = 1
    selectedCategoryFilter.value = ''
    categories.value = []

    if (!selectedMainCategoryId.value) {
      loadFilteredProducts()
      return
    }

    categories.value = await categoryService.getSubcategories(selectedMainCategoryId.value)
    loadFilteredProducts()
  }
  catch (error) {
    console.error('Ошибка при смене категории:', error)
  }
}

// ===== Фильтрация =====
async function filterCategorySearch() {
  currentPage.value = 1
  loadFilteredProducts()
}

async function loadFilteredProducts() {
  currentPage.value = 1
  if (selectedMainCategoryId.value && !selectedCategoryFilter.value) {
    let allProds: Product[] = await productService.getProductsByCategory(selectedMainCategoryId.value)
    if (categories.value.length > 0) {
      const subPromises = categories.value.map(cat => productService.getProductsByCategory(cat.id))
      const subResults = await Promise.all(subPromises)
      allProds = [...allProds, ...subResults.flat()]
    }
    fullProducts.value = allProds
    totalPages.value = Math.ceil(allProds.length / perPage.value)
    isServerPagination.value = false
    updateDisplayedProducts()
  }
  else if (selectedCategoryFilter.value) {
    const catProds = await productService.getProductsByCategory(selectedCategoryFilter.value)
    fullProducts.value = catProds
    totalPages.value = Math.ceil(catProds.length / perPage.value)
    isServerPagination.value = false
    updateDisplayedProducts()
  }
  else {
    await loadProducts()
  }
}
</script>

<template>
  <section class="h-full w-full flex flex-col overflow-hidden lg:flex-row">
    <SearchField v-if="isMobile"
      v-model="searchQuery"
      :placeholder="$t('pages.index.searchPlaceholder')"
      @search-change="debouncedSearch"
    />

    <div
      class="no-scrollbar w-full flex flex-col items-center lg:h-full lg:w-3/12 lg:flex-shrink-0 lg:items-start lg:overflow-y-auto lg:pr-4"
    >
      <SearchField v-if="!isMobile"
        v-model="searchQuery"
        :placeholder="$t('pages.index.searchPlaceholder')"
        @search-change="debouncedSearch"
      />

      <div class="lg:mt-6 hidden w-full text-sm lg:block lg:space-y-4">
        <CustomSelect
          v-model="selectedMainCategoryId"
          :options="mainCategories.map((c: { name: any; id: any }) => ({ label: c.name, value: c.id }))"
          :label="$t('common.category')"
          :placeholder="$t('pages.index.selectCategory')"
          @update:model-value="onMainCategoryChange"
        />

        <CustomSelect
          v-if="categories.length > 0"
          v-model="selectedCategoryFilter"
          :options="categories.map((s: { name: any; id: any }) => ({ label: s.name, value: s.id }))"
          :label="$t('common.subcategory')"
          :placeholder="$t('pages.index.allSubcategories')"
          @update:model-value="filterCategorySearch"
        />
      </div>
    </div>

    <div
      class="no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] h-full w-full overflow-y-auto [&::-webkit-scrollbar]:hidden lg:flex-1"
      :class="{ 'pb-20': isMobile }"
    >
      <div class="mt-6 block w-full text-sm lg:hidden space-y-4">
        <CustomSelect
          v-model="selectedMainCategoryId"
          :options="mainCategories.map((c: { name: any; id: any }) => ({ label: c.name, value: c.id }))"
          :label="$t('common.category')"
          :placeholder="$t('common.category')"
          @update:model-value="onMainCategoryChange"
        />

        <CustomSelect
          v-if="categories.length > 0"
          v-model="selectedCategoryFilter"
          :options="categories.map((s: { name: any; id: any }) => ({ label: s.name, value: s.id }))"
          :label="$t('common.subcategory')"
          :placeholder="$t('pages.index.allSubcategories')"
          @update:model-value="filterCategorySearch"
        />
      </div>

      <div class="mb-2 mt-4 lg:mt-0 text-xl text-mainText font-semibold sm:text-2xl">
        {{ $t('common.products') }}
      </div>

      <div v-if="products.length === 0" class="mt-8 text-center text-gray-400">
        {{ $t('pages.index.noProducts') }}
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-4 lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-1"
      >
        <MainProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          @click="goToProduct"
        />
      </div>

      <div
        v-if="isServerPagination && currentPage < totalPages"
        class="mt-8 flex items-center justify-center"
      >
        <button
          class="max-w-lg w-full rounded-lg bg-blue-500 px-6 py-3 text-lg text-mainText font-semibold shadow-lg transition-all duration-200 active:bg-blue-700 hover:bg-blue-600"
          :disabled="isLoadingMore"
          @click="loadMoreProducts"
        >
          <span v-if="!isLoadingMore">{{ $t('common.loadMore') }}</span>
          <span v-else>{{ $t('common.loading') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>