<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import type { z } from 'zod'
import {
  CategorySchema,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
} from '@/validation/category/category'
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ErrorBanner from '@/components/ErrorBanner.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import TheInput from '@/components/TheInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import FileUploader from '@/components/FileUploader.vue'
import { Loader2, X } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'

type CategoryRead = z.infer<typeof CategorySchema>

const API_HOST = import.meta.env.VITE_API_HOST

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const categoryId = route.params.id as string

const category = ref<CategoryRead | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const name = ref('')
const description = ref('')
const isActive = ref<boolean>(false)

const existingImage = ref<string | null>(null)
const newImage = ref<File[]>([])
const existingBanner = ref<string | null>(null)
const newBanner = ref<File[]>([])

const hasImage = computed(() => {
  return !!existingImage.value || newImage.value.length > 0
})

watch(newImage, (files) => {
  if (files.length > 0) {
    existingImage.value = null
  }
})

watch(newBanner, (files) => {
  if (files.length > 0) {
    existingBanner.value = null
  }
})

async function loadCategory() {
  try {
    isLoading.value = true

    const data = await adminService.getCategoryData(categoryId)
    if (!data) return

    category.value = data
    name.value = data.name
    description.value = data.description ?? ''
    existingImage.value = data.image_url
    existingBanner.value = data.banner_url ?? null
    isActive.value = data.is_active
  } catch (e) {
    console.error(e)
    errorMessage.value = t('pages.admin.editCategory.errorLoading')
  } finally {
    isLoading.value = false
  }
}

function cancel() {
  router.push('/admin/categories')
}

function deleteImage() {
  existingImage.value = null
}

async function saveCategory() {
  try {
    isSaving.value = true
    errorMessage.value = ''
    const normalizedName = name.value.trim()
    const normalizedDescription = description.value.trim()

    if (!normalizedName) {
      errorMessage.value = t('pages.admin.editCategory.nameRequired')
      return
    }

    if (!hasImage.value) {
      errorMessage.value = t('pages.admin.editCategory.imageRequired')
      return
    }

    const success = await adminService.updateCategoryData(
      categoryId,
      normalizedName,
      normalizedDescription,
      isActive.value,
      newImage.value[0] ?? null,
      newBanner.value[0] ?? null,
    )

    if (!success) {
      errorMessage.value = t('pages.admin.editCategory.errorSaving')
      return
    }

    successMessage.value = t('common.saved')
    setTimeout(() => router.push('/admin/categories'), 1000)
  } catch (e) {
    console.error(e)
    errorMessage.value = t('pages.admin.editCategory.errorSaving')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadCategory)
</script>

<template>
  <div class=" h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-3 md:pt-4">
    <div class="w-full">
      <BackButton/>
    </div>
    <div class="max-w-md w-full border border-dark-700 rounded-2xl bg-background p-6 sm:p-8 space-y-6">
      <div class="text-center">
        <div class="flex gap-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-mainText">
            {{ $t('pages.admin.editCategory.title') }}
          </h1>
        </div>
        <p v-if="category" class="text-text-secondary mt-2">
          {{ $t('pages.admin.editCategory.editing') }}: {{ category.name }}
        </p>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
        <span class="ml-3 text-text-secondary">{{ $t('common.loading') }}</span>
      </div>

      <form v-else @submit.prevent="saveCategory" class="space-y-4">

        <div>
          <label class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.name') }}
          </label>
          <TheInput v-model="name" type="text" :maxlength="CATEGORY_NAME_MAX_LENGTH" required />
        </div>

        <div>
          <label class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.description') }}
          </label>
          <textarea v-model="description" rows="3" :maxlength="CATEGORY_DESCRIPTION_MAX_LENGTH"
            class="w-full max-h-28 px-3 py-2 border border-dark-700 rounded-lg bg-dark-600 text-mainText resize-none" />
        </div>

        <div>
          <label class="mb-2 block text-sm text-text-secondary">
            {{ $t('common.image') }}
          </label>

          <div v-if="existingImage" class="relative w-32 h-32 mb-3">
            <img :src="`${API_HOST}${existingImage}`"
              class="w-full h-full object-cover rounded-lg border border-dark-600" />
            <button type="button" @click="deleteImage"
              class="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
              <X class="w-3 h-3 text-white" />
            </button>
          </div>

          <p v-else class="text-sm text-text-secondary mb-2">
            {{ $t('pages.admin.editCategory.noImage') }}
          </p>

          <FileUploader v-model="newImage" :max-files="1" />

          <p v-if="!hasImage" class="text-sm text-red-500 mt-2">
            {{ $t('pages.admin.editCategory.imageRequired') }}
          </p>
        </div>

        <div>
          <label class="mb-2 block text-sm text-text-secondary">
            {{ $t('common.banner') }}
          </label>

          <div v-if="existingBanner" class="relative w-full h-28 mb-3 overflow-hidden rounded-lg border border-dark-600">
            <img :src="`${API_HOST}${existingBanner}`"
              class="w-full h-full object-cover" />
          </div>

          <p v-else class="text-sm text-text-secondary mb-2">
            {{ $t('common.noImage') }}
          </p>

          <FileUploader v-model="newBanner" :max-files="1" />
        </div>

        <div class="flex items-center gap-3">
          <Checkbox v-model="isActive" />
          <label class="text-sm text-text-secondary">
            {{ $t('common.isActive') }}
          </label>
        </div>

        <div v-if="category" class="border-t border-dark-700 pt-4 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-text-secondary">ID</span>
            <span class="font-mono text-xs text-mainText">{{ category.id }}</span>
          </div>
        </div>

        <ErrorBanner :message="errorMessage" />
        <SuccessMessage v-if="successMessage" :success-message="successMessage" />

        <div class="flex gap-3 pt-4">
          <button type="button" @click="cancel" class="admin-btn flex-1"
            :disabled="isSaving">
            {{ $t('common.cancel') }}
          </button>

          <button type="submit" :disabled="isSaving || !hasImage"
            class="admin-btn admin-btn-primary flex-1">
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            {{ isSaving ? $t('common.loading') : $t('common.save') }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>
