<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import type { Category } from '@/validation/category/category'
import {
  Plus,
  Folder,
  FolderOpen,
  Folders,
  ArrowUp,
  ArrowLeft,
  Loader2,
  EditIcon,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CategoryStatusTag from '@/components/CategoryStatusTag.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { useRouter } from 'vue-router'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'

const { t } = useI18n()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const categories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedCategory = ref<Category | null>(null)
const isLoading = ref(false)
const isLoadingSubcategories = ref(false)
const categorySearch = ref('')
const categorySort = ref('name_asc')
const subcategorySearch = ref('')
const subcategorySort = ref('name_asc')

const categoryPage = ref(1)
const categoryTotalPages = ref(1)
const subcategoryPage = ref(1)
const subcategoryTotalPages = ref(1)
const categoriesPerPage = ref(10)
const categoriesContainerRef = ref<HTMLElement | null>(null)
const categoriesSentinelRef = ref<HTMLElement | null>(null)
const subcategoriesContainerRef = ref<HTMLElement | null>(null)
const subcategoriesSentinelRef = ref<HTMLElement | null>(null)
let categoriesObserver: IntersectionObserver | null = null
let subcategoriesObserver: IntersectionObserver | null = null

onMounted(async () => {
  await loadCategories()
})

async function loadCategories(page = 1, append = false) {
  try {
    if (!append) isLoading.value = true
    const res = await adminService.getAdminCategories(page, categoriesPerPage.value)
    if (append) {
      categories.value = [...categories.value, ...res.categories]
    } else {
      categories.value = res.categories
    }
    categoryPage.value = res.currentPage
    categoryTotalPages.value = res.totalPages
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error)
  } finally {
    isLoading.value = false
    nextTick(setupCategoriesObserver)
  }
}

async function loadSubcategories(categoryId: string, page = 1, append = false) {
  try {
    isLoadingSubcategories.value = true
    const res = await adminService.getAdminSubcategories(
      categoryId,
      page,
      categoriesPerPage.value,
    )
    if (append) {
      subcategories.value = [...subcategories.value, ...res.categories]
    } else {
      subcategories.value = res.categories
    }
    subcategoryPage.value = res.currentPage
    subcategoryTotalPages.value = res.totalPages
  } catch (error) {
    console.error('Ошибка загрузки подкатегорий:', error)
  } finally {
    isLoadingSubcategories.value = false
    nextTick(setupSubcategoriesObserver)
  }
}

function selectCategory(category: Category) {
  selectedCategory.value = category
  subcategories.value = []
  subcategoryPage.value = 1
  void loadSubcategories(category.id)
}

function goToCreateCategory(): void {
  void router.push('/admin/categories/create')
}

function goToCreateSubcategory(): void {
  if (!selectedCategory.value) return
  void router.push({
    path: '/admin/categories/create',
    query: { parentId: selectedCategory.value.id },
  })
}

function syncSelectedCategoryWithVisibleList() {
  const visibleCategories = sortedCategories.value

  if (visibleCategories.length === 0) {
    if (selectedCategory.value) {
      selectedCategory.value = null
      subcategories.value = []
    }
    return
  }

  if (!selectedCategory.value) {
    if (normalizedCategoryQuery.value) {
      selectCategory(visibleCategories[0] as Category)
    }
    return
  }

  const selectedStillVisible = visibleCategories.some(
    (category) => category.id === selectedCategory.value?.id,
  )

  if (!selectedStillVisible) {
    selectCategory(visibleCategories[0] as Category)
    return
  }

  const refreshedSelectedCategory = categories.value.find(
    (category) => category.id === selectedCategory.value?.id,
  )

  if (refreshedSelectedCategory && refreshedSelectedCategory !== selectedCategory.value) {
    selectedCategory.value = refreshedSelectedCategory
  }
}

async function loadMoreCategories() {
  if (categoryPage.value >= categoryTotalPages.value) return
  await loadCategories(categoryPage.value + 1, true)
}

async function loadMoreSubcategories() {
  if (!selectedCategory.value) return
  if (subcategoryPage.value >= subcategoryTotalPages.value) return
  await loadSubcategories(selectedCategory.value.id, subcategoryPage.value + 1, true)
}

const normalizedCategoryQuery = computed(() => categorySearch.value.trim().toLowerCase())
const normalizedSubcategoryQuery = computed(() => subcategorySearch.value.trim().toLowerCase())

const filteredCategories = computed(() => categories.value.filter((category) => (
  normalizedCategoryQuery.value
    ? [category.name, category.name_ru, category.name_en, category.description ?? '', category.slug]
      .join(' ')
      .toLowerCase()
      .includes(normalizedCategoryQuery.value)
    : true
)))

const filteredSubcategories = computed(() => subcategories.value.filter((category) => (
  normalizedSubcategoryQuery.value
    ? [category.name, category.name_ru, category.name_en, category.description ?? '', category.slug]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSubcategoryQuery.value)
    : true
)))

const sortedCategories = computed(() => {
  const data = [...filteredCategories.value]
  switch (categorySort.value) {
    case 'name_desc':
      return data.sort((a, b) => b.name.localeCompare(a.name))
    case 'active_first':
      return data.sort((a, b) => {
        if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
        return a.is_active ? -1 : 1
      })
    case 'active_last':
      return data.sort((a, b) => {
        if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
        return a.is_active ? 1 : -1
      })
    default:
      return data.sort((a, b) => a.name.localeCompare(b.name))
  }
})

const sortedSubcategories = computed(() => {
  const data = [...filteredSubcategories.value]
  switch (subcategorySort.value) {
    case 'name_desc':
      return data.sort((a, b) => b.name.localeCompare(a.name))
    case 'active_first':
      return data.sort((a, b) => {
        if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
        return a.is_active ? -1 : 1
      })
    case 'active_last':
      return data.sort((a, b) => {
        if (a.is_active === b.is_active) return a.name.localeCompare(b.name)
        return a.is_active ? 1 : -1
      })
    default:
      return data.sort((a, b) => a.name.localeCompare(b.name))
  }
})

function setupCategoriesObserver() {
  if (!categoriesSentinelRef.value) return
  categoriesObserver?.disconnect()
  categoriesObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !isLoading.value && categoryPage.value < categoryTotalPages.value) {
        void loadMoreCategories()
      }
    },
    { root: categoriesContainerRef.value, threshold: 0.1 },
  )
  categoriesObserver.observe(categoriesSentinelRef.value)
}

function setupSubcategoriesObserver() {
  if (!subcategoriesSentinelRef.value) return
  subcategoriesObserver?.disconnect()
  subcategoriesObserver = new IntersectionObserver(
    (entries) => {
      if (
        entries[0]?.isIntersecting
        && !isLoadingSubcategories.value
        && subcategoryPage.value < subcategoryTotalPages.value
      ) {
        void loadMoreSubcategories()
      }
    },
    { root: subcategoriesContainerRef.value, threshold: 0.1 },
  )
  subcategoriesObserver.observe(subcategoriesSentinelRef.value)
}

onUnmounted(() => {
  categoriesObserver?.disconnect()
  subcategoriesObserver?.disconnect()
})

watch([categorySearch, categorySort], () => {
  if (categoriesContainerRef.value) categoriesContainerRef.value.scrollTop = 0
})

watch([sortedCategories, normalizedCategoryQuery], () => {
  syncSelectedCategoryWithVisibleList()
})

watch([subcategorySearch, subcategorySort], () => {
  if (subcategoriesContainerRef.value) subcategoriesContainerRef.value.scrollTop = 0
})

watch(selectedCategory, () => {
  subcategorySearch.value = ''
  subcategorySort.value = 'name_asc'
  nextTick(setupSubcategoriesObserver)
})
</script>

<template>
  <section class="flex h-full w-full flex-col gap-6 overflow-scroll p-4 sm:p-6 lg:overflow-hidden">
    <div class="flex-none">
      <div class="mb-4">
        <BackButton />
      </div>

      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="space-y-3">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
            <FolderOpen class="h-3.5 w-3.5" />
            <span>{{ t('pages.admin.categoriesPage.managementBadge') }}</span>
          </div>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-white">
              {{ t('pages.admin.categoriesPage.title') }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {{ t('pages.admin.categoriesPage.subtitle') }}
            </p>
          </div>
        </div>

        <button class="market-btn market-btn-primary min-w-[220px] rounded-xl px-5 py-3" @click="goToCreateCategory">
          <Plus class="h-4 w-4" />
          <span>{{ t('pages.admin.categoriesPage.addCategory') }}</span>
        </button>
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-3 lg:overflow-hidden">
      <div class="admin-surface-panel flex min-h-[40vh] flex-col rounded-[1.5rem] p-4 lg:col-span-1 lg:h-full">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-mainText">
              {{ t('pages.admin.categoriesPage.categories') }}
            </h2>
            <p class="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">
              {{ t('pages.admin.categoriesPage.rootCollection') }}
            </p>
          </div>
          <span class="text-sm text-text-secondary">{{ filteredCategories.length }}</span>
        </div>

        <div class="mb-3 space-y-2">
          <SearchField v-model="categorySearch" :placeholder="$t('common.search')" />
          <CustomSelect
            v-model="categorySort"
            :options="[
              { value: 'name_asc', label: t('common.sortOptions.nameAsc') },
              { value: 'name_desc', label: t('common.sortOptions.nameDesc') },
              { value: 'active_first', label: t('common.sortOptions.activeFirst') },
              { value: 'active_last', label: t('common.sortOptions.activeLast') },
            ]"
            :placeholder="$t('common.sortBy')"
          />
        </div>

        <div ref="categoriesContainerRef" class="flex-1 space-y-2 overflow-y-auto">
          <div
            v-for="category in sortedCategories"
            :key="category.id"
            class="admin-surface-soft flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all hover:border-white/12"
            :class="{ 'border-blue-500/35 bg-blue-500/[0.08]': selectedCategory?.id === category.id }"
            @click="selectCategory(category)"
          >
            <div class="relative flex-shrink-0">
              <img
                v-if="category.image_url"
                :src="`${API_HOST}${category.image_url}`"
                class="h-10 w-10 rounded-lg object-cover"
                :alt="category.name"
              />
              <div v-else class="admin-surface-soft flex h-10 w-10 items-center justify-center rounded-lg">
                <Folder class="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate font-medium text-mainText">{{ category.name }}</h3>
                <CategoryStatusTag :is_active="category.is_active" />
              </div>
              <p class="truncate text-sm text-text-secondary">
                {{ category.description || t('pages.admin.categoriesPage.noDescription') }}
              </p>
            </div>

            <button
              class="cursor-pointer text-gray-300 transition-colors hover:text-white"
              @click.stop="router.push(`/admin/categories/edit/${category.id}`)"
            >
              <EditIcon class="h-4 w-4" />
            </button>
          </div>

          <div v-if="categories.length === 0 && !isLoading" class="py-8 text-center text-text-secondary">
            <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center opacity-50">
              <FolderOpen class="h-8 w-8" />
            </div>
            <p>{{ t('pages.admin.categoriesPage.noCategories') }}</p>
          </div>

          <div v-if="isLoading" class="py-8 text-center text-text-secondary">
            <Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin" />
            <p>{{ t('common.loading') }}</p>
          </div>

          <div ref="categoriesSentinelRef" class="h-4 w-full" />
        </div>
      </div>

      <div class="admin-surface-panel flex min-h-[40vh] flex-col rounded-[1.5rem] p-4 lg:col-span-2 lg:h-full">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-mainText">
              {{ selectedCategory ? selectedCategory.name : t('pages.admin.categoriesPage.selectCategory') }}
            </h2>
            <p class="mt-1 text-sm text-text-secondary">
              {{
                selectedCategory
                  ? (selectedCategory.description || t('pages.admin.categoriesPage.noDescription'))
                  : t('pages.admin.categoriesPage.selectCategoryHint')
              }}
            </p>
          </div>

          <button
            v-if="selectedCategory"
            class="market-btn market-btn-secondary min-w-[220px] rounded-xl px-5 py-3"
            @click="goToCreateSubcategory"
          >
            <Plus class="h-4 w-4" />
            <span>{{ t('pages.admin.categoriesPage.addSubcategory') }}</span>
          </button>
        </div>

        <div v-if="selectedCategory" class="flex min-h-0 flex-1 flex-col">
          <div class="pb-2 space-y-2">
            <SearchField v-model="subcategorySearch" :placeholder="$t('common.search')" />
            <CustomSelect
              v-model="subcategorySort"
              :options="[
                { value: 'name_asc', label: t('common.sortOptions.nameAsc') },
                { value: 'name_desc', label: t('common.sortOptions.nameDesc') },
                { value: 'active_first', label: t('common.sortOptions.activeFirst') },
                { value: 'active_last', label: t('common.sortOptions.activeLast') },
              ]"
              :placeholder="$t('common.sortBy')"
            />
          </div>

          <div ref="subcategoriesContainerRef" class="flex-1 min-h-0 space-y-3 overflow-y-auto">
            <div
              v-for="subcategory in sortedSubcategories"
              :key="subcategory.id"
              class="admin-surface-soft flex items-center gap-3 rounded-lg p-3"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-medium text-mainText">{{ subcategory.name }}</h3>
                  <CategoryStatusTag :is_active="subcategory.is_active" />
                </div>
                <p class="text-sm text-text-secondary">
                  {{ subcategory.description || t('pages.admin.categoriesPage.noDescription') }}
                </p>
              </div>

              <button
                class="cursor-pointer text-gray-300 transition-colors hover:text-white"
                @click.stop="router.push(`/admin/categories/edit/${subcategory.id}`)"
              >
                <EditIcon class="h-4 w-4" />
              </button>
            </div>

            <div
              v-if="subcategories.length === 0 && !isLoadingSubcategories"
              class="py-8 text-center text-text-secondary"
            >
              <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center opacity-50">
                <Folders class="h-8 w-8" />
              </div>
              <p>{{ t('pages.admin.categoriesPage.noSubcategories') }}</p>
            </div>

            <div v-if="isLoadingSubcategories" class="py-8 text-center text-text-secondary">
              <Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin" />
              <p>{{ t('common.loading') }}</p>
            </div>

            <div ref="subcategoriesSentinelRef" class="h-4 w-full" />
          </div>
        </div>

        <div v-else class="flex flex-1 flex-col items-center justify-center py-12 text-text-secondary">
          <ArrowUp class="mb-4 h-8 w-8 opacity-50 lg:hidden" />
          <ArrowLeft class="mb-4 hidden h-8 w-8 opacity-50 lg:block" />
          <p class="text-lg">{{ t('pages.admin.categoriesPage.selectCategoryPrompt') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
