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
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Percent,
  Calculator,
  Info,
  AlertCircle,
  X,
  RotateCcw,
  Check,
} from 'lucide-vue-next'
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
import {
  clearCreateProductDraft,
  loadCreateProductDraft,
  saveCreateProductDraft,
  type CreateProductDraftPayload,
} from '@/utils/createProductDraftStorage'
import { getErrorMessage } from '@/utils/errorsMap'

const API_HOST = import.meta.env.VITE_API_HOST
const NORMALIZED_API_HOST = String(API_HOST || '').replace(/\/$/, '')
const RAIKA_BOT_URL = 'https://raika.gg'
const RAIKA_LOGO_URL = `${NORMALIZED_API_HOST}/assets/raika-logo.png`
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUserStore()

type StepNumber = 1 | 2 | 3 | 4

const TOTAL_STEPS = 4 as const
const categories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedCategoryId = ref('')
const selectedSubcategoryId = ref('')
const title = ref('')
const description = ref('')
const price = ref<string | number>('')
const productData = ref('')
const images = ref<File[]>([])
const count = ref<number | ''>(1)
const sended = ref(false)
const errorMessage = ref('')
const commissionInterest = ref<number | null>(null)
const autoDelivery = ref<boolean>(true)
const isLoadingDraft = ref(false)
const isRaikaDraftApplied = ref(false)
const draftImages = ref<string[]>([])
const currentStep = ref<StepNumber>(1)
const showStepIssues = ref(false)
const stepTransitionName = ref<'wizard-step-forward' | 'wizard-step-back'>('wizard-step-forward')

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
  images: { min: 1, max: 10 },
}
const DEFAULT_PRICE_RANGE_RUB = { min: 10, max: 1000000 }
const CREATE_PRODUCT_DRAFT_AUTOSAVE_DELAY_MS = 450
const minPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.min)
const maxPriceRub = ref(DEFAULT_PRICE_RANGE_RUB.max)
const isRestoringSavedDraft = ref(false)
const isDraftPersistenceReady = ref(false)
const restoredDraftNoticeVisible = ref(false)
const lastDraftSavedAt = ref<string | null>(null)
let draftAutosaveTimer: ReturnType<typeof window.setTimeout> | null = null

function getMultipartTransportLength(value: string): number {
  // Multipart form payload normalizes LF to CRLF, so backend sees this length.
  return value.replace(/\r?\n/g, '\r\n').length
}

const totalImagesCount = computed(() => draftImages.value.length + images.value.length)
const maxUploadedImages = computed(() => (
  Math.max(0, PRODUCT_LIMITS.images.max - draftImages.value.length)
))
const normalizedTitle = computed(() => title.value.trim())
const normalizedDescription = computed(() => description.value.trim())
const normalizedProductData = computed(() => productData.value.trim())
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

const priceInputStep = computed(() => (
  selectedCurrency.value === 'USD' ? 0.01 : 1
))

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

const step1Valid = computed(() => (
  Boolean(selectedCategoryId.value && selectedSubcategoryId.value)
))
const step2Valid = computed(() => (
  titleLengthValid.value
  && descriptionLengthValid.value
  && productDataValidForForm.value
))
const step3Valid = computed(() => imagesCountValid.value)
const step4Valid = computed(() => priceValid.value && countValid.value)

// Calculate seller's final amount
const totalPriceInRub = computed(() => priceValueRub.value * countValue.value)
const commissionAmountInRub = computed(() => {
  if (!commissionInterest.value) return 0
  return totalPriceInRub.value * (commissionInterest.value / 100)
})

const sellerAmount = computed(() => {
  if (!price.value || !commissionInterest.value) return 0
  return Math.max(0, totalPriceInRub.value - commissionAmountInRub.value)
})

const stepOrder: StepNumber[] = [1, 2, 3, 4]

function isStepValid(step: StepNumber): boolean {
  if (step === 1) return step1Valid.value
  if (step === 2) return step2Valid.value
  if (step === 3) return step3Valid.value
  return step4Valid.value
}

function getFirstInvalidStep(): StepNumber | null {
  for (const step of stepOrder) {
    if (!isStepValid(step)) {
      return step
    }
  }
  return null
}

function canAccessStep(step: StepNumber): boolean {
  if (step <= currentStep.value) {
    return true
  }

  for (const current of stepOrder) {
    if (current >= step) {
      break
    }
    if (!isStepValid(current)) {
      return false
    }
  }

  return true
}

function setCurrentStep(step: StepNumber): void {
  if (step === currentStep.value) {
    return
  }

  stepTransitionName.value = step > currentStep.value
    ? 'wizard-step-forward'
    : 'wizard-step-back'

  currentStep.value = step
  showStepIssues.value = false
  errorMessage.value = ''
}

function goToPreviousStep(): void {
  if (currentStep.value === 1) {
    return
  }
  setCurrentStep((currentStep.value - 1) as StepNumber)
}

function goToNextStep(): void {
  if (currentStep.value === TOTAL_STEPS) {
    return
  }

  if (!isStepValid(currentStep.value)) {
    showStepIssues.value = true
    return
  }

  setCurrentStep((currentStep.value + 1) as StepNumber)
}

function handleStepClick(step: StepNumber): void {
  if (step === currentStep.value) {
    return
  }

  if (canAccessStep(step)) {
    setCurrentStep(step)
    return
  }

  const invalidStep = getFirstInvalidStep()
  if (invalidStep) {
    setCurrentStep(invalidStep)
  }
}

// Price formatting
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

const stepIssues = computed<Record<StepNumber, string[]>>(() => ({
  1: [
    ...(!selectedCategoryId.value
      ? [t('pages.forms.createProduct.validationCategoryRequired')]
      : []),
    ...(!selectedSubcategoryId.value
      ? [t('pages.forms.createProduct.validationSubcategoryRequired')]
      : []),
  ],
  2: [
    ...(!titleLengthValid.value
      ? [
        t('pages.forms.createProduct.validationTitleLength', {
          min: PRODUCT_LIMITS.title.min,
          max: PRODUCT_LIMITS.title.max,
        }),
      ]
      : []),
    ...(!descriptionLengthValid.value
      ? [
        t('pages.forms.createProduct.validationDescriptionLength', {
          min: PRODUCT_LIMITS.description.min,
          max: PRODUCT_LIMITS.description.max,
        }),
      ]
      : []),
    ...(autoDelivery.value && !productDataLengthValid.value
      ? [
        t('pages.forms.createProduct.validationProductDataLength', {
          min: PRODUCT_LIMITS.productData.min,
          max: PRODUCT_LIMITS.productData.max,
        }),
      ]
      : []),
  ],
  3: [
    ...(!imagesCountValid.value
      ? [
        t('pages.forms.createProduct.validationImagesRange', {
          min: PRODUCT_LIMITS.images.min,
          max: PRODUCT_LIMITS.images.max,
        }),
      ]
      : []),
  ],
  4: [
    ...(!priceValid.value
      ? [
        t('pages.forms.createProduct.validationPriceRange', {
          min: priceRangeMinLabel.value,
          max: priceRangeMaxLabel.value,
        }),
      ]
      : []),
    ...(!countValid.value
      ? [
        t('pages.forms.createProduct.validationCountRange', {
          min: PRODUCT_LIMITS.count.min,
          max: PRODUCT_LIMITS.count.max,
        }),
      ]
      : []),
  ],
}))

const currentStepIssues = computed(() => stepIssues.value[currentStep.value])

const isFormValid = computed(() => (
  step1Valid.value
  && step2Valid.value
  && step3Valid.value
  && step4Valid.value
))

const showCurrentStepIssues = computed(() => {
  if (currentStep.value === TOTAL_STEPS && currentStepIssues.value.length > 0) {
    return true
  }
  return showStepIssues.value && currentStepIssues.value.length > 0
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

const stepTabs = computed(() => ([
  {
    id: 1 as StepNumber,
    title: t('pages.forms.createProduct.stepCategoryTitle'),
    shortTitle: t('pages.forms.createProduct.stepCategoryShort'),
    isValid: step1Valid.value,
  },
  {
    id: 2 as StepNumber,
    title: t('pages.forms.createProduct.stepContentTitle'),
    shortTitle: t('pages.forms.createProduct.stepContentShort'),
    isValid: step2Valid.value,
  },
  {
    id: 3 as StepNumber,
    title: t('pages.forms.createProduct.stepMediaTitle'),
    shortTitle: t('pages.forms.createProduct.stepMediaShort'),
    isValid: step3Valid.value,
  },
  {
    id: 4 as StepNumber,
    title: t('pages.forms.createProduct.stepPublishTitle'),
    shortTitle: t('pages.forms.createProduct.stepPublishShort'),
    isValid: step4Valid.value,
  },
]))

const stepHeader = computed(() => {
  if (currentStep.value === 1) {
    return {
      title: t('pages.forms.createProduct.stepCategoryTitle'),
      description: t('pages.forms.createProduct.stepCategoryDescription'),
    }
  }

  if (currentStep.value === 2) {
    return {
      title: t('pages.forms.createProduct.stepContentTitle'),
      description: t('pages.forms.createProduct.stepContentDescription'),
    }
  }

  if (currentStep.value === 3) {
    return {
      title: t('pages.forms.createProduct.stepMediaTitle'),
      description: t('pages.forms.createProduct.stepMediaDescription'),
    }
  }

  return {
    title: t('pages.forms.createProduct.stepPublishTitle'),
    description: t('pages.forms.createProduct.stepPublishDescription'),
  }
})

const draftId = computed(() => {
  const draftIdParam = route.query.draft_id
  if (typeof draftIdParam === 'string') {
    return draftIdParam.trim()
  }
  if (Array.isArray(draftIdParam)) {
    const firstDraftId = draftIdParam.find(
      (value): value is string => typeof value === 'string',
    )
    return firstDraftId?.trim() ?? ''
  }
  return ''
})

const createProductDraftStorageKey = computed(() => {
  const ownerKey = store.user?.id ?? 'guest'
  return draftId.value
    ? `${ownerKey}:raika:${draftId.value}`
    : `${ownerKey}:default`
})

const formattedDraftSavedAt = computed(() => {
  if (!lastDraftSavedAt.value) return ''

  const parsedDate = new Date(lastDraftSavedAt.value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function loadSubcategoriesForCategory(categoryId: string): Promise<void> {
  if (!categoryId) {
    subcategories.value = []
    return
  }

  try {
    const subcategoriesData = await categoryService.getSubcategories(categoryId)
    subcategories.value = subcategoriesData.categories
  } catch (err) {
    console.error('Error loading subcategories:', err)
    errorMessage.value = t('pages.forms.createProduct.errorLoadingSubcategories')
  }
}

function buildCreateProductDraftPayload(): CreateProductDraftPayload {
  return {
    selectedCategoryId: selectedCategoryId.value,
    selectedSubcategoryId: selectedSubcategoryId.value,
    title: title.value,
    description: description.value,
    price: typeof price.value === 'number' ? String(price.value) : String(price.value ?? ''),
    productData: productData.value,
    count: count.value,
    autoDelivery: autoDelivery.value,
    draftImages: [...draftImages.value],
    images: [...images.value],
    currentStep: currentStep.value,
    isRaikaDraftApplied: isRaikaDraftApplied.value,
  }
}

async function persistCreateProductDraft(): Promise<void> {
  if (!isDraftPersistenceReady.value || isRestoringSavedDraft.value) {
    return
  }

  try {
    if (!hasAnyFormData.value) {
      await clearCreateProductDraft(createProductDraftStorageKey.value)
      lastDraftSavedAt.value = null
      return
    }

    const savedDraft = await saveCreateProductDraft(
      createProductDraftStorageKey.value,
      buildCreateProductDraftPayload(),
    )
    lastDraftSavedAt.value = savedDraft?.updatedAt ?? lastDraftSavedAt.value
  } catch (err) {
    console.error('Error saving create product draft:', err)
  }
}

function scheduleCreateProductDraftSave(): void {
  if (!isDraftPersistenceReady.value || isRestoringSavedDraft.value) {
    return
  }

  if (draftAutosaveTimer) {
    window.clearTimeout(draftAutosaveTimer)
  }

  draftAutosaveTimer = window.setTimeout(() => {
    draftAutosaveTimer = null
    void persistCreateProductDraft()
  }, CREATE_PRODUCT_DRAFT_AUTOSAVE_DELAY_MS)
}

async function restoreSavedCreateProductDraft(): Promise<void> {
  try {
    isRestoringSavedDraft.value = true
    const savedDraft = await loadCreateProductDraft(createProductDraftStorageKey.value)
    if (!savedDraft) {
      return
    }

    selectedCategoryId.value = savedDraft.selectedCategoryId
    selectedSubcategoryId.value = ''
    await loadSubcategoriesForCategory(savedDraft.selectedCategoryId)
    selectedSubcategoryId.value = savedDraft.selectedSubcategoryId
    title.value = savedDraft.title
    description.value = savedDraft.description
    price.value = savedDraft.price
    productData.value = savedDraft.productData
    images.value = savedDraft.images
    count.value = savedDraft.count
    autoDelivery.value = savedDraft.autoDelivery
    draftImages.value = savedDraft.draftImages.slice(0, PRODUCT_LIMITS.images.max)
    currentStep.value = savedDraft.currentStep
    isRaikaDraftApplied.value = savedDraft.isRaikaDraftApplied
    showStepIssues.value = false
    lastDraftSavedAt.value = savedDraft.updatedAt || null
    restoredDraftNoticeVisible.value = true
  } catch (err) {
    console.error('Error restoring create product draft:', err)
  } finally {
    isRestoringSavedDraft.value = false
  }
}

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

  await restoreSavedCreateProductDraft()
  isDraftPersistenceReady.value = true
})

watch(selectedCategoryId, async (newCategory) => {
  if (isRestoringSavedDraft.value) {
    return
  }

  selectedSubcategoryId.value = ''
  await loadSubcategoriesForCategory(newCategory)
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

watch(
  [
    selectedCategoryId,
    selectedSubcategoryId,
    title,
    description,
    price,
    productData,
    images,
    count,
    autoDelivery,
    draftImages,
    currentStep,
    isRaikaDraftApplied,
  ],
  () => {
    if (!isDraftPersistenceReady.value || isRestoringSavedDraft.value) {
      return
    }

    restoredDraftNoticeVisible.value = false
    scheduleCreateProductDraftSave()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (draftAutosaveTimer) {
    window.clearTimeout(draftAutosaveTimer)
    draftAutosaveTimer = null
  }

  void persistCreateProductDraft()
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
  currentStep.value = 1
  showStepIssues.value = false
  lastDraftSavedAt.value = null
  restoredDraftNoticeVisible.value = false
  void clearCreateProductDraft(createProductDraftStorageKey.value)
}

async function createProduct() {
  errorMessage.value = ''

  const invalidStep = getFirstInvalidStep()
  if (invalidStep) {
    if (invalidStep !== currentStep.value) {
      setCurrentStep(invalidStep)
    }
    showStepIssues.value = true
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
      count: countValue.value,
      auto_delivery: autoDelivery.value,
      draft_images: draftImages.value,
    }

    const result = await productService.createProduct(productDataObj, images.value)
    const username = store.user?.username

    if (result && username) {
      await clearCreateProductDraft(createProductDraftStorageKey.value)
      lastDraftSavedAt.value = null
      restoredDraftNoticeVisible.value = false
      await router.push(`/user/${username}`)
    } else {
      errorMessage.value = t('pages.forms.createProduct.errorCreatingProduct')
    }
  } catch (err: any) {
    console.error('Error creating product:', err)
    const detail = err.response?.data?.detail

    if (detail) {
      if (Array.isArray(detail)) {
        const errors = detail.map((e: any) => e.msg).join(', ')
        errorMessage.value = `${t('common.validationErrors')}${errors}`
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
      <p class="mt-2 text-xs text-blue-300">
        {{ $t('pages.forms.createProduct.stepProgress', { current: currentStep, total: TOTAL_STEPS }) }}
      </p>
    </div>

    <div class="lg:min-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto no-scrollbar pb-6">
      <div class="mx-auto w-full max-w-5xl px-4 lg:px-6 lg:pt-6 space-y-6">
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
          <p class="mt-2 text-xs text-blue-300">
            {{ $t('pages.forms.createProduct.stepProgress', { current: currentStep, total: TOTAL_STEPS }) }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <p class="text-xs text-gray-400">
              {{ $t('pages.forms.createProduct.draftAutosaveHint') }}
            </p>
            <p v-if="formattedDraftSavedAt" class="text-xs text-blue-300">
              {{ $t('pages.forms.createProduct.draftSavedAt', { time: formattedDraftSavedAt }) }}
            </p>
          </div>

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

        <div
          v-if="restoredDraftNoticeVisible"
          class="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100"
        >
          {{ $t('pages.forms.createProduct.draftRestoredNotice') }}
        </div>

        <div class="rounded-xl border border-dark-700 bg-dark-600/30 p-3 lg:p-4">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              v-for="step in stepTabs"
              :key="step.id"
              type="button"
              class="group flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
              :class="[
                currentStep === step.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-dark-700 bg-dark-600/40 hover:border-dark-500',
                !canAccessStep(step.id) ? 'opacity-60' : '',
              ]"
              @click="handleStepClick(step.id)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="[
                    currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : step.isValid
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-700 text-gray-300',
                  ]"
                >
                  {{ step.id }}
                </span>
                <p class="truncate text-xs lg:text-sm font-medium text-white">
                  {{ step.shortTitle }}
                </p>
              </div>

              <Check
                v-if="step.isValid"
                class="h-4 w-4 shrink-0 text-green-400"
              />
            </button>
          </div>
        </div>

        <Transition :name="stepTransitionName" mode="out-in">
          <section
            :key="currentStep"
            class="rounded-xl border border-dark-700 bg-dark-600/30 p-4 lg:p-6 space-y-6"
          >
            <header class="space-y-2">
              <h2 class="text-lg lg:text-xl font-semibold text-white">
                {{ stepHeader.title }}
              </h2>
              <p class="text-sm text-gray-400">
                {{ stepHeader.description }}
              </p>
            </header>

            <template v-if="currentStep === 1">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">
                    {{ $t('common.category') }}
                    <span class="text-xs text-red-400 ml-1">*</span>
                  </label>
                  <CustomSelect
                    v-model="selectedCategoryId"
                    :options="categoryOptions"
                    :placeholder="t('pages.forms.createProduct.selectCategory')"
                    searchable
                    class="w-full"
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">
                    {{ $t('common.subcategory') }}
                    <span class="text-xs text-red-400 ml-1">*</span>
                  </label>
                  <CustomSelect
                    v-model="selectedSubcategoryId"
                    :options="subcategoryOptions"
                    :placeholder="t('pages.forms.createProduct.selectSubcategory')"
                    searchable
                    class="w-full"
                    :disabled="!selectedCategoryId || !subcategoryOptions.length"
                  />
                </div>
              </div>
            </template>

            <template v-else-if="currentStep === 2">
              <div class="space-y-6">
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
                    class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm text-white outline-none placeholder-gray-500"
                  />
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs" :class="titleLengthValid ? 'text-gray-400' : 'text-red-400'">
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
                    class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm outline-none text-white placeholder-gray-500 resize-none"
                  ></textarea>
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs" :class="descriptionLengthValid ? 'text-gray-400' : 'text-red-400'">
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
                    v-model="productData"
                    rows="6"
                    :maxlength="PRODUCT_LIMITS.productData.max"
                    :minlength="PRODUCT_LIMITS.productData.min"
                    :placeholder="$t('pages.forms.createProduct.productDataPlaceholder')"
                    class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm outline-none text-white placeholder-gray-500 resize-none font-mono"
                  ></textarea>

                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs" :class="productDataLengthValid ? 'text-gray-400' : 'text-red-400'">
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

                <div
                  v-else
                  class="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-xs text-emerald-200"
                >
                  {{ $t('pages.forms.createProduct.manualDeliveryInfo') }}
                </div>
              </div>
            </template>

            <template v-else-if="currentStep === 3">
              <div class="space-y-5">
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

                <FileUploader
                  v-model="images"
                  :max-files="maxUploadedImages"
                  :hint="$t('pages.forms.createProduct.imageHint')"
                />

                <div
                  v-if="isRaikaDraftApplied"
                  class="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-xs text-emerald-200"
                >
                  <p class="flex flex-wrap items-center gap-1.5">
                    <img
                      :src="RAIKA_LOGO_URL"
                      alt="Raika logo"
                      class="h-4 w-4 rounded-sm object-contain shrink-0"
                      loading="lazy"
                    />
                    <span>
                      {{ $t('pages.forms.createProduct.raikaVerifiedPrefix') }}
                      <a
                        :href="RAIKA_BOT_URL"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline decoration-emerald-300/60 underline-offset-2 hover:text-emerald-100 transition-colors"
                      >
                        {{ $t('pages.forms.createProduct.raikaName') }}
                      </a>
                    </span>
                  </p>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="space-y-6">
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
                    <p class="text-xs" :class="priceValid ? 'text-gray-400' : 'text-red-400'">
                      {{
                        t('pages.forms.createProduct.validationPriceRange', {
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
                    <p class="text-xs" :class="countValid ? 'text-gray-400' : 'text-red-400'">
                      {{
                        t('pages.forms.createProduct.validationCountRange', {
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

                  <div v-if="commissionInterest" class="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                    <p class="text-xs text-blue-300 leading-relaxed">
                      {{ $t('pages.forms.createProduct.commissionNote', { percent: commissionInterest }) }}
                    </p>
                  </div>
                </div>

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
            </template>
          </section>
        </Transition>

        <ErrorBanner v-if="errorMessage" :message="errorMessage" />

        <div
          v-if="showCurrentStepIssues"
          class="rounded-lg border border-amber-700/40 bg-amber-900/15 p-3"
        >
          <p class="text-xs text-amber-200 font-medium mb-2">
            {{ t('pages.forms.createProduct.stepValidationTitle') }}
          </p>
          <ul class="space-y-1">
            <li
              v-for="issue in currentStepIssues"
              :key="issue"
              class="text-xs text-amber-300"
            >
              • {{ issue }}
            </li>
          </ul>
        </div>

        <div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pb-6">
          <button
            type="button"
            class="rounded-lg border border-dark-700 bg-dark-600/40 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:border-dark-500 hover:bg-dark-600"
            :disabled="currentStep === 1 || sended"
            @click="goToPreviousStep"
          >
            {{ $t('pages.forms.createProduct.previousStep') }}
          </button>

          <button
            v-if="currentStep < TOTAL_STEPS"
            type="button"
            class="market-btn market-btn-primary rounded-lg px-4 py-3 text-sm text-mainText"
            :disabled="sended"
            @click="goToNextStep"
          >
            {{ $t('pages.forms.createProduct.nextStep') }}
          </button>

          <button
            v-else
            type="button"
            :disabled="sended || !isFormValid"
            class="market-btn market-btn-primary rounded-lg px-4 py-3 text-sm text-mainText"
            @click="createProduct"
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
              {{ $t('pages.forms.createProduct.creating') }}
            </span>
            <span v-else>
              {{ $t('common.create') }}
            </span>
          </button>
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

.wizard-step-forward-enter-active,
.wizard-step-forward-leave-active,
.wizard-step-back-enter-active,
.wizard-step-back-leave-active {
  transition: all 0.22s ease;
}

.wizard-step-forward-enter-from,
.wizard-step-back-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.wizard-step-forward-leave-to,
.wizard-step-back-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
