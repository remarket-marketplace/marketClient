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
import { X, Info, AlertCircle, Tag, Package, Percent, Calculator } from 'lucide-vue-next'
import ProductStatusTag from '@/components/ProductStatusTag.vue'

const API_HOST = import.meta.env.VITE_API_HOST
const route = useRoute()
const { t } = useI18n()

const title = ref('')
const description = ref('')
const price = ref('')
const productDataString = ref('')
const newImages = ref<File[]>([])
const existingImages = ref<{ id: string; image_url: string }[]>([])
const count = ref<number>()
const imagesToDelete = ref<string[]>([])
const sended = ref(false)
const errorMessage = ref('')
const productData = ref<ProductEdit | null>(null)
const isLoadingProduct = ref(true)
const commissionInterest = ref<number | null>(null)

const productId = computed(() => route.params.productId as string)

const store = useUserStore()
const user = await store.getUser()

// Максимальное количество новых файлов с учетом существующих
const computedMaxNewFiles = computed(() => {
  const remainingExisting = existingImages.value.length
  return Math.max(0, 8 - remainingExisting)
})

const totalImagesAfterUpdate = computed(() => {
  const remainingExisting = existingImages.value.length
  return remainingExisting + newImages.value.length
})

// Calculate seller's final amount
const sellerAmount = computed(() => {
  if (!price.value || !commissionInterest.value) return 0
  const total = Number(price.value) * (count.value || 1)
  const commission = total * (commissionInterest.value / 100)
  return Math.max(0, total - commission)
})

// Price formatting
const formatPrice = (value: number) => {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '₽'
}

// Валидация формы
const isFormValid = computed(() => {
  return title.value.trim() &&
    description.value.trim() &&
    price.value &&
    productDataString.value.trim() &&
    totalImagesAfterUpdate.value > 0
})

onMounted(async () => {
  try {
    await store.fetchUser()

    // Загружаем данные товара для редактирования
    productData.value = await productService.getProductEditDataById(productId.value)

    if (!productData.value) {
      errorMessage.value = t('pages.forms.editProduct.productNotFound')
      return
    }

    // Получаем комиссию
    const commission = await productService.getCommissionInterest()
    commissionInterest.value = Number(commission)

    // Инициализируем поля данными товара
    title.value = productData.value.title
    description.value = productData.value.description
    price.value = productData.value.price.toString()
    productDataString.value = productData.value.product_data_string ?? ''
    existingImages.value = [...productData.value.images]
    count.value = productData.value.count

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

// Удаление существующего изображения
function deleteExistingImage(id: string) {
  const index = existingImages.value.findIndex(img => img.id === id)
  if (index !== -1) {
    imagesToDelete.value.push(id)
    existingImages.value.splice(index, 1)
  }
}

async function updateProduct() {
  errorMessage.value = ''

  if (!isFormValid.value) {
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
      count: count.value
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
    if (err?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(err.response.data.detail, t)
    } else if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
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
  <div v-if="isLoadingProduct" class="w-full h-full flex items-center justify-center">
    <Loader />
  </div>

  <div v-else-if="productData" class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <h1 class="text-2xl font-bold text-white">
        {{ $t('pages.forms.editProduct.title') }}
      </h1>
      <p class="mt-2 text-sm text-gray-400">
        {{ $t('pages.forms.editProduct.subtitle') }}
      </p>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:h-full">
      <!-- Left column - Main form -->
      <div class="lg:flex-1 overflow-y-auto  lg:pr-6 lg:pt-6">
        <div class="px-4 lg:px-0 pb-24 lg:pb-6 space-y-6">
          <!-- Desktop header -->
          <div class="hidden lg:block">
            <h1 class="text-2xl font-bold text-white">
              {{ $t('pages.forms.editProduct.title') }}
            </h1>
            <p class="mt-2 text-sm text-gray-400">
              {{ $t('pages.forms.editProduct.subtitle') }}
            </p>
          </div>

          <!-- Current images -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.editProduct.currentImages') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400">
                  {{ existingImages.length }}/8
                </span>
                <span v-if="imagesToDelete.length > 0" class="text-xs text-red-400">
                  {{ $t('pages.forms.editProduct.deleting') }}: {{ imagesToDelete.length }}
                </span>
              </div>
            </div>

            <div v-if="existingImages.length > 0"
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div v-for="image in existingImages" :key="image.id"
                class="group relative aspect-square rounded-lg overflow-hidden border border-dark-700 bg-dark-600 transition-all duration-200 hover:border-red-500">
                <img :src="`${API_HOST}${image.image_url}`" :alt="'Product image'"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                <!-- Overlay with delete button -->
                <div
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <button type="button" @click="deleteExistingImage(image.id)"
                    class="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all duration-200"
                    :title="$t('common.delete')">
                    <X class="w-4 h-4" />
                  </button>
                </div>

                <!-- Deleted indicator -->
                <div v-if="imagesToDelete.includes(image.id)"
                  class="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                  <span class="text-white text-sm font-medium">{{ $t('common.deleted') }}</span>
                </div>
              </div>
            </div>

            <div v-else class="py-6 text-center border border-dashed border-dark-700 rounded-lg">
              <p class="text-gray-400 text-sm">{{ $t('pages.forms.editProduct.noCurrentImages') }}</p>
            </div>

            <p class="text-xs text-gray-400">
              {{ $t('pages.forms.editProduct.clickToDelete') }}
            </p>
          </div>

          <!-- New images upload -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.editProduct.newImages') }}
              </label>
              <span v-if="computedMaxNewFiles > 0" class="text-xs text-gray-400">
                {{ $t('common.remaining') }}: {{ computedMaxNewFiles }}
              </span>
            </div>

            <FileUploader v-model="newImages" :max-files="computedMaxNewFiles"
              :hint="$t('pages.forms.createProduct.imageHint')" />

            <div class="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle class="w-3 h-3 text-yellow-400" />
              <span>
                {{ $t('pages.forms.editProduct.totalImagesInfo') }}:
                <span :class="totalImagesAfterUpdate > 8 ? 'text-red-400' : 'text-green-400'">
                  {{ totalImagesAfterUpdate }}/8
                </span>
              </span>
            </div>
          </div>

          <!-- Title -->
          <div class="space-y-2">
            <label for="title" class="text-sm font-medium text-gray-300">
              {{ $t('pages.forms.createProduct.productName') }}
              <span class="text-xs text-red-400 ml-1">*</span>
            </label>
            <input id="title" v-model="title" type="text" maxlength="50" minlength="10"
              :placeholder="$t('pages.forms.createProduct.productNamePlaceholder')"
              class="w-full outline-none rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500 " />
            <p class="text-xs text-gray-400 text-right">
              {{ title.length }}/50
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <label for="description" class="text-sm font-medium text-gray-300">
              {{ $t('common.description') }}
              <span class="text-xs text-red-400 ml-1">*</span>
            </label>
            <textarea id="description" v-model="description" rows="8" maxlength="500" minlength="10"
              :placeholder="$t('pages.forms.createProduct.descriptionPlaceholder')"
              class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500 resize-none"></textarea>
            <p class="text-xs text-gray-400 text-right">
              {{ description.length }}/500
            </p>
          </div>

          <!-- Product data -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label for="productData" class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.createProduct.productData') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <div class="flex items-center gap-1 text-xs text-blue-400">
                <Info class="w-3 h-3" />
                <span>{{ $t('pages.forms.createProduct.productDataHint') }}</span>
              </div>
            </div>
            <textarea id="productData" v-model="productDataString" rows="6" maxlength="300"
              :placeholder="$t('pages.forms.createProduct.productDataPlaceholder')"
              class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500 resize-none font-mono"></textarea>
            <p class="text-xs text-gray-400 text-right">
              {{ productDataString.length }}/300
            </p>
          </div>

          <!-- Quantity -->
          <div class="space-y-2">
            <label for="count" class="text-sm font-medium text-gray-300">
              {{ $t('pages.forms.createProduct.count') }}
            </label>
            <div class="relative">
              <input id="count" v-model.number="count" type="number" min="1" max="100000"
                class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white" />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {{ $t('common.items') }}
              </div>
            </div>
          </div>

          <!-- Error banner -->
          <ErrorBanner v-if="errorMessage" :message="errorMessage" />
        </div>
      </div>

      <!-- Right sidebar - Fixed on desktop, normal flow on mobile -->
      <div
        class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-full lg:border-l border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pl-6 pt-6">
        <div class="border-t lg:border-t-0 pt-6 lg:pt-0">
          <div class="space-y-6 pb-6 lg:pb-0">
            <!-- Product price -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label for="price" class="text-sm font-medium text-gray-300">
                  {{ $t('common.price') }}
                  <span class="text-xs text-red-400 ml-1">*</span>
                </label>
                <div class="flex items-center gap-2">
                  <Calculator class="w-4 h-4 text-blue-400" />
                  <span class="text-xs text-gray-400">₽</span>
                </div>
              </div>
              <div class="relative">
                <input id="price" v-model.number="price" type="number" min="1"
                  :placeholder="$t('pages.forms.createProduct.pricePlaceholder')"
                  class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-lg font-semibold text-white" />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  ₽
                </div>
              </div>
            </div>

            <!-- Calculations -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-5 space-y-4">
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <Percent class="w-4 h-4 text-blue-400" />
                {{ $t('pages.forms.createProduct.calculations') }}
              </h3>

              <div class="space-y-3">
                <!-- Total price -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('pages.forms.createProduct.totalPrice') }}:</span>
                  <span class="text-sm font-medium text-white">
                    {{ formatPrice(Number(price) * (count || 1)) }}
                  </span>
                </div>

                <!-- Platform commission -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">
                    {{ $t('pages.forms.createProduct.commission') }}:
                    <span v-if="commissionInterest" class="text-blue-400 ml-1">
                      ({{ commissionInterest }}%)
                    </span>
                  </span>
                  <span class="text-sm font-medium text-red-400">
                    -{{ formatPrice((Number(price) * (count || 1)) * (commissionInterest! / 100)) }}
                  </span>
                </div>

                <!-- Divider -->
                <div class="border-t border-dark-600 my-2"></div>

                <!-- Seller amount -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-300">
                    {{ $t('pages.forms.createProduct.sellerReceives') }}:
                  </span>
                  <span class="text-lg font-bold text-green-400">
                    {{ formatPrice(sellerAmount) }}
                  </span>
                </div>
              </div>

              <!-- Commission note -->
              <div v-if="commissionInterest" class="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                <p class="text-xs text-blue-300 leading-relaxed">
                  {{ $t('pages.forms.createProduct.commissionNote', { percent: commissionInterest }) }}
                </p>
              </div>
            </div>

            <!-- Product info -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-5 space-y-4">
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <Package class="w-4 h-4 text-blue-400" />
                {{ $t('pages.forms.editProduct.productInfo') }}
              </h3>

              <div class="space-y-3">
                <!-- Category -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('common.category') }}:</span>
                  <div class="flex items-center gap-2">
                    <Tag class="w-3 h-3 text-blue-400" />
                    <span class="text-sm font-medium text-white">
                      {{ productData.category.name }}
                    </span>
                  </div>
                </div>

                <!-- Current price -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('pages.forms.editProduct.currentPrice') }}:</span>
                  <span class="text-sm font-medium text-green-400">
                    {{ formatPrice(productData.price) }}
                  </span>
                </div>

                <!-- Current quantity -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('common.quantity') }}:</span>
                  <span class="text-sm font-medium text-white">
                    {{ productData.count }} {{ $t('common.items') }}
                  </span>
                </div>

                <!-- Images info -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('common.images') }}:</span>
                  <div class="flex flex-col items-end">
                    <span class="text-sm font-medium text-white">
                      {{ totalImagesAfterUpdate }}/8
                    </span>
                    <span v-if="imagesToDelete.length > 0" class="text-xs text-red-400">
                      -{{ imagesToDelete.length }} {{ $t('pages.forms.editProduct.deleting') }}
                    </span>
                  </div>
                </div>

                <!-- Status -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{{ $t('common.status') }}:</span>
                  <ProductStatusTag :product-status="productData.status" />
                </div>
              </div>

              <!-- Category note -->
              <div class="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                <p class="text-xs text-blue-300 leading-relaxed">
                  {{ $t('pages.forms.editProduct.categoryCannotBeChanged') }}
                </p>
              </div>
            </div>

            <!-- Save button -->
            <button type="button" :disabled="sended || !isFormValid"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
              @click="updateProduct">
              <span v-if="sended" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                {{ $t('pages.forms.editProduct.saving') }}
              </span>
              <span v-else>
                {{ $t('pages.forms.editProduct.save') }}
              </span>
            </button>

            <!-- Info note -->
            <div class="text-xs text-gray-400 space-y-2">
              <div class="flex items-start gap-2 p-3 bg-dark-700/30 rounded-lg">
                <AlertCircle class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p>
                  {{ $t('pages.forms.editProduct.saveNote') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Remove number input arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

/* Custom scrollbar for left column on desktop */
@media (min-width: 1024px) {
  .lg\:overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
    margin: 10px 0;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}

/* Ensure proper scrolling on mobile */
@media (max-width: 1023px) {
  .lg\:h-full {
    height: auto;
  }

  .lg\:sticky {
    position: static;
  }
}
</style>