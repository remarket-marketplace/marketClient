<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import CustomSelect from '@/components/CustomSelect.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FileUploader from '@/components/FileUploader.vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/validation/category/category'
import { onMounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Percent, Calculator, Info, AlertCircle } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import Checkbox from '@/components/Checkbox.vue'

const { t } = useI18n()
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

const PRODUCT_LIMITS = {
  title: { min: 10, max: 50 },
  description: { min: 10, max: 256 },
  productData: { min: 10, max: 128 },
  price: { min: 10, max: 1000000 },
  count: { min: 1, max: 5000 },
  images: { min: 1, max: 8 }
}

const store = useUserStore()
const user = await store.getUser()

// Calculate seller's final amount
const sellerAmount = computed(() => {
  if (!price.value || !commissionInterest.value) return 0
  const total = Number(price.value) * count.value
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

// Form validation
const isFormValid = computed(() => {
  const normalizedTitle = title.value.trim()
  const normalizedDescription = description.value.trim()
  const normalizedProductData = productData.value.trim()
  const priceValue = Number(price.value)
  const countValue = Number(count.value)

  return Boolean(
    selectedSubcategoryId.value &&
    normalizedTitle.length >= PRODUCT_LIMITS.title.min &&
    normalizedTitle.length <= PRODUCT_LIMITS.title.max &&
    normalizedDescription.length >= PRODUCT_LIMITS.description.min &&
    normalizedDescription.length <= PRODUCT_LIMITS.description.max &&
    normalizedProductData.length >= PRODUCT_LIMITS.productData.min &&
    normalizedProductData.length <= PRODUCT_LIMITS.productData.max &&
    Number.isFinite(priceValue) &&
    priceValue >= PRODUCT_LIMITS.price.min &&
    priceValue <= PRODUCT_LIMITS.price.max &&
    Number.isFinite(countValue) &&
    countValue >= PRODUCT_LIMITS.count.min &&
    countValue <= PRODUCT_LIMITS.count.max &&
    images.value.length >= PRODUCT_LIMITS.images.min &&
    images.value.length <= PRODUCT_LIMITS.images.max
  )
})

onMounted(async () => {
  try {
    await store.fetchUser()
    const categoriesData = await categoryService.getAllCategories()
    categories.value = categoriesData.categories
    const commission = await productService.getCommissionInterest()
    commissionInterest.value = Number(commission)
  } catch (err) {
    console.error('Error loading data for product creation:', err)
    errorMessage.value = t('common.error')
  }
})

watch(selectedCategoryId, async (newCategory) => {
  if (!newCategory) {
    subcategories.value = []
    selectedSubcategoryId.value = ''
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

async function createProduct() {
  errorMessage.value = ''

  if (!isFormValid.value) {
    errorMessage.value = t('common.fillAllFields')
    return
  }

  sended.value = true
  try {
    const normalizedTitle = title.value.trim()
    const normalizedDescription = description.value.trim()
    const normalizedProductData = productData.value.trim()

    const productDataObj = {
      title: normalizedTitle,
      description: normalizedDescription,
      price: Number(price.value),
      product_data: normalizedProductData,
      category_id: selectedSubcategoryId.value,
      count: count.value,
      auto_delivery: autoDelivery.value
    }

    const result = await productService.createProduct(productDataObj, images.value)
    if (result && user?.username) {
      router.push(`/user/${user?.username}`)
    } else {
      errorMessage.value = t('pages.forms.createProduct.errorCreatingProduct')
    }
  } catch (err: any) {
    console.error('Error creating product:', err)
    if (err.response?.data?.detail) {
      const errors = err.response.data.detail.map((e: any) => e.msg).join(', ')
      errorMessage.value = `${t('pages.forms.createProduct.validationErrors')}${errors}`
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
    <div class="lg:flex lg:h-full">
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

          <!-- Images -->
          <FileUploader v-model="images" :max-files="PRODUCT_LIMITS.images.max" :hint="$t('pages.forms.createProduct.imageHint')" />

          <!-- Categories -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('common.category') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <CustomSelect v-model="selectedCategoryId"
                :options="categories.map(c => ({ label: c.name, value: c.id }))"
                :placeholder="t('pages.forms.createProduct.selectCategory')" class="w-full" />
            </div>

            <div v-if="subcategories.length" class="space-y-2">
              <label class="text-sm font-medium text-gray-300">
                {{ $t('common.subcategory') }}
                <span class="text-xs text-red-400 ml-1">*</span>
              </label>
              <CustomSelect v-model="selectedSubcategoryId"
                :options="subcategories.map(s => ({ label: s.name, value: s.id }))"
                :placeholder="t('pages.forms.createProduct.selectSubcategory')" class="w-full" />
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
                <p class="text-xs text-gray-400 text-right">
                  {{ title.length }}/{{ PRODUCT_LIMITS.title.max }}
                </p>
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
              <p class="text-xs text-gray-400 text-right">
                {{ description.length }}/{{ PRODUCT_LIMITS.description.max }}
              </p>
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
              <textarea id="productData" v-model="productData" rows="6" :maxlength="PRODUCT_LIMITS.productData.max" :minlength="PRODUCT_LIMITS.productData.min"
                :placeholder="$t('pages.forms.createProduct.productDataPlaceholder')"
                class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-sm outline-none text-white placeholder-gray-500 resize-none font-mono"></textarea>
              <p class="text-xs text-gray-400 text-right">
                {{ productData.length }}/{{ PRODUCT_LIMITS.productData.max }}
              </p>
            </div>
          </div>

          <!-- Error banner -->
          <ErrorBanner v-if="errorMessage" :message="errorMessage" />
        </div>
      </div>

      <!-- Right sidebar - Fixed on desktop, normal flow on mobile -->
      <div
        class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-full lg:border-l border-dark-700 px-4 lg:px-0 lg:pl-6 lg:pt-6">
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
                  <span class="text-xs text-gray-400">₽</span>
                </div>
              </div>
              <div class="relative">
                <input id="price" v-model.number="price" type="number" :min="PRODUCT_LIMITS.price.min" :max="PRODUCT_LIMITS.price.max"
                  :placeholder="$t('pages.forms.createProduct.pricePlaceholder')"
                  class="w-full outline-none rounded-lg bg-dark-600 border border-dark-700 px-4 py-3 text-lg font-semibold text-white" />
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
                    {{ formatPrice(Number(price) * count) }}
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
                    -{{ formatPrice((Number(price) * count) * (commissionInterest! / 100)) }}
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

            <!-- Create button -->
            <button type="button" :disabled="sended || !isFormValid"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
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

  /* Remove fixed heights and allow natural flow */
  .lg\:h-\[calc\(100vh-140px\)\] {
    height: auto;
  }

  .lg\:sticky {
    position: static;
  }
}
</style>
