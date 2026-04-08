<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import FileUploader from '@/components/FileUploader.vue'
import Checkbox from '@/components/Checkbox.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import type { z } from 'zod'
import {
  CategorySchema,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
} from '@/validation/category/category'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { FolderGit2, ImagePlus, Layers3, Loader2, ShieldCheck, Sparkles } from 'lucide-vue-next'

type CategoryRead = z.infer<typeof CategorySchema>

const API_HOST = import.meta.env.VITE_API_HOST

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const categoryId = computed(() => String(route.params.id ?? ''))

const category = ref<CategoryRead | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const nameRu = ref('')
const nameEn = ref('')
const description = ref('')
const isActive = ref(false)
const existingImage = ref<string | null>(null)
const existingBanner = ref<string | null>(null)
const newImage = ref<File[]>([])
const newBanner = ref<File[]>([])

const isSubcategory = computed(() => Boolean(category.value?.parent_id))
const hasImage = computed(() => Boolean(existingImage.value || newImage.value.length > 0))
const normalizedNameRu = computed(() => nameRu.value.trim())
const normalizedNameEn = computed(() => nameEn.value.trim())
const normalizedDescription = computed(() => description.value.trim())
const isFormValid = computed(() => (
  Boolean(normalizedNameRu.value)
  && Boolean(normalizedNameEn.value)
  && (isSubcategory.value || hasImage.value)
))

const pageTitle = computed(() => (
  isSubcategory.value
    ? t('pages.admin.categoryEdit.subcategoryTitle')
    : t('pages.admin.categoryEdit.categoryTitle')
))

const pageSubtitle = computed(() => (
  isSubcategory.value
    ? t('pages.admin.categoryEdit.subcategorySubtitle')
    : t('pages.admin.categoryEdit.categorySubtitle')
))

const typeLabel = computed(() => (
  isSubcategory.value
    ? t('pages.admin.categoryCreate.subcategoryLabel')
    : t('pages.admin.categoryCreate.categoryLabel')
))

function toAssetUrl(path: string | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${API_HOST}${path}`
}

async function loadCategory() {
  try {
    isLoading.value = true
    errorMessage.value = ''

    const data = await adminService.getCategoryData(categoryId.value)
    if (!data) {
      errorMessage.value = t('pages.admin.editCategory.errorLoading')
      return
    }

    category.value = data
    nameRu.value = data.name_ru
    nameEn.value = data.name_en
    description.value = data.description ?? ''
    isActive.value = data.is_active
    existingImage.value = data.image_url
    existingBanner.value = data.banner_url ?? null
  } catch (error) {
    console.error('Failed to load category:', error)
    errorMessage.value = t('pages.admin.editCategory.errorLoading')
  } finally {
    isLoading.value = false
  }
}

async function saveCategory() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!normalizedNameRu.value || !normalizedNameEn.value) {
    errorMessage.value = t('pages.admin.editCategory.nameRequired')
    return
  }

  if (!isSubcategory.value && !hasImage.value) {
    errorMessage.value = t('pages.admin.editCategory.imageRequired')
    return
  }

  try {
    isSaving.value = true
    const updatedCategory = await adminService.updateCategoryData(
      categoryId.value,
      normalizedNameRu.value,
      normalizedNameEn.value,
      normalizedDescription.value,
      isActive.value,
      newImage.value[0] ?? null,
      newBanner.value[0] ?? null,
    )

    if (!updatedCategory) {
      errorMessage.value = t('pages.admin.editCategory.errorSaving')
      return
    }

    category.value = updatedCategory
    existingImage.value = updatedCategory.image_url
    existingBanner.value = updatedCategory.banner_url ?? null
    newImage.value = []
    newBanner.value = []
    successMessage.value = t('common.saved')
  } catch (error) {
    console.error('Failed to save category:', error)
    errorMessage.value = t('pages.admin.editCategory.errorSaving')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadCategory)
</script>

<template>
  <section class="w-full h-full overflow-scroll no-scrollbar pb-20">
    <div class="mx-auto w-full max-w-[1280px] px-4 py-4 lg:px-6 lg:py-6">
      <div class="mb-5">
        <BackButton />
      </div>

      <div v-if="isLoading" class="flex min-h-[320px] items-center justify-center">
        <div class="inline-flex items-center gap-3 text-gray-400">
          <Loader2 class="h-5 w-5 animate-spin" />
          <span>{{ t('common.loading') }}</span>
        </div>
      </div>

      <template v-else-if="category">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              <Sparkles class="h-3.5 w-3.5" />
              <span>{{ typeLabel }}</span>
            </div>
            <div class="space-y-2">
              <h1 class="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                {{ pageTitle }}
              </h1>
              <p class="max-w-2xl text-sm leading-6 text-gray-400">
                {{ pageSubtitle }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="market-btn market-btn-primary min-w-[220px] rounded-xl px-5 py-3"
            :disabled="isSaving || !isFormValid"
            @click="saveCategory"
          >
            <span v-if="isSaving" class="inline-flex items-center gap-2">
              <Loader2 class="h-4 w-4 animate-spin" />
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>

        <div class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div class="space-y-6">
            <section class="rounded-2xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5">
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-white">
                    {{ t('pages.admin.categoryCreate.generalSection') }}
                  </h2>
                  <p class="mt-1 text-sm text-gray-400">
                    {{ t('pages.admin.categoryCreate.generalSectionHint') }}
                  </p>
                </div>
                <Layers3 class="mt-1 h-5 w-5 text-blue-300" />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="space-y-2">
                  <span class="text-sm font-medium text-gray-300">
                    {{ t('common.nameRu') }}
                  </span>
                  <input
                    v-model="nameRu"
                    type="text"
                    :maxlength="CATEGORY_NAME_MAX_LENGTH"
                    class="h-12 w-full rounded-lg border border-dark-700 bg-dark-600 px-4 text-sm text-white outline-none"
                    :placeholder="t('pages.admin.categoriesPage.nameRuPlaceholder')"
                  />
                </label>

                <label class="space-y-2">
                  <span class="text-sm font-medium text-gray-300">
                    {{ t('common.nameEn') }}
                  </span>
                  <input
                    v-model="nameEn"
                    type="text"
                    :maxlength="CATEGORY_NAME_MAX_LENGTH"
                    class="h-12 w-full rounded-lg border border-dark-700 bg-dark-600 px-4 text-sm text-white outline-none"
                    :placeholder="t('pages.admin.categoriesPage.nameEnPlaceholder')"
                  />
                </label>
              </div>

              <label class="mt-4 block space-y-2">
                <span class="text-sm font-medium text-gray-300">
                  {{ t('common.description') }}
                </span>
                <textarea
                  v-model="description"
                  rows="6"
                  :maxlength="CATEGORY_DESCRIPTION_MAX_LENGTH"
                  class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none"
                  :placeholder="t('pages.admin.categoryCreate.descriptionPlaceholder')"
                />
              </label>
            </section>

            <section
              v-if="!isSubcategory"
              class="rounded-2xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5"
            >
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-white">
                    {{ t('pages.admin.categoryCreate.mediaSection') }}
                  </h2>
                  <p class="mt-1 text-sm text-gray-400">
                    {{ t('pages.admin.categoryCreate.mediaSectionHint') }}
                  </p>
                </div>
                <ImagePlus class="mt-1 h-5 w-5 text-blue-300" />
              </div>

              <div class="space-y-5">
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <label class="text-sm font-medium text-gray-300">
                      {{ t('common.image') }}
                      <span class="ml-1 text-xs text-red-400">*</span>
                    </label>
                    <span
                      class="text-xs"
                      :class="hasImage ? 'text-gray-400' : 'text-red-400'"
                    >
                      {{ hasImage ? t('common.selected') : t('pages.admin.editCategory.imageRequired') }}
                    </span>
                  </div>

                  <div
                    v-if="existingImage"
                    class="overflow-hidden rounded-xl border border-dark-700 bg-dark-700/40"
                  >
                    <img
                      :src="toAssetUrl(existingImage)"
                      :alt="category.name"
                      class="h-52 w-full object-cover"
                    />
                  </div>

                  <FileUploader v-model="newImage" :max-files="1" />
                </div>

                <div class="space-y-3">
                  <label class="text-sm font-medium text-gray-300">
                    {{ t('common.banner') }}
                  </label>

                  <div
                    v-if="existingBanner"
                    class="overflow-hidden rounded-xl border border-dark-700 bg-dark-700/40"
                  >
                    <img
                      :src="toAssetUrl(existingBanner)"
                      :alt="category.name"
                      class="h-44 w-full object-cover"
                    />
                  </div>

                  <FileUploader v-model="newBanner" :max-files="1" />
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5">
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-white">
                    {{ t('pages.admin.categoryEdit.visibilitySection') }}
                  </h2>
                  <p class="mt-1 text-sm text-gray-400">
                    {{ t('pages.admin.categoryEdit.visibilityHint') }}
                  </p>
                </div>
                <ShieldCheck class="mt-1 h-5 w-5 text-blue-300" />
              </div>

              <label class="flex items-center justify-between gap-4 rounded-xl border border-dark-700 bg-dark-700/40 px-4 py-3">
                <div class="space-y-1">
                  <span class="block text-sm font-medium text-white">
                    {{ t('common.isActive') }}
                  </span>
                  <span class="block text-xs text-gray-400">
                    {{ t('pages.admin.categoryEdit.visibilityToggleHint') }}
                  </span>
                </div>
                <Checkbox v-model="isActive" />
              </label>
            </section>

            <ErrorBanner v-if="errorMessage" :message="errorMessage" />
            <SuccessMessage v-if="successMessage" :success-message="successMessage" />
          </div>

          <aside class="space-y-6">
            <section class="rounded-2xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5">
              <div class="mb-4 flex items-center gap-2">
                <FolderGit2 class="h-4 w-4 text-blue-300" />
                <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-300">
                  {{ t('pages.admin.categoryCreate.summaryTitle') }}
                </h2>
              </div>

              <div class="space-y-4 text-sm">
                <div class="space-y-1">
                  <div class="text-xs uppercase tracking-[0.16em] text-gray-500">
                    {{ t('pages.admin.categoryCreate.entityType') }}
                  </div>
                  <div class="font-medium text-white">{{ typeLabel }}</div>
                </div>

                <div class="space-y-1">
                  <div class="text-xs uppercase tracking-[0.16em] text-gray-500">
                    ID
                  </div>
                  <div class="font-mono text-xs text-white/80">
                    {{ category.id }}
                  </div>
                </div>

                <div class="space-y-1">
                  <div class="text-xs uppercase tracking-[0.16em] text-gray-500">
                    {{ t('common.status') }}
                  </div>
                  <div class="font-medium" :class="isActive ? 'text-emerald-300' : 'text-amber-300'">
                    {{ isActive ? t('common.categoryStatuses.active') : t('common.categoryStatuses.inactive') }}
                  </div>
                </div>

                <div class="rounded-xl border border-dark-700 bg-dark-700/40 p-3 text-xs leading-5 text-gray-400">
                  <p>{{ t('pages.admin.categoryEdit.summaryHint') }}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>

      <ErrorBanner v-else-if="errorMessage" :message="errorMessage" />
    </div>
  </section>
</template>
