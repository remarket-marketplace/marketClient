<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  type Category,
} from '@/validation/category/category'
import {
  Plus,
  Folder,
  FolderOpen,
  Folders,
  ArrowUp,
  ArrowLeft,
  Loader2,
  X,
  EditIcon
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FileUploader from '@/components/FileUploader.vue'
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
const showAddCategoryModal = ref(false)
const showAddSubcategoryModal = ref(false)
const categorySearch = ref('')
const categorySort = ref('name_asc')
const subcategorySearch = ref('')
const subcategorySort = ref('name_asc')

const newCategory = ref({
  name: '',
  description: '',
  image: [] as File[],
  banner: [] as File[]
})
const newSubcategory = ref({
  name: '',
  description: '',
  image: [] as File[],
  banner: [] as File[]
})

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

const isCreateCategoryModalOpen = computed(
  () => showAddCategoryModal.value || showAddSubcategoryModal.value,
)

onMounted(async () => {
  await loadCategories()
})

async function loadCategories(page = 1, append = false) {
  try {
    if (!append) isLoading.value = true
    const res = await categoryService.getAllCategories(page, categoriesPerPage.value)
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
    const res = await categoryService.getSubcategories(categoryId, page, categoriesPerPage.value)
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
  loadSubcategories(category.id)
}

async function createCategory() {
  const normalizedName = newCategory.value.name.trim()
  const normalizedDescription = newCategory.value.description.trim()
  if (!normalizedName || !newCategory.value.image.length) return
  try {
    const success = await categoryService.AddCategory(
      normalizedName,
      normalizedDescription,
      newCategory.value.image[0] as File,
      undefined,
      newCategory.value.banner[0] ?? null,
    )
    if (success) {
      showAddCategoryModal.value = false
      resetNewCategoryForm()
      await loadCategories()
    }
  } catch (error) {
    console.error('Ошибка создания категории:', error)
  }
}

async function createSubcategory() {
  const normalizedName = newSubcategory.value.name.trim()
  const normalizedDescription = newSubcategory.value.description.trim()
  if (!normalizedName || !selectedCategory.value || !newSubcategory.value.image.length) return
  try {
    const success = await categoryService.AddCategory(
      normalizedName,
      normalizedDescription,
      newSubcategory.value.image[0] as File,
      selectedCategory.value.id,
      newSubcategory.value.banner[0] ?? null,
    )
    if (success) {
      showAddSubcategoryModal.value = false
      resetNewSubcategoryForm()
      await loadSubcategories(selectedCategory.value.id)
    }
  } catch (error) {
    console.error('Ошибка создания подкатегории:', error)
  }
}

function resetNewCategoryForm() {
  newCategory.value = { name: '', description: '', image: [], banner: [] }
}

function resetNewSubcategoryForm() {
  newSubcategory.value = { name: '', description: '', image: [], banner: [] }
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

const filteredCategories = computed(() => {
  return categories.value.filter(category => {
    return normalizedCategoryQuery.value
      ? [category.name, category.description ?? '', category.slug]
          .join(' ')
          .toLowerCase()
          .includes(normalizedCategoryQuery.value)
      : true
  })
})

const filteredSubcategories = computed(() => {
  return subcategories.value.filter(category => {
    return normalizedSubcategoryQuery.value
      ? [category.name, category.description ?? '', category.slug]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSubcategoryQuery.value)
      : true
  })
})

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
        loadMoreCategories()
      }
    },
    { root: categoriesContainerRef.value, threshold: 0.1 }
  )
  categoriesObserver.observe(categoriesSentinelRef.value)
}

function setupSubcategoriesObserver() {
  if (!subcategoriesSentinelRef.value) return
  subcategoriesObserver?.disconnect()
  subcategoriesObserver = new IntersectionObserver(
    (entries) => {
      if (
        entries[0]?.isIntersecting &&
        !isLoadingSubcategories.value &&
        subcategoryPage.value < subcategoryTotalPages.value
      ) {
        loadMoreSubcategories()
      }
    },
    { root: subcategoriesContainerRef.value, threshold: 0.1 }
  )
  subcategoriesObserver.observe(subcategoriesSentinelRef.value)
}

onUnmounted(() => {
  categoriesObserver?.disconnect()
  subcategoriesObserver?.disconnect()
  document.body.style.overflow = ''
})

watch([categorySearch, categorySort], () => {
  if (categoriesContainerRef.value) categoriesContainerRef.value.scrollTop = 0
})

watch([subcategorySearch, subcategorySort], () => {
  if (subcategoriesContainerRef.value) subcategoriesContainerRef.value.scrollTop = 0
})

watch(selectedCategory, () => {
  subcategorySearch.value = ''
  subcategorySort.value = 'name_asc'
  nextTick(setupSubcategoriesObserver)
})

watch(isCreateCategoryModalOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})
</script>

<template>
  <section class="w-full h-full flex flex-col gap-6 p-4 sm:p-6 overflow-scroll lg:overflow-hidden ">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-none">
      <div>
        <div class="flex gap-2">
          <BackButton/>
          <h1 class="text-2xl font-bold text-mainText">{{ t('pages.admin.categoriesPage.title') }}</h1>
        </div>
        <p class="text-text-secondary mt-1">{{ t('pages.admin.categoriesPage.subtitle') }}</p>
      </div>
      <button class="admin-btn admin-btn-primary w-full sm:w-auto"
        @click="showAddCategoryModal = true">
        <Plus class="w-5 h-5" />
        <span>{{ t('pages.admin.categoriesPage.addCategory') }}</span>
      </button>
    </div>

    <div class="flex flex-col gap-6 lg:flex-1 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-hidden flex-1">
      <div class="bg-dark-600 border border-dark-700 rounded-xl p-4 lg:col-span-1 min-h-[40vh] lg:h-full flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 class="text-lg font-semibold text-mainText">{{ t('pages.admin.categoriesPage.categories') }}</h2>
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
        <div ref="categoriesContainerRef" class="space-y-2 overflow-y-auto flex-1">
          <div v-for="category in sortedCategories" :key="category.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 cursor-pointer transition-all hover:border-blue-500"
            :class="{'border-blue-500 bg-blue-500/10': selectedCategory?.id === category.id}" @click="selectCategory(category)">
            <div class="flex-shrink-0 relative">
              <img v-if="category.image_url" :src="`${API_HOST}${category.image_url}`" class="w-10 h-10 rounded-lg object-cover" :alt="category.name" />
              <div v-else class="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Folder class="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-mainText font-medium truncate">{{ category.name }}</h3>
                <CategoryStatusTag :is_active="category.is_active" />
              </div>
              <p class="text-text-secondary text-sm truncate">{{ category.description || t('pages.admin.categoriesPage.noDescription') }}</p>
            </div>
            <div @click="router.push(`/admin/categories/edit/${category.id}`)">
              <EditIcon />
            </div>
          </div>

          <div v-if="categories.length === 0 && !isLoading" class="text-center py-8 text-text-secondary">
            <div class="w-12 h-12 mx-auto mb-2 opacity-50 flex items-center justify-center">
              <FolderOpen class="w-8 h-8" />
            </div>
            <p>{{ t('pages.admin.categoriesPage.noCategories') }}</p>
          </div>

          <div v-if="isLoading" class="text-center py-8 text-text-secondary">
            <Loader2 class="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p>{{ t('common.loading') }}</p>
          </div>
          <div ref="categoriesSentinelRef" class="h-4 w-full"></div>
        </div>
      </div>

      <div class="bg-dark-600 border border-dark-700 rounded-xl p-4 lg:col-span-2 min-h-[40vh] lg:h-full flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-mainText">{{ selectedCategory ? selectedCategory.name : t('pages.admin.categoriesPage.selectCategory') }}</h2>
            <p class="text-text-secondary text-sm">{{ selectedCategory ? (selectedCategory.description || t('pages.admin.categoriesPage.noDescription')) : t('pages.admin.categoriesPage.selectCategoryHint') }}</p>
          </div>
          <button v-if="selectedCategory"
            class="admin-btn admin-btn-success admin-btn-sm flex-shrink-0"
            @click="showAddSubcategoryModal = true">
            <Plus class="w-4 h-4" />
            <span>{{ t('pages.admin.categoriesPage.addSubcategory') }}</span>
          </button>
        </div>

        <div v-if="selectedCategory" class="flex flex-col flex-1 min-h-0">
          <div class="space-y-2 pb-2">
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
          <div ref="subcategoriesContainerRef" class="space-y-3 overflow-y-auto flex-1 min-h-0">
          <div v-for="subcategory in sortedSubcategories" :key="subcategory.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 bg-dark-700/50">
            <div class="flex-shrink-0 relative">
              <img v-if="subcategory.image_url" :src="`${API_HOST}${subcategory.image_url}`" class="w-8 h-8 rounded object-cover" :alt="subcategory.name" />
              <div v-else class="w-8 h-8 rounded bg-dark-600 flex items-center justify-center">
                <Folder class="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-mainText font-medium">{{ subcategory.name }}</h3>
                <CategoryStatusTag :is_active="subcategory.is_active" />
              </div>
              <p class="text-text-secondary text-sm">{{ subcategory.description || t('pages.admin.categoriesPage.noDescription') }}</p>
            </div>
            <div class="cursor-pointer" @click="router.push(`/admin/categories/edit/${subcategory.id}`)">
              <EditIcon />
            </div>
          </div>

          <div v-if="subcategories.length === 0 && !isLoadingSubcategories" class="text-center py-8 text-text-secondary">
            <div class="w-12 h-12 mx-auto mb-2 opacity-50 flex items-center justify-center">
              <Folders class="w-8 h-8" />
            </div>
            <p>{{ t('pages.admin.categoriesPage.noSubcategories') }}</p>
          </div>

          <div v-if="isLoadingSubcategories" class="text-center py-8 text-text-secondary">
            <Loader2 class="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p>{{ t('common.loading') }}</p>
          </div>
          <div ref="subcategoriesSentinelRef" class="h-4 w-full"></div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-12 text-text-secondary flex-1">
          <ArrowUp class="w-8 h-8 mb-4 opacity-50 lg:hidden" />
          <ArrowLeft class="hidden w-8 h-8 mb-4 opacity-50 lg:block" />
          <p class="text-lg">{{ t('pages.admin.categoriesPage.selectCategoryPrompt') }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="showAddCategoryModal"
      class="app-modal-overlay z-50 bg-black/50"
      @click.self="showAddCategoryModal = false"
    >
      <div class="app-modal-panel w-full max-w-sm overflow-y-auto rounded-xl border border-dark-700 bg-dark-600 p-6 sm:max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-mainText">{{ t('pages.admin.categoriesPage.addCategory') }}</h3>
          <button @click="showAddCategoryModal = false" class="text-gray-400 hover:text-white transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.name') }} *</label>
            <input v-model="newCategory.name" type="text" :maxlength="CATEGORY_NAME_MAX_LENGTH" class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500" placeholder="Введите название" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.description') }}</label>
            <textarea v-model="newCategory.description" rows="3" :maxlength="CATEGORY_DESCRIPTION_MAX_LENGTH" class="w-full max-h-28 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500" placeholder="Введите описание" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.image') }} *</label>
            <FileUploader v-model="newCategory.image" :maxFiles="1" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.banner') }}</label>
            <FileUploader v-model="newCategory.banner" :maxFiles="1" />
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <button class="admin-btn admin-btn-muted flex-1 order-2 sm:order-1" @click="showAddCategoryModal = false">
            {{ t('common.cancel') }}
          </button>
          <button class="admin-btn admin-btn-primary flex-1 order-1 sm:order-2" @click="createCategory" :disabled="!newCategory.name.trim() || !newCategory.image.length">
            {{ t('common.create') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showAddSubcategoryModal"
      class="app-modal-overlay z-50 bg-black/50"
      @click.self="showAddSubcategoryModal = false"
    >
      <div class="app-modal-panel w-full max-w-sm overflow-y-auto rounded-xl border border-dark-700 bg-dark-600 p-6 sm:max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-mainText">{{ t('pages.admin.categoriesPage.addSubcategory') }}</h3>
          <button @click="showAddSubcategoryModal = false" class="text-gray-400 hover:text-white transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.name') }} *</label>
            <input v-model="newSubcategory.name" type="text" :maxlength="CATEGORY_NAME_MAX_LENGTH" class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500" placeholder="Введите название" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.description') }}</label>
            <textarea v-model="newSubcategory.description" rows="3" :maxlength="CATEGORY_DESCRIPTION_MAX_LENGTH" class="w-full max-h-28 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500" placeholder="Введите описание" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.image') }} *</label>
            <FileUploader v-model="newSubcategory.image" :maxFiles="1" />
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">{{ t('common.banner') }}</label>
            <FileUploader v-model="newSubcategory.banner" :maxFiles="1" />
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <button class="admin-btn admin-btn-muted flex-1 order-2 sm:order-1" @click="showAddSubcategoryModal = false">
            {{ t('common.cancel') }}
          </button>
          <button class="admin-btn admin-btn-success flex-1 order-1 sm:order-2" @click="createSubcategory" :disabled="!newSubcategory.name.trim() || !newSubcategory.image.length">
            {{ t('common.create') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
