<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import CustomSelect from '@/components/CustomSelect.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import FileUploader from '@/components/FileUploader.vue'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/validation/category/category'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const categories = ref<Category[]>([])
const subcategories = ref<Category[]>([])
const selectedCategoryId = ref('')
const selectedSubcategoryId = ref('')
const title = ref('')
const description = ref('')
const price = ref('')
const productData = ref('')
const images = ref<File[]>([])
const sended = ref(false)
const errorMessage = ref('')

const store = useUserStore()
const user = await store.getUser()

onMounted(async () => {
  try {
    await store.fetchUser()
    categories.value = await categoryService.getAllCategories()
  } catch (err) {
    console.error('Ошибка загрузки категорий:', err)
    errorMessage.value = t('pages.forms.createProduct.errorLoadingCategories')
  }
})

watch(selectedCategoryId, async (newCategory) => {
  if (!newCategory) {
    subcategories.value = []
    selectedSubcategoryId.value = ''
    return
  }
  try {
    subcategories.value = await categoryService.getSubcategories(newCategory)
  } catch (err) {
    console.error('Ошибка загрузки подкатегорий:', err)
    errorMessage.value = t('pages.forms.createProduct.errorLoadingSubcategories')
  }
})

async function createProduct() {
  errorMessage.value = ''

  if (!selectedSubcategoryId.value || !title.value || !description.value || !price.value || !productData.value || !images.value.length) {
    errorMessage.value = t('pages.forms.createProduct.fillAllFields')
    return
  }

  sended.value = true
  try {
    const productDataObj = {
      title: title.value,
      description: description.value,
      price: Number(price.value),
      product_data: productData.value,
      category_id: selectedSubcategoryId.value,
    }

    const result = await productService.createProduct(productDataObj, images.value)
    if (result && user?.username) {
      router.push(`/profile/${user?.username}`)
    } else {
      errorMessage.value = t('pages.forms.createProduct.errorCreatingProduct')
    }
  } catch (err: any) {
    console.error('Ошибка при создании товара:', err)
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
  <div class="no-scrollbar h-full w-full flex flex-col items-center overflow-scroll pb-36">
    <div class="max-w-md w-full border border-dark-700 rounded-2xl p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.forms.createProduct.title') }}
      </h1>

      <CustomSelect
        v-model="selectedCategoryId"
        :options="categories.map(c => ({ label: c.name, value: c.id }))"
        :label="t('common.category')"
        :placeholder="t('pages.forms.createProduct.selectCategory')"
      />

      <CustomSelect
        v-if="subcategories.length"
        v-model="selectedSubcategoryId"
        :options="subcategories.map(s => ({ label: s.name, value: s.id }))"
        :label="t('common.subcategory')"
        :placeholder="t('pages.forms.createProduct.selectSubcategory')"
      />

      <div v-if="selectedSubcategoryId" class="space-y-4">
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
          <label for="description" class="mb-2 block text-sm text-gray-300">{{ $t('common.description') }}</label>
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
            v-model="productData"
            rows="4"
            class="w-full rounded-lg bg-dark-600 border border-dark-700 px-4 py-2 text-mainText max-h-36"
          ></textarea>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-300">{{ $t('common.images') }}</label>
          <FileUploader v-model="images" :max-files="8" />
        </div>
      </div>

      <button
        v-if="selectedSubcategoryId"
        type="button"
        :disabled="sended"
        class="w-full rounded-lg bg-blue-600 py-2 text-mainText font-semibold hover:bg-blue-700 disabled:opacity-50"
        @click="createProduct"
      >
        {{ sended ? $t('pages.forms.createProduct.creating') : $t('common.create') }}
      </button>

      <ErrorBanner v-if="errorMessage" :message="errorMessage" />
    </div>
  </div>
</template>