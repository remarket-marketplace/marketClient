<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import FileUploader from '@/components/FileUploader.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import type { Category } from '@/validation/category/category'
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
} from '@/validation/category/category'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ImagePlus, Layers3, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const nameRu = ref('')
const nameEn = ref('')
const description = ref('')
const newImage = ref<File[]>([])
const newBanner = ref<File[]>([])
const parentCategory = ref<Category | null>(null)
const isLoadingParent = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const parentCategoryId = computed(() => {
  const value = route.query.parentId
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim()
  }
  return ''
})

const isSubcategory = computed(() => Boolean(parentCategoryId.value))
const hasImage = computed(() => newImage.value.length > 0)
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
    ? t('pages.admin.categoryCreate.subcategoryTitle')
    : t('pages.admin.categoryCreate.categoryTitle')
))

const pageSubtitle = computed(() => (
  isSubcategory.value
    ? t('pages.admin.categoryCreate.subcategorySubtitle')
    : t('pages.admin.categoryCreate.categorySubtitle')
))

async function loadParentCategory(): Promise<void> {
  if (!parentCategoryId.value) {
    parentCategory.value = null
    return
  }

  try {
    isLoadingParent.value = true
    const response = await adminService.getCategoryData(parentCategoryId.value)
    if (!response) {
      errorMessage.value = t('pages.admin.categoryCreate.errorLoadingParent')
      return
    }
    parentCategory.value = response
  } catch (error) {
    console.error('Failed to load parent category:', error)
    errorMessage.value = t('pages.admin.categoryCreate.errorLoadingParent')
  } finally {
    isLoadingParent.value = false
  }
}

async function saveCategory(): Promise<void> {
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
    const createdCategory = await adminService.createCategoryData(
      normalizedNameRu.value,
      normalizedNameEn.value,
      normalizedDescription.value,
      newImage.value[0] ?? null,
      newBanner.value[0] ?? null,
      parentCategory.value?.id ?? null,
    )

    if (!createdCategory) {
      errorMessage.value = t('pages.admin.categoryCreate.errorSaving')
      return
    }

    successMessage.value = t('pages.admin.categoryCreate.success')
    window.setTimeout(() => {
      void router.push(`/admin/categories/edit/${createdCategory.id}`)
    }, 700)
  } catch (error) {
    console.error('Failed to create category:', error)
    errorMessage.value = t('pages.admin.categoryCreate.errorSaving')
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadParentCategory()
})
</script>

<template>
  <section class="w-full h-full overflow-scroll no-scrollbar pb-20">
    <div class="mx-auto w-full max-w-[1280px] px-4 py-4 lg:px-6 lg:py-6">
      <div class="mb-5">
        <BackButton />
      </div>

      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
          {{ pageTitle }}
        </h1>
        <p class="max-w-2xl text-sm leading-6 text-gray-400">
          {{ pageSubtitle }}
        </p>
      </div>

      <div class="mt-8">
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

            <div
              v-if="isSubcategory"
              class="mb-4 rounded-xl border border-dark-700 bg-dark-700/40 px-4 py-3"
            >
              <div class="text-xs uppercase tracking-[0.16em] text-gray-500">
                {{ t('pages.admin.categoryCreate.parentCategory') }}
              </div>
              <div v-if="isLoadingParent" class="mt-2 inline-flex items-center gap-2 text-sm text-gray-400">
                <Loader2 class="h-4 w-4 animate-spin" />
                {{ t('common.loading') }}
              </div>
              <div v-else class="mt-2 text-sm font-medium text-white">
                {{ parentCategory?.name || t('common.notSpecified') }}
              </div>
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
                <FileUploader v-model="newImage" :max-files="1" />
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-gray-300">
                  {{ t('common.banner') }}
                </label>
                <FileUploader v-model="newBanner" :max-files="1" />
              </div>
            </div>
          </section>

          <div class="rounded-2xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5">
            <div class="rounded-xl border border-dark-700 bg-dark-700/40 p-3 text-xs leading-5 text-gray-400">
              <p>{{ t('pages.admin.categoryCreate.rulesTitle') }}</p>
              <p class="mt-2">{{ t('pages.admin.categoryCreate.rulesBody') }}</p>
            </div>
          </div>

          <ErrorBanner v-if="errorMessage" :message="errorMessage" />
          <SuccessMessage v-if="successMessage" :success-message="successMessage" />

          <div class="flex justify-end">
            <button
              type="button"
              class="market-btn market-btn-primary min-w-[220px] rounded-xl px-5 py-3"
              :disabled="isSaving || !isFormValid || isLoadingParent"
              @click="saveCategory"
            >
              <span v-if="isSaving" class="inline-flex items-center gap-2">
                <Loader2 class="h-4 w-4 animate-spin" />
                {{ t('common.loading') }}
              </span>
              <span v-else>{{ t('common.create') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
