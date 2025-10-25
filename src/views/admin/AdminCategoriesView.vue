<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import type { Category } from '@/validation/category/category'
import { Icon } from '@iconify/vue'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const API_HOST = import.meta.env.VITE_API_HOST

const categories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedCategory = ref<Category | null>(null)
const isLoading = ref(false)
const showAddCategoryModal = ref(false)
const showAddSubcategoryModal = ref(false)

// Данные для форм
const newCategory = ref({
  name: '',
  description: '',
  image: null as File | null
})
const newSubcategory = ref({
  name: '',
  description: '',
  image: null as File | null
})

onMounted(async () => {
  await loadCategories()
})

async function loadCategories() {
  try {
    isLoading.value = true
    categories.value = await categoryService.getAllCategories()
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadSubcategories(categoryId: string) {
  try {
    subcategories.value = await categoryService.getSubcategories(categoryId)
  } catch (error) {
    console.error('Ошибка загрузки подкатегорий:', error)
  }
}

function selectCategory(category: Category) {
  selectedCategory.value = category
  loadSubcategories(category.id)
}

function clearSelection() {
  selectedCategory.value = null
  subcategories.value = []
}

async function createCategory() {
  if (!newCategory.value.name.trim() || !newCategory.value.image) return

  try {
    const success = await categoryService.AddCategory(
      newCategory.value.name,
      newCategory.value.description,
      newCategory.value.image
      // parentId не передаем, так как создаем основную категорию
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
  if (!newSubcategory.value.name.trim() || !selectedCategory.value || !newSubcategory.value.image) return

  try {
    const success = await categoryService.AddCategory(
      newSubcategory.value.name,
      newSubcategory.value.description,
      newSubcategory.value.image,
      selectedCategory.value.id // parentId для подкатегории
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
  newCategory.value = { name: '', description: '', image: null }
}

function resetNewSubcategoryForm() {
  newSubcategory.value = { name: '', description: '', image: null }
}

function handleCategoryImage(event: Event) {
  const target = event.target as HTMLInputElement
  newCategory.value.image = target.files?.[0] || null
}

function handleSubcategoryImage(event: Event) {
  const target = event.target as HTMLInputElement
  newSubcategory.value.image = target.files?.[0] || null
}

// Метод удаления нужно добавить в ваш categoryService
// async function deleteCategory(categoryId: string) {
//   if (!confirm(t('common.deleteConfirm'))) return
  
//   try {
//     await categoryService.deleteCategory(categoryId)
//     if (selectedCategory.value?.id === categoryId) {
//       clearSelection()
//     }
//     await loadCategories()
//   } catch (error) {
//     console.error('Ошибка удаления категории:', error)
//   }
// }

// async function deleteSubcategory(subcategoryId: string) {
//   if (!confirm(t('common.deleteConfirm'))) return
  
//   try {
//     await categoryService.deleteCategory(subcategoryId)
//     if (selectedCategory.value) {
//       await loadSubcategories(selectedCategory.value.id)
//     }
//   } catch (error) {
//     console.error('Ошибка удаления подкатегории:', error)
//   }
// }
</script>

<template>
  <section class="w-full h-full flex flex-col gap-6 p-4 sm:p-6 overflow-scroll lg:overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-none">
      <div>
        <h1 class="text-2xl font-bold text-mainText">
          {{ $t('pages.admin.categoriesPage.title') }}
        </h1>
        <p class="text-text-secondary mt-1">
          {{ $t('pages.admin.categoriesPage.subtitle') }}
        </p>
      </div>
      
      <button
        class="flex items-center justify-center sm:justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        @click="showAddCategoryModal = true"
      >
        <Icon icon="mdi:plus" class="text-lg" />
        <span>{{ $t('pages.admin.categoriesPage.addCategory') }}</span>
      </button>
    </div>

    <div class="flex flex-col gap-6 lg:flex-1 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-hidden flex-1">
      
      <div 
        class="bg-dark-600 border border-dark-700 rounded-xl p-4 lg:col-span-1 min-h-[40vh] lg:h-full flex flex-col"
      >
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 class="text-lg font-semibold text-mainText">
            {{ $t('pages.admin.categoriesPage.categories') }}
          </h2>
          <span class="text-sm text-text-secondary">
            {{ categories.length }}
          </span>
        </div>

        <div class="space-y-2 overflow-y-auto flex-1">
          <div
            v-for="category in categories"
            :key="category.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 cursor-pointer transition-all hover:border-blue-500"
            :class="{
              'border-blue-500 bg-blue-500/10': selectedCategory?.id === category.id
            }"
            @click="selectCategory(category)"
          >
            <div class="flex-shrink-0">
              <img
                v-if="category.image_url"
                :src="`${API_HOST}${category.image_url}`"
                class="w-10 h-10 rounded-lg object-cover"
                :alt="category.name"
              />
              <div
                v-else
                class="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center"
              >
                <Icon icon="mdi:folder-outline" class="text-xl text-gray-400" />
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <h3 class="text-mainText font-medium truncate">
                {{ category.name }}
              </h3>
              <p class="text-text-secondary text-sm truncate">
                {{ category.description || $t('pages.admin.categoriesPage.noDescription') }}
              </p>
            </div>
            
            </div>

          <div
            v-if="categories.length === 0 && !isLoading"
            class="text-center py-8 text-text-secondary"
          >
            <Icon icon="mdi:folder-off-outline" class="text-4xl mx-auto mb-2 opacity-50" />
            <p>{{ $t('pages.admin.categoriesPage.noCategories') }}</p>
          </div>

          <div
            v-if="isLoading"
            class="text-center py-8 text-text-secondary"
          >
            <Icon icon="eos-icons:loading" class="text-2xl mx-auto mb-2 animate-spin" />
            <p>{{ $t('common.loading') }}</p>
          </div>
        </div>
      </div>

      <div 
        class="bg-dark-600 border border-dark-700 rounded-xl p-4 lg:col-span-2 min-h-[40vh] lg:h-full flex flex-col"
      >
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-mainText">
              {{ selectedCategory ? selectedCategory.name : $t('pages.admin.categoriesPage.selectCategory') }}
            </h2>
            <p class="text-text-secondary text-sm">
              {{ selectedCategory ? selectedCategory.description : $t('pages.admin.categoriesPage.selectCategoryHint') }}
            </p>
          </div>
          
          <button
            v-if="selectedCategory"
            class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm flex-shrink-0"
            @click="showAddSubcategoryModal = true"
          >
            <Icon icon="mdi:plus" class="text-base" />
            <span>{{ $t('pages.admin.categoriesPage.addSubcategory') }}</span>
          </button>
        </div>

        <div v-if="selectedCategory" class="space-y-3 overflow-y-auto flex-1">
          <div
            v-for="subcategory in subcategories"
            :key="subcategory.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 bg-dark-700/50"
          >
            <div class="flex-shrink-0">
              <img
                v-if="subcategory.image_url"
                :src="`${API_HOST}${subcategory.image_url}`"
                class="w-8 h-8 rounded object-cover"
                :alt="subcategory.name"
              />
              <div
                v-else
                class="w-8 h-8 rounded bg-dark-600 flex items-center justify-center"
              >
                <Icon icon="mdi:folder-outline" class="text-lg text-gray-400" />
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <h3 class="text-mainText font-medium">
                {{ subcategory.name }}
              </h3>
              <p class="text-text-secondary text-sm">
                {{ subcategory.description || $t('pages.admin.categoriesPage.noDescription') }}
              </p>
            </div>
            
            </div>

          <div
            v-if="subcategories.length === 0 && selectedCategory"
            class="text-center py-8 text-text-secondary"
          >
            <Icon icon="mdi:folder-multiple-outline" class="text-4xl mx-auto mb-2 opacity-50" />
            <p>{{ $t('pages.admin.categoriesPage.noSubcategories') }}</p>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center py-12 text-text-secondary flex-1"
        >
          <Icon icon="mdi:arrow-up" class="text-4xl mb-4 opacity-50 lg:hidden" />
          <Icon icon="mdi:arrow-left" class="hidden text-4xl mb-4 opacity-50 lg:block" />
          <p class="text-lg">{{ $t('pages.admin.categoriesPage.selectCategoryPrompt') }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="showAddCategoryModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showAddCategoryModal = false"
    >
      <div class="bg-dark-600 border border-dark-700 rounded-xl p-6 w-full max-w-sm sm:max-w-md">
        <h3 class="text-xl font-bold text-mainText mb-4">
          {{ $t('pages.admin.categoriesPage.addCategory') }}
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.name') }} *
            </label>
            <input
              v-model="newCategory.name"
              type="text"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              :placeholder="$t('common.name')"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.description') }}
            </label>
            <textarea
              v-model="newCategory.description"
              rows="3"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              :placeholder="$t('common.description')"
            />
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.image') }} *
            </label>
            <input
              type="file"
              accept="image/*"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              @change="handleCategoryImage"
              required
            />
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors order-2 sm:order-1"
            @click="showAddCategoryModal = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors order-1 sm:order-2"
            @click="createCategory"
            :disabled="!newCategory.name.trim() || !newCategory.image"
          >
            {{ $t('common.create') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showAddSubcategoryModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showAddSubcategoryModal = false"
    >
      <div class="bg-dark-600 border border-dark-700 rounded-xl p-6 w-full max-w-sm sm:max-w-md">
        <h3 class="text-xl font-bold text-mainText mb-4">
          {{ $t('pages.admin.categoriesPage.addSubcategory') }}
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.name') }} *
            </label>
            <input
              v-model="newSubcategory.name"
              type="text"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              :placeholder="$t('common.name')"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.description') }}
            </label>
            <textarea
              v-model="newSubcategory.description"
              rows="3"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              :placeholder="$t('common.description')"
            />
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-2">
              {{ $t('common.image') }} *
            </label>
            <input
              type="file"
              accept="image/*"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-mainText focus:outline-none focus:border-blue-500"
              @change="handleSubcategoryImage"
              required
            />
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors order-2 sm:order-1"
            @click="showAddSubcategoryModal = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors order-1 sm:order-2"
            @click="createSubcategory"
            :disabled="!newSubcategory.name.trim() || !newSubcategory.image"
          >
            {{ $t('common.create') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>