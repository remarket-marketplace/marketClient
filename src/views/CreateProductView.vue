<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import { raikaService } from '@/api/raika/RaikaService'
import CustomSelect from '@/components/CustomSelect.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FileUploader from '@/components/FileUploader.vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/validation/category/category'
import { onMounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Percent, Calculator, Info, AlertCircle, X, RotateCcw } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import Checkbox from '@/components/Checkbox.vue'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  getUsdRubRate,
  preferredCurrency,
  setUsdRubRate,
} from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'

const API_HOST = import.meta.env.VITE_API_HOST
const RAIKA_BOT_URL = 'https://t.me/Raika_CheckBot'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const categories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedCategoryId = ref('')
const selectedSubcategoryId = ref('')
const title = ref('')
const description = ref('')
const price = ref('')
const productData = ref('')
const images = ref<File[]>([])
const count = ref<number>(1)
const sended = ref(false)
const errorMessage = ref('')
const commissionInterest = ref<number | null>(null)
const autoDelivery = ref<boolean>(true)
const isLoadingDraft = ref(false)
const isRaikaDraftApplied = ref(false)
const draftImages = ref<string[]>([])
const selectedCurrency = computed(() => preferredCurrency.value)
const currencySymbol = computed(() => getCurrencySymbol(selectedCurrency.value))
const usdRubRate = computed(() => getUsdRubRate())

function toCategoryOptionImageUrl(imageUrl: string | null): string | undefined {
  if (!imageUrl) {
    return undefined
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

const categoryOptions = computed(() => (
  categories.value.map(category => ({
    label: category.name,
    value: category.id,
    imageUrl: toCategoryOptionImageUrl(category.image_url),
  }))
))

const subcategoryOptions = computed(() => (
  subcategories.value.map(subcategory => ({
    label: subcategory.name,
    value: subcategory.id,
    imageUrl: toCategoryOptionImageUrl(subcategory.image_url),
  }))
))

const PRODUCT_LIMITS = {
  title: { min: 10, max: 50 },
  description: { min: 10, max: 1200 },
  productData: { min: 10, max: 128 },
  count: { min: 1, max: 5000 },
  images: { min: 1, max: 10 }
}
const DEFAULT_PRICE_RANGE_RUB = { min: 10, max: 1000000 }
const minPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.min)
const maxPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.max)

function getMultipartTransportLength(value: string): number {
  // Multipart form payload normalizes LF to CRLF, so backend sees this length.
  return value.replace(/\r?\n/g, '\r\n').length
}

const store = useUserStore()
const user = await store.getUser()

const totalImagesCount = computed(() => draftImages.value.length + images.value.length)
const maxUploadedImages = computed(() => {
  return Math.max(0, PRODUCT_LIMITS.images.max - draftImages.value.length)
})
const normalizedTitle = computed(() => title.value.trim())
const normalizedDescription = computed(() => description.value.trim())
const normalizedProductData = computed(() => productData.value.trim())
const normalizedDescriptionLength = computed(() => getMultipartTransportLength(normalizedDescription.value))
const normalizedProductDataLength = computed(() => getMultipartTransportLength(normalizedProductData.value))
const priceValueInput = computed(() => Number(price.value))
const priceValueRub = computed(() => {
  if (!Number.isFinite(priceValueInput.value)) return NaN
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
  totalImagesCount.value >= PRODUCT_LIMITS.images.min
  && totalImagesCount.value <= PRODUCT_LIMITS.images.max
))

// Calculate seller's final amount
const totalPriceInRub = computed(() => priceValueRub.value * count.value)
const commissionAmountInRub = computed(() => {
  if (!commissionInterest.value) return 0
  return totalPriceInRub.value * (commissionInterest.value / 100)
})

const sellerAmount = computed(() => {
  if (!price.value || !commissionInterest.value) return 0
  return Math.max(0, totalPriceInRub.value - commissionAmountInRub.value)
})

// Price formatting
const formatPrice = (value: number) => {
  return formatCurrencyAmount(value, {
    fromCurrency: 'RUB',
    currency: selectedCurrency.value,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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

// Form validation
const isFormValid = computed(() => {
  return Boolean(
    selectedSubcategoryId.value &&
    titleLengthValid.value &&
    descriptionLengthValid.value &&
    productDataValidForForm.value &&
    priceValid.value &&
    countValid.value &&
    imagesCountValid.value
  )
})

const validationIssues = computed(() => {
  const issues: string[] = []
  if (!selectedCategoryId.value) {
    issues.push(t('pages.forms.createProduct.validationCategoryRequired'))
  }
  if (!selectedSubcategoryId.value) {
    issues.push(t('pages.forms.createProduct.validationSubcategoryRequired'))
  }
  if (!titleLengthValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationTitleLength', {
        min: PRODUCT_LIMITS.title.min,
        max: PRODUCT_LIMITS.title.max,
      }),
    )
  }
  if (!descriptionLengthValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationDescriptionLength', {
        min: PRODUCT_LIMITS.description.min,
        max: PRODUCT_LIMITS.description.max,
      }),
    )
  }
  if (autoDelivery.value && !productDataLengthValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationProductDataLength', {
        min: PRODUCT_LIMITS.productData.min,
        max: PRODUCT_LIMITS.productData.max,
      }),
    )
  }
  if (!priceValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationPriceRange', {
        min: priceRangeMinLabel.value,
        max: priceRangeMaxLabel.value,
      }),
    )
  }
  if (!countValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationCountRange', {
        min: PRODUCT_LIMITS.count.min,
        max: PRODUCT_LIMITS.count.max,
      }),
    )
  }
  if (!imagesCountValid.value) {
    issues.push(
      t('pages.forms.createProduct.validationImagesRange', {
        min: PRODUCT_LIMITS.images.min,
        max: PRODUCT_LIMITS.images.max,
      }),
    )
  }
  return issues
})

const hasAnyFormData = computed(() => (
  Boolean(selectedCategoryId.value)
  || Boolean(selectedSubcategoryId.value)
  || normalizedTitle.value.length > 0
  || normalizedDescription.value.length > 0
  || normalizedProductData.value.length > 0
  || String(price.value).trim().length > 0
  || count.value !== 1
  || images.value.length > 0
  || draftImages.value.length > 0
  || !autoDelivery.value
  || isRaikaDraftApplied.value
))

const draftId = computed(() => {
  const draftIdParam = route.query.draft_id
  if (typeof draftIdParam === 'string') {
    return draftIdParam.trim()
  }
  if (Array.isArray(draftIdParam)) {
    const firstDraftId = draftIdParam.find(
      (value): value is string => typeof value === 'string'
    )
    return firstDraftId?.trim() ?? ''
  }
  return ''
})

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
    const categoriesData = await categoryService.getAllCategories()
    categories.value = categoriesData.categories
    const commission = await productService.getCommissionInterest()
    commissionInterest.value = Number(commission)
  } catch (err) {
    console.error('Error loading data for product creation:', err)
    errorMessage.value = t('common.error')
  }

  if (!draftId.value) {
    return
  }

  try {
    isLoadingDraft.value = true
    const draft = await raikaService.getDraft(draftId.value)
    if (draft) {
      description.value = draft.description
      draftImages.value = draft.images.slice(0, PRODUCT_LIMITS.images.max)
      isRaikaDraftApplied.value = true
    } else {
      errorMessage.value = t('pages.forms.createProduct.draftNotFound')
    }
  } catch (err) {
    console.error('Error loading raika draft:', err)
    errorMessage.value = t('pages.forms.createProduct.errorLoadingDraft')
  } finally {
    isLoadingDraft.value = false
  }
})

watch(selectedCategoryId, async (newCategory) => {
  selectedSubcategoryId.value = ''

  if (!newCategory) {
    subcategories.value = []
    return
  }
  try {
    const subcategoriesData = await categoryService.getSubcategories(newCategory)
    subcategories.value = subcategoriesData.categories
  } catch (err) {
    console.error('Error loading subcategories:', err)
    errorMessage.value = t('pages.forms.createProduct.errorLoadingSubcategories')
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

function removeDraftImage(index: number) {
  draftImages.value.splice(index, 1)
}

function clearForm() {
  selectedCategoryId.value = ''
  selectedSubcategoryId.value = ''
  subcategories.value = []
  title.value = ''
  description.value = ''
  price.value = ''
  productData.value = ''
  images.value = []
  draftImages.value = []
  count.value = 1
  autoDelivery.value = true
  errorMessage.value = ''
  isRaikaDraftApplied.value = false
}

async function createProduct() {
  errorMessage.value = ''

  if (!isFormValid.value) {
    errorMessage.value = t('pages.forms.createProduct.fixFormToCreate')
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
      category_id: selectedSubcategoryId.value,
      count: count.value,
      auto_delivery: autoDelivery.value,
      draft_images: draftImages.value
    }

    const result = await productService.createProduct(productDataObj, images.value)
    if (result && user?.username) {
      router.push(`/user/${user?.username}`)
    } else {
      errorMessage.value = t('pages.forms.createProduct.errorCreatingProduct')
    }
  } catch (err: any) {
    console.error('Error creating product:', err)
    const detail = err.response?.data?.detail
    if (detail) {
      if (Array.isArray(detail)) {
        const errors = detail.map((e: any) => e.msg).join(', ')
        errorMessage.value = `${t('pages.forms.createProduct.validationErrors')}${errors}`
      } else {
        errorMessage.value = getErrorMessage(detail, t)
      }
    } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
      errorMessage.value = t('errors.NETWORK_ERROR')
    } else {
      errorMessage.value = t('pages.forms.createProduct.errorCreatingProduct')
    }
  } finally {
    sended.value = false
  }
}
</script>

<template>
  <div class="w-full h-full overflow-scroll no-scrollbar lg:overflow-hidden md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.forms.createProduct.title') }}
        </h1>
      </div>
      <p class="mt-2 text-sm text-gray-400">
        {{ $t('pages.forms.createProduct.subtitle') }}
      </p>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
      <!-- Left column - Main form -->
      <div class="lg:flex-1 overflow-y-auto no-scrollbar lg:pr-6 lg:pt-6 pb-6">
        <div class="px-4 lg:px-0 space-y-6">
          <!-- Desktop header -->
          <div class="hidden lg:block">
            <div class="flex gap-2">
              <BackButton />
              <h1 class="text-2xl font-bold text-white">
                {{ $t('pages.forms.createProduct.title') }}
              </h1>
            </div>
            <p class="mt-2 text-sm text-gray-400">
              {{ $t('pages.forms.createProduct.subtitle') }}
            </p>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              :disabled="sended || !hasAnyFormData"
              class="inline-flex items-center gap-1.5 rounded-md border border-dark-600 bg-dark-700/40 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-dark-500 hover:bg-dark-700/70 hover:text-white disabled:opacity-45 disabled:cursor-not-allowed"
              :title="$t('pages.forms.createProduct.clearFormHint')"
              @click="clearForm"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              {{ $t('pages.forms.createProduct.clearForm') }}
            </button>
          </div>

          <!-- Draft images -->
          <div v-if="isLoadingDraft" class="rounded-lg border border-dark-700 bg-dark-600/30 p-3">
            <p class="text-sm text-gray-400">
              {{ $t('pages.forms.createProduct.loadingDraft') }}
            </p>
          </div>

          <div v-if="draftImages.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('pages.forms.editProduct.currentImages') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <span class="text-xs text-gray-400">
                {{ totalImagesCount }}/{{ PRODUCT_LIMITS.images.max }}
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div
                v-for="(image, index) in draftImages"
                :key="`${image}-${index}`"
                class="group relative aspect-square rounded-lg overflow-hidden border border-dark-700 bg-dark-600 transition-all duration-200 hover:border-red-500"
              >
                <img
                  :src="`${API_HOST}${image}`"
                  :alt="'Draft image'"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <button
                    type="button"
                    @click="removeDraftImage(index)"
                    class="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all duration-200"
                    :title="$t('common.delete')"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Images -->
          <FileUploader
            v-model="images"
            :max-files="maxUploadedImages"
            :hint="$t('pages.forms.createProduct.imageHint')"
          />

          <!-- Categories -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('common.category') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <CustomSelect v-model="selectedCategoryId"
                :options="categoryOptions"
                :placeholder="t('pages.forms.createProduct.selectCategory')"
                searchable
                class="w-full" />
            </div>

            <div v-if="subcategories.length" class="space-y-2">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('common.subcategory') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <CustomSelect v-model="selectedSubcategoryId"
                :options="subcategoryOptions"
                :placeholder="t('pages.forms.createProduct.selectSubcategory')"
                searchable
                class="w-full" />
            </div>
          </div>

          <!-- Product information -->
          <div class="space-y-6">
            <!-- Title and quantity -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="title" class="text-sm font-medium text-gray-300">
                  {{ $t('pages.forms.createProduct.productName') }}
                  <span class="text-xs text-red-400 ml-1">*</span>
                </label>
                <input id="title" v-model="title" type="text" :maxlength="PRODUCT_LIMITS.title.max" :minlength="PRODUCT_LIMITS.title.min"
                  :placeholder="$t('pages.forms.createProduct.productNamePlaceholder')"
                  class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white outline-none placeholder-gray-500" />
                <div class="flex items-center justify-between gap-3">
                  <p
                    class="text-xs"
                    :class="titleLengthValid ? 'text-gray-400' : 'text-red-400'"
                  >
                    {{
                      t('pages.forms.createProduct.validationTitleLength', {
                        min: PRODUCT_LIMITS.title.min,
                        max: PRODUCT_LIMITS.title.max,
                      })
                    }}
                  </p>
                  <p class="text-xs text-gray-400 text-right">
                    {{ title.length }}/{{ PRODUCT_LIMITS.title.max }}
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <label for="count" class="text-sm font-medium text-gray-300">
                  {{ $t('pages.forms.createProduct.count') }}
                </label>
                <div class="relative">
                  <input id="count" v-model.number="count" type="number" :min="PRODUCT_LIMITS.count.min" :max="PRODUCT_LIMITS.count.max"
                    class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white outline-none" />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm ">
                    {{ $t('common.items') }}
                  </div>
                </div>
                <p
                  class="text-xs"
                  :class="countValid ? 'text-gray-400' : 'text-red-400'"
                >
                  {{
                    t('pages.forms.createProduct.validationCountRange', {
                      min: PRODUCT_LIMITS.count.min,
                      max: PRODUCT_LIMITS.count.max,
                    })
                  }}
                </p>
              </div>
            </div>

            <!-- Product description -->
            <div class="space-y-2">
              <label for="description" class="text-sm font-medium text-gray-300">
                {{ $t('common.description') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <textarea id="description" v-model="description" rows="8" :maxlength="PRODUCT_LIMITS.description.max" :minlength="PRODUCT_LIMITS.description.min"
                :placeholder="$t('pages.forms.createProduct.descriptionPlaceholder')"
                class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm outline-none text-white placeholder-gray-500 resize-none"></textarea>
              <div class="flex items-center justify-between gap-3">
                <p
                  class="text-xs"
                  :class="descriptionLengthValid ? 'text-gray-400' : 'text-red-400'"
                >
                  {{
                    t('pages.forms.createProduct.validationDescriptionLength', {
                      min: PRODUCT_LIMITS.description.min,
                      max: PRODUCT_LIMITS.description.max,
                    })
                  }}
                </p>
                <p class="text-xs text-gray-400 text-right">
                  {{ normalizedDescriptionLength }}/{{ PRODUCT_LIMITS.description.max }}
                </p>
              </div>
            </div>

            <!-- Auto delivery -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-5 space-y-3">
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
              <div v-if="autoDelivery" class="mt-3">
                <div class="p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                  <p class="text-xs text-blue-300 leading-relaxed flex items-start gap-2">
                    <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {{ $t('pages.forms.createProduct.autoDeliveryEnabledHint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Product data -->
            <div v-if="autoDelivery" class="space-y-2">
              <div class="flex items-center gap-2">
                <label for="productData" class="text-sm font-medium text-gray-300">
                  {{ $t('pages.forms.createProduct.productData') }}
                  <span v-if="autoDelivery" class="text-xs text-red-400 ml-1">*</span>
                </label>
                <div class="flex items-center gap-1 text-xs text-blue-400">
                  <Info class="w-3 h-3" />
                  <span>{{ $t('pages.forms.createProduct.productDataHint') }}</span>
                </div>
              </div>
              <textarea id="productData" v-model="productData" rows="6" :maxlength="PRODUCT_LIMITS.productData.max" :minlength="PRODUCT_LIMITS.productData.min"
                :placeholder="$t('pages.forms.createProduct.productDataPlaceholder')"
                class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm outline-none text-white placeholder-gray-500 resize-none font-mono"></textarea>
              <div class="flex items-center justify-between gap-3">
                <p
                  class="text-xs"
                  :class="productDataLengthValid ? 'text-gray-400' : 'text-red-400'"
                >
                  {{
                    t('pages.forms.createProduct.validationProductDataLength', {
                      min: PRODUCT_LIMITS.productData.min,
                      max: PRODUCT_LIMITS.productData.max,
                    })
                  }}
                </p>
                <p class="text-xs text-gray-400 text-right">
                  {{ normalizedProductDataLength }}/{{ PRODUCT_LIMITS.productData.max }}
                </p>
              </div>
            </div>
          </div>

          <!-- Error banner -->
          <ErrorBanner v-if="errorMessage" :message="errorMessage" />
        </div>
      </div>

      <!-- Right sidebar - Fixed on desktop, normal flow on mobile -->
      <div
        class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:min-h-[calc(100dvh-3.5rem)] lg:border-l border-dark-700 px-4 lg:px-0 lg:pl-6 lg:pt-6">
        <div class="pt-6 lg:pt-0">
          <div class="space-y-6 lg:pb-0">
            <!-- Product price -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
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
                <input id="price" v-model.number="price" type="number" :min="priceInputMin" :max="priceInputMax" :step="priceInputStep"
                  :placeholder="$t('pages.forms.createProduct.pricePlaceholder')"
                  class="w-full outline-none rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-lg font-semibold text-white" />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  {{ currencySymbol }}
                </div>
              </div>
              <p
                class="text-xs"
                :class="priceValid ? 'text-gray-400' : 'text-red-400'"
              >
                {{
                  t('pages.forms.createProduct.validationPriceRange', {
                    min: priceRangeMinLabel,
                    max: priceRangeMaxLabel,
                  })
                }}
              </p>
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
                    {{ formatPrice(totalPriceInRub) }}
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
                    -{{ formatPrice(commissionAmountInRub) }}
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

            <div
              v-if="isRaikaDraftApplied"
              class="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-xs text-emerald-200"
            >
              <p>
                {{ $t('pages.forms.createProduct.raikaVerifiedPrefix') }}
                <a
                  :href="RAIKA_BOT_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline decoration-emerald-300/60 underline-offset-2 hover:text-emerald-100 transition-colors"
                >
                  {{ $t('pages.forms.createProduct.raikaName') }}
                </a>
              </p>
            </div>

            <div
              v-if="!isFormValid"
              class="rounded-lg border border-amber-700/40 bg-amber-900/15 p-3"
            >
              <p class="text-xs text-amber-200 font-medium mb-2">
                {{ t('pages.forms.createProduct.fixFormToCreate') }}
              </p>
              <ul class="space-y-1">
                <li
                  v-for="issue in validationIssues"
                  :key="issue"
                  class="text-xs text-amber-300"
                >
                  • {{ issue }}
                </li>
              </ul>
            </div>

            <button type="button" :disabled="sended || !isFormValid"
              class="w-full rounded-lg border border-transparent bg-button-main px-4 py-3 text-sm font-semibold text-mainText transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="createProduct">
              <span v-if="sended" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                {{ $t('pages.forms.createProduct.creating') }}
              </span>
              <span v-else>
                {{ $t('common.create') }}
              </span>
            </button>

            <!-- Terms note -->
            <div class="text-xs text-gray-400 space-y-2">
              <div class="flex items-start gap-2 p-3 bg-dark-700/30 rounded-lg">
                <AlertCircle class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p>
                  {{ $t('pages.forms.createProduct.termsNote') }}
                  <router-link to="/terms" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    {{ $t('pages.forms.createProduct.termsLink') }}
                  </router-link>
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
    scrollbar-color: var(--overlay-white-20) transparent;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
    margin: 10px 0;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: var(--overlay-white-20);
    border-radius: 3px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: var(--overlay-white-30);
  }
}

/* Ensure proper scrolling on mobile */
@media (max-width: 1023px) {

  /* Remove fixed heights and allow natural flow */
  .lg\:h-\[calc\(100vh-140px\)\] {
    height: auto;
  }

  .lg\:sticky {
    position: static;
  }
}
</style>
