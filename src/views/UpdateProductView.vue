<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FileUploader from '@/components/FileUploader.vue'
import Loader from '@/components/Loader.vue'
import Checkbox from '@/components/Checkbox.vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { ProductEdit } from '@/validation/product/product'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getErrorMessage } from '@/utils/errorsMap'
import { X, Info, AlertCircle, Percent, Calculator } from 'lucide-vue-next'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  getUsdRubRate,
  preferredCurrency,
  setUsdRubRate,
} from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'

const API_HOST = import.meta.env.VITE_API_HOST
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const title = ref('')
const description = ref('')
const price = ref<string | number>('')
const productDataString = ref('')
const autoDelivery = ref<boolean>(true)
const newImages = ref<File[]>([])
const existingImages = ref<{ id: string; image_url: string }[]>([])
const count = ref<number>()
const imagesToDelete = ref<string[]>([])
const sended = ref(false)
const errorMessage = ref('')
const submitAttempted = ref(false)
const productData = ref<ProductEdit | null>(null)
const isLoadingProduct = ref(true)
const commissionInterest = ref<number | null>(null)

const selectedCurrency = computed(() => preferredCurrency.value)
const currencySymbol = computed(() => getCurrencySymbol(selectedCurrency.value))
const usdRubRate = computed(() => getUsdRubRate())

const PRODUCT_LIMITS = {
  title: { min: 10, max: 50 },
  description: { min: 10, max: 1200 },
  productData: { min: 10, max: 128 },
  count: { min: 1, max: 5000 },
  images: { min: 1, max: 10 },
}
const DEFAULT_PRICE_RANGE_RUB = { min: 10, max: 1000000 }
const minPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.min)
const maxPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.max)

function getMultipartTransportLength(value: string): number {
  // Multipart form payload normalizes LF to CRLF, so backend sees this length.
  return value.replace(/\r?\n/g, '\r\n').length
}

const productId = computed(() => route.params.productId as string)

const store = useUserStore()

const computedMaxNewFiles = computed(() => {
  const remainingExisting = existingImages.value.length
  return Math.max(0, PRODUCT_LIMITS.images.max - remainingExisting)
})

const totalImagesAfterUpdate = computed(() => {
  const remainingExisting = existingImages.value.length
  return remainingExisting + newImages.value.length
})

const normalizedTitle = computed(() => title.value.trim())
const normalizedDescription = computed(() => description.value.trim())
const normalizedProductData = computed(() => productDataString.value.trim())
const normalizedDescriptionLength = computed(() => getMultipartTransportLength(normalizedDescription.value))
const normalizedProductDataLength = computed(() => getMultipartTransportLength(normalizedProductData.value))
const priceValueInput = computed(() => Number(price.value))
const priceValueRub = computed(() => {
  if (!Number.isFinite(priceValueInput.value)) return Number.NaN
  return convertCurrencyAmount(priceValueInput.value, selectedCurrency.value, 'RUB')
})
const countValue = computed(() => Number(count.value))

const titleLengthValid = computed(() => (
  normalizedTitle.value.length >= PRODUCT_LIMITS.title.min
  && normalizedTitle.value.length <= PRODUCT_LIMITS.title.max
))
const descriptionLengthValid = computed(() => (
  normalizedDescriptionLength.value >= PRODUCT_LIMITS.description.min
  && normalizedDescriptionLength.value <= PRODUCT_LIMITS.description.max
))
const productDataLengthValid = computed(() => (
  normalizedProductDataLength.value >= PRODUCT_LIMITS.productData.min
  && normalizedProductDataLength.value <= PRODUCT_LIMITS.productData.max
))
const productDataValidForForm = computed(() => (
  !autoDelivery.value || productDataLengthValid.value
))

const priceInputMin = computed(() => {
  if (selectedCurrency.value === 'RUB') return minPriceRub.value
  return Number((minPriceRub.value / usdRubRate.value).toFixed(2))
})

const priceInputMax = computed(() => {
  if (selectedCurrency.value === 'RUB') return maxPriceRub.value
  return Number((maxPriceRub.value / usdRubRate.value).toFixed(2))
})

const priceInputStep = computed(() => (selectedCurrency.value === 'USD' ? 0.01 : 1))

const priceValid = computed(() => (
  Number.isFinite(priceValueInput.value)
  && priceValueInput.value >= priceInputMin.value
  && priceValueInput.value <= priceInputMax.value
  && Number.isFinite(priceValueRub.value)
  && priceValueRub.value >= minPriceRub.value
  && priceValueRub.value <= maxPriceRub.value
))
const countValid = computed(() => (
  Number.isFinite(countValue.value)
  && countValue.value >= PRODUCT_LIMITS.count.min
  && countValue.value <= PRODUCT_LIMITS.count.max
))
const imagesCountValid = computed(() => (
  totalImagesAfterUpdate.value >= PRODUCT_LIMITS.images.min
  && totalImagesAfterUpdate.value <= PRODUCT_LIMITS.images.max
))

const isFormValid = computed(() => (
  titleLengthValid.value
  && descriptionLengthValid.value
  && productDataValidForForm.value
  && priceValid.value
  && countValid.value
  && imagesCountValid.value
))

const showTitleError = computed(() => submitAttempted.value || normalizedTitle.value.length > 0)
const showDescriptionError = computed(() => submitAttempted.value || normalizedDescription.value.length > 0)
const showProductDataError = computed(() => (
  autoDelivery.value && (submitAttempted.value || normalizedProductData.value.length > 0)
))
const showPriceError = computed(() => submitAttempted.value || String(price.value).trim().length > 0)
const showCountError = computed(() => submitAttempted.value || Number.isFinite(countValue.value))
const showImagesError = computed(() => (
  submitAttempted.value
  || imagesToDelete.value.length > 0
  || newImages.value.length > 0
))

const invalidFieldsCount = computed(() => {
  let countInvalid = 0

  if (!titleLengthValid.value) countInvalid += 1
  if (!descriptionLengthValid.value) countInvalid += 1
  if (autoDelivery.value && !productDataLengthValid.value) countInvalid += 1
  if (!priceValid.value) countInvalid += 1
  if (!countValid.value) countInvalid += 1
  if (!imagesCountValid.value) countInvalid += 1

  return countInvalid
})

const totalPriceInRub = computed(() => priceValueRub.value * (countValue.value || 1))
const commissionAmountInRub = computed(() => {
  if (!commissionInterest.value) return 0
  return totalPriceInRub.value * (commissionInterest.value / 100)
})

const sellerAmount = computed(() => {
  if (!price.value || !commissionInterest.value) return 0
  return Math.max(0, totalPriceInRub.value - commissionAmountInRub.value)
})

const formatPrice = (value: number) => {
  return formatCurrencyAmount(value, {
    fromCurrency: 'RUB',
    currency: selectedCurrency.value,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPriceRangeBound(value: number): string {
  if (selectedCurrency.value === 'USD') {
    return `${value.toFixed(2)} ${currencySymbol.value}`
  }
  return `${Math.round(value)} ${currencySymbol.value}`
}

const priceRangeMinLabel = computed(() => formatPriceRangeBound(priceInputMin.value))
const priceRangeMaxLabel = computed(() => formatPriceRangeBound(priceInputMax.value))

onMounted(async () => {
  try {
    const currencyConfig = await productService.getCurrencyConfig()
    if (currencyConfig?.usd_rub_rate) {
      setUsdRubRate(currencyConfig.usd_rub_rate)
    }
    if (
      currencyConfig
      && Number.isFinite(currencyConfig.min_price_rub)
      && Number.isFinite(currencyConfig.max_price_rub)
      && currencyConfig.min_price_rub > 0
      && currencyConfig.max_price_rub >= currencyConfig.min_price_rub
    ) {
      minPriceRub.value = currencyConfig.min_price_rub
      maxPriceRub.value = currencyConfig.max_price_rub
    }

    await store.fetchUser()

    productData.value = await productService.getProductEditDataById(productId.value)

    if (!productData.value) {
      errorMessage.value = t('pages.forms.editProduct.productNotFound')
      return
    }

    const commission = await productService.getCommissionInterest()
    commissionInterest.value = Number(commission)

    title.value = productData.value.title
    description.value = productData.value.description
    price.value = convertCurrencyAmount(productData.value.price, 'RUB', selectedCurrency.value).toString()
    productDataString.value = productData.value.product_data_string ?? ''
    autoDelivery.value = productData.value.auto_delivery
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

watch(selectedCurrency, (nextCurrency, prevCurrency) => {
  if (!prevCurrency || nextCurrency === prevCurrency) return

  const currentInput = Number(price.value)
  if (!Number.isFinite(currentInput)) return

  const converted = convertCurrencyAmount(currentInput, prevCurrency, nextCurrency)
  price.value = nextCurrency === 'USD'
    ? converted.toFixed(2)
    : Math.round(converted).toString()
})

function deleteExistingImage(id: string) {
  const index = existingImages.value.findIndex(img => img.id === id)
  if (index !== -1) {
    imagesToDelete.value.push(id)
    existingImages.value.splice(index, 1)
  }
}

async function updateProduct() {
  errorMessage.value = ''
  submitAttempted.value = true

  if (!isFormValid.value) {
    errorMessage.value = t('pages.forms.editProduct.fixFormToSave')
    return
  }

  sended.value = true
  try {
    const productDataObj = {
      title: normalizedTitle.value,
      description: normalizedDescription.value,
      price: Number(price.value),
      price_currency: selectedCurrency.value,
      product_data: autoDelivery.value ? normalizedProductData.value : undefined,
      category_id: productData.value!.category.id,
      count: countValue.value,
      auto_delivery: autoDelivery.value,
    }

    const result = await productService.updateProduct(
      productDataObj,
      productId.value,
      newImages.value,
      imagesToDelete.value,
    )

    if (result) {
      await router.push(`/product/${buildProductKey(result)}`)
    } else {
      errorMessage.value = t('pages.forms.editProduct.errorUpdatingProduct')
    }
  } catch (err: any) {
    console.error('Ошибка при обновлении товара:', err)
    const detail = err?.response?.data?.detail
    if (detail?.error_code) {
      errorMessage.value = getErrorMessage(detail, t)
    } else if (Array.isArray(detail)) {
      const errors = detail.map((e: any) => e.msg).join(', ')
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
  <div
    v-if="isLoadingProduct"
    class="w-full min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center"
  >
    <Loader />
  </div>

  <div v-else-if="productData" class="w-full h-full overflow-scroll no-scrollbar pb-16 md:pb-0">
    <div class="mx-auto w-full max-w-4xl px-4 lg:px-0 lg:pt-6 pb-24 lg:pb-8 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.forms.editProduct.title') }}
        </h1>
        <p class="mt-2 text-sm text-gray-400">
          {{ $t('pages.forms.editProduct.subtitle') }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <span class="text-xs rounded-md border border-dark-600 bg-dark-700/40 px-2 py-1 text-gray-300">
            {{ productData.category.name }}
          </span>
          <ProductStatusTag :product-status="productData.status" />
        </div>
      </div>

      <section class="rounded-xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-300">
            {{ $t('pages.forms.editProduct.currentImages') }}
            <span class="text-xs text-red-400 ml-1">*</span>
          </label>
          <span class="text-xs text-gray-400">
            {{ totalImagesAfterUpdate }}/{{ PRODUCT_LIMITS.images.max }}
          </span>
        </div>

        <div
          v-if="existingImages.length > 0"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          <div
            v-for="image in existingImages"
            :key="image.id"
            class="group relative aspect-square rounded-lg overflow-hidden border border-dark-700 bg-dark-600 transition-all duration-200 hover:border-red-500"
          >
            <img
              :src="`${API_HOST}${image.image_url}`"
              :alt="'Product image'"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center"
            >
              <button
                type="button"
                @click="deleteExistingImage(image.id)"
                class="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all duration-200"
                :title="$t('common.delete')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="py-6 text-center border border-dashed border-dark-700 rounded-lg">
          <p class="text-gray-400 text-sm">{{ $t('pages.forms.editProduct.noCurrentImages') }}</p>
        </div>

        <FileUploader
          v-model="newImages"
          :max-files="computedMaxNewFiles"
          :hint="$t('pages.forms.createProduct.imageHint')"
        />

        <p
          v-if="showImagesError"
          class="text-xs"
          :class="imagesCountValid ? 'text-gray-400' : 'text-red-400'"
        >
          {{
            $t('pages.forms.editProduct.validationImagesRange', {
              min: PRODUCT_LIMITS.images.min,
              max: PRODUCT_LIMITS.images.max,
            })
          }}
        </p>
      </section>

      <section class="rounded-xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5 space-y-5">
        <div class="space-y-2">
          <label for="title" class="text-sm font-medium text-gray-300">
            {{ $t('pages.forms.createProduct.productName') }}
            <span class="text-xs text-red-400 ml-1">*</span>
          </label>
          <input
            id="title"
            v-model="title"
            type="text"
            :maxlength="PRODUCT_LIMITS.title.max"
            :minlength="PRODUCT_LIMITS.title.min"
            :placeholder="$t('pages.forms.createProduct.productNamePlaceholder')"
            class="w-full outline-none rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500"
          />
          <div class="flex items-center justify-between gap-3">
            <p
              v-if="showTitleError"
              class="text-xs"
              :class="titleLengthValid ? 'text-gray-400' : 'text-red-400'"
            >
              {{
                $t('pages.forms.editProduct.validationTitleLength', {
                  min: PRODUCT_LIMITS.title.min,
                  max: PRODUCT_LIMITS.title.max,
                })
              }}
            </p>
            <p class="text-xs text-gray-400 text-right ml-auto">
              {{ title.length }}/{{ PRODUCT_LIMITS.title.max }}
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <label for="description" class="text-sm font-medium text-gray-300">
            {{ $t('common.description') }}
            <span class="text-xs text-red-400 ml-1">*</span>
          </label>
          <textarea
            id="description"
            v-model="description"
            rows="8"
            :maxlength="PRODUCT_LIMITS.description.max"
            :minlength="PRODUCT_LIMITS.description.min"
            :placeholder="$t('pages.forms.createProduct.descriptionPlaceholder')"
            class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500 resize-none"
          ></textarea>
          <div class="flex items-center justify-between gap-3">
            <p
              v-if="showDescriptionError"
              class="text-xs"
              :class="descriptionLengthValid ? 'text-gray-400' : 'text-red-400'"
            >
              {{
                $t('pages.forms.editProduct.validationDescriptionLength', {
                  min: PRODUCT_LIMITS.description.min,
                  max: PRODUCT_LIMITS.description.max,
                })
              }}
            </p>
            <p class="text-xs text-gray-400 text-right ml-auto">
              {{ normalizedDescriptionLength }}/{{ PRODUCT_LIMITS.description.max }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <h4 class="text-sm font-semibold text-white">
                {{ $t('pages.forms.createProduct.autoDelivery') }}
              </h4>
              <p class="text-xs text-gray-400 leading-relaxed">
                {{ $t('pages.forms.createProduct.autoDeliveryHint') }}
              </p>
            </div>
            <Checkbox v-model="autoDelivery" size="lg" />
          </div>
          <div v-if="autoDelivery" class="p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
            <p class="text-xs text-blue-300 leading-relaxed flex items-start gap-2">
              <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
              {{ $t('pages.forms.createProduct.autoDeliveryEnabledHint') }}
            </p>
          </div>
        </div>

        <div v-if="autoDelivery" class="space-y-2">
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

          <textarea
            id="productData"
            v-model="productDataString"
            rows="6"
            :maxlength="PRODUCT_LIMITS.productData.max"
            :minlength="PRODUCT_LIMITS.productData.min"
            :placeholder="$t('pages.forms.createProduct.productDataPlaceholder')"
            class="w-full rounded-lg outline-none bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white placeholder-gray-500 resize-none font-mono"
          ></textarea>
          <div class="flex items-center justify-between gap-3">
            <p
              v-if="showProductDataError"
              class="text-xs"
              :class="productDataLengthValid ? 'text-gray-400' : 'text-red-400'"
            >
              {{
                $t('pages.forms.editProduct.validationProductDataLength', {
                  min: PRODUCT_LIMITS.productData.min,
                  max: PRODUCT_LIMITS.productData.max,
                })
              }}
            </p>
            <p class="text-xs text-gray-400 text-right ml-auto">
              {{ normalizedProductDataLength }}/{{ PRODUCT_LIMITS.productData.max }}
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-dark-700 bg-dark-600/30 p-4 lg:p-5 space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="flex h-6 items-center justify-between">
              <label for="price" class="text-sm font-medium text-gray-300">
                {{ $t('common.price') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <div class="flex items-center gap-2">
                <Calculator class="w-4 h-4 text-blue-400" />
                <span class="text-xs text-gray-400">{{ currencySymbol }}</span>
              </div>
            </div>
            <div class="relative">
              <input
                id="price"
                v-model.number="price"
                type="number"
                :min="priceInputMin"
                :max="priceInputMax"
                :step="priceInputStep"
                :placeholder="$t('pages.forms.createProduct.pricePlaceholder')"
                class="h-12 w-full rounded-lg border border-dark-700 bg-dark-600 px-4 pr-16 text-base font-semibold text-white outline-none"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                {{ currencySymbol }}
              </div>
            </div>
            <p
              v-if="showPriceError"
              class="text-xs"
              :class="priceValid ? 'text-gray-400' : 'text-red-400'"
            >
              {{
                $t('pages.forms.editProduct.validationPriceRange', {
                  min: priceRangeMinLabel,
                  max: priceRangeMaxLabel,
                })
              }}
            </p>
          </div>

          <div class="space-y-3">
            <div class="flex h-6 items-center">
              <label for="count" class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.createProduct.count') }}
              </label>
            </div>
            <div class="relative">
              <input
                id="count"
                v-model.number="count"
                type="number"
                :min="PRODUCT_LIMITS.count.min"
                :max="PRODUCT_LIMITS.count.max"
                class="h-12 w-full rounded-lg border border-dark-700 bg-dark-600 px-4 pr-20 text-base font-semibold text-white outline-none"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {{ $t('common.items') }}
              </div>
            </div>
            <p
              v-if="showCountError"
              class="text-xs"
              :class="countValid ? 'text-gray-400' : 'text-red-400'"
            >
              {{
                $t('pages.forms.editProduct.validationCountRange', {
                  min: PRODUCT_LIMITS.count.min,
                  max: PRODUCT_LIMITS.count.max,
                })
              }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white flex items-center gap-2">
            <Percent class="w-4 h-4 text-blue-400" />
            {{ $t('pages.forms.createProduct.calculations') }}
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">{{ $t('pages.forms.createProduct.totalPrice') }}:</span>
              <span class="text-sm font-medium text-white">
                {{ formatPrice(totalPriceInRub) }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">
                {{ $t('pages.forms.createProduct.commission') }}:
                <span v-if="commissionInterest" class="text-blue-400 ml-1">
                  ({{ commissionInterest }}%)
                </span>
              </span>
              <span class="text-sm font-medium text-red-400">
                -{{ formatPrice(commissionAmountInRub) }}
              </span>
            </div>

            <div class="border-t border-dark-600 my-2"></div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.createProduct.sellerReceives') }}:
              </span>
              <span class="text-lg font-bold text-green-400">
                {{ formatPrice(sellerAmount) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ErrorBanner v-if="errorMessage" :message="errorMessage" />

      <div
        v-if="submitAttempted && !isFormValid"
        class="rounded-lg border border-amber-700/40 bg-amber-900/15 p-3"
      >
        <p class="text-xs text-amber-200 font-medium flex items-center gap-1.5">
          <AlertCircle class="h-4 w-4" />
          {{ t('pages.forms.editProduct.fixFormToSave') }}
          ({{ invalidFieldsCount }})
        </p>
      </div>

      <button
        type="button"
        :disabled="sended || !isFormValid"
        class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
        @click="updateProduct"
      >
        <span v-if="sended" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ $t('pages.forms.editProduct.saving') }}
        </span>
        <span v-else>
          {{ $t('pages.forms.editProduct.save') }}
        </span>
      </button>

      <div class="text-xs text-gray-400 space-y-2">
        <div class="flex items-start gap-2 p-3 bg-dark-700/30 rounded-lg">
          <AlertCircle class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p>{{ $t('pages.forms.editProduct.saveNote') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
