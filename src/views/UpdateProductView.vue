<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FileUploader from '@/components/FileUploader.vue'
import Loader from '@/components/Loader.vue'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import type { ProductEdit } from '@/validation/product/product'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { getErrorMessage } from '@/utils/errorsMap'
import { X } from 'lucide-vue-next'

const API_HOST = import.meta.env.VITE_API_HOST
const route = useRoute()
const { t } = useI18n()

const title = ref('')
const description = ref('')
const price = ref('')
const productDataString = ref('')
const newImages = ref<File[]>([])
const existingImages = ref<{ id: string; image_url: string }[]>([])
const imagesToDelete = ref<string[]>([])
const sended = ref(false)
const errorMessage = ref('')
const productData = ref<ProductEdit | null>(null)
const isLoadingProduct = ref(true)

const productId = computed(() => route.params.productId as string)

const store = useUserStore()
const user = await store.getUser()

// Максимальное количество новых файлов с учетом существующих
const computedMaxNewFiles = computed(() => {
  const currentExisting = existingImages.value.length
  return Math.max(0, 8 - currentExisting)
})

const totalImagesAfterUpdate = computed(() => {
  return existingImages.value.length + newImages.value.length
})

// Удаление существующего изображения
function deleteExistingImage(id: string) {
  const index = existingImages.value.findIndex(img => img.id === id)
  if (index !== -1) {
    existingImages.value.splice(index, 1)
    imagesToDelete.value.push(id)
  }
}

onMounted(async () => {
  try {
    await store.fetchUser()
    
    // Загружаем данные товара для редактирования
    productData.value = await productService.getProductEditDataById(productId.value)
    
    if (!productData.value) {
      errorMessage.value = t('pages.forms.editProduct.productNotFound')
      return
    }

    // Инициализируем поля данными товара
    title.value = productData.value.title
    description.value = productData.value.description
    price.value = productData.value.price.toString()
    productDataString.value = productData.value.product_data_string
    existingImages.value = [...productData.value.images]

  } catch (err: any) {
    console.error('Ошибка загрузки данных:', err)
    if (err?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(err.response.data.detail, t)
    } else {
      errorMessage.value = t('pages.forms.editProduct.errorLoadingData')
    }
  } finally {
    isLoadingProduct.value = false
  }
})

async function updateProduct() {
  errorMessage.value = ''

  // Валидация
  if (!title.value || !description.value || !price.value || !productDataString.value) {
    errorMessage.value = t('common.fillAllFields')
    return
  }

  // Проверка количества изображений - должно быть хотя бы одно
  if (totalImagesAfterUpdate.value === 0) {
    errorMessage.value = t('pages.forms.editProduct.atLeastOneImage')
    return
  }

  // Проверка максимального количества изображений
  if (totalImagesAfterUpdate.value > 8) {
    errorMessage.value = t('pages.forms.editProduct.maxImagesExceeded', { max: 8 })
    return
  }

  sended.value = true
  try {
    const productDataObj = {
      title: title.value,
      description: description.value,
      price: Number(price.value),
      product_data: productDataString.value,
      category_id: productData.value!.category.id,
    }

    const result = await productService.updateProduct(
      productDataObj,
      productId.value, 
      newImages.value,
      imagesToDelete.value
    )

    if (result) {
      router.push(`/product/${productId.value}`)
    } else {
      errorMessage.value = t('pages.forms.editProduct.errorUpdatingProduct')
    }
  } catch (err: any) {
    console.error('Ошибка при обновлении товара:', err)
    // Используем getErrorMessage для обработки ошибок
    if (err?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(err.response.data.detail, t)
    } else if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
      // Обработка ошибок валидации в виде массива
      const errors = err.response.data.detail.map((e: any) => e.msg).join(', ')
      errorMessage.value = `${t('common.validationErrors')} ${errors}`
    } else {
      errorMessage.value = t('pages.forms.editProduct.errorUpdatingProduct')
    }
  } finally {
    sended.value = false
  }
}
</script>

<template>
  <div class="no-scrollbar h-full w-full flex flex-col items-center overflow-scroll pb-36">
    <div class="max-w-md w-full border border-dark-700 rounded-2xl p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.forms.editProduct.title') }}
      </h1>

      <Loader v-if="isLoadingProduct"/>

      <template v-else>
        <!-- Информация о категории (только для просмотра) -->
        <div>
          <label class="mb-2 block text-sm text-gray-300">{{ t('common.category') }}</label>
          <div class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-gray-300">
            {{ productData?.category.name }}
          </div>
          <p class="text-xs text-gray-400 mt-1">{{ $t('pages.forms.editProduct.categoryCannotBeChanged') }}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label for="title" class="mb-2 block text-sm text-gray-300">{{ $t('pages.forms.createProduct.productName') }}</label>
            <input
              id="title"
              v-model="title"
              type="text"
              class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-mainText"
            />
          </div>

          <div>
            <label for="description" class="mb-2 block text-sm text-gray-300">{{ t('common.description') }}</label>
            <textarea
              id="description"
              v-model="description"
              rows="4"
              class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-mainText max-h-52"
            ></textarea>
          </div>

          <div>
            <label for="price" class="mb-2 block text-sm text-gray-300">{{ $t('common.price') }}</label>
            <input
              id="price"
              v-model="price"
              type="number"
              min="1"
              class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-mainText"
            />
          </div>

          <div>
            <label for="productData" class="mb-2 block text-sm text-gray-300">{{ $t('pages.forms.createProduct.productData') }}</label>
            <textarea
              id="productData"
              v-model="productDataString"
              rows="4"
              class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-mainText max-h-36"
            ></textarea>
          </div>

          <!-- Существующие изображения -->
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('pages.forms.editProduct.currentImages') }}</label>
            <div v-if="existingImages.length > 0" class="grid grid-cols-3 gap-2 mb-4">
              <div
                v-for="image in existingImages"
                :key="image.id"
                class="relative group"
              >
                <img
                  :src="`${API_HOST}${image.image_url}`"
                  class="w-full h-20 object-cover rounded-lg border border-dark-600"
                  alt="Product image"
                />

                <button
                  @click="deleteExistingImage(image.id)"
                  class="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-100 transition-opacity"
                >
                  <X />
                </button>
              </div>
            </div>
            <p v-else class="text-gray-400 text-sm mb-4">{{ $t('pages.forms.editProduct.noCurrentImages') }}</p>
          </div>

          <!-- Загрузка новых изображений -->
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('pages.forms.editProduct.newImages') }}</label>
            <FileUploader 
              v-model="newImages" 
              :max-files="computedMaxNewFiles" 
            />
          </div>
        </div>

        <button
          type="button"
          :disabled="sended || totalImagesAfterUpdate === 0"
          class="w-full rounded-lg bg-blue-600 py-2 text-mainText font-semibold hover:bg-blue-700 disabled:opacity-50"
          @click="updateProduct"
        >
          {{ sended ? t('pages.forms.editProduct.saving') : t('pages.forms.editProduct.save') }}
        </button>

        <ErrorBanner v-if="errorMessage" :message="errorMessage" />
      </template>
    </div>
  </div>
</template>