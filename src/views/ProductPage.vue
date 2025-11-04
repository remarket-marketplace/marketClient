<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import type { Product, ProductImage } from '@/validation/product/product'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const API_HOST = import.meta.env.VITE_API_HOST
const route = useRoute('/product/[productId]')
const router = useRouter()
const { locale, t } = useI18n()
const productId = route.params.productId as string

const product = ref<Product | null>(null)
const selectedImage = ref<ProductImage | null>(null)
const openImageModal = ref(false)
const showDeleteConfirm = ref(false)

onMounted(async () => {
  product.value = await productService.getProductById(productId) ?? null
  selectedImage.value = product.value?.images?.[0] ?? null
})

function selectImage(image: ProductImage) {
  selectedImage.value = image
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function buyProduct(productId: string) {
  const result = await productService.buyProduct(productId)

  if (result === true) {
    router.push('/chats')
  }
}

function editProduct() {
  router.push(`/product/edit/${product.value?.id}`)
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
}

async function handleDeleteConfirm() {
  if (product.value) {
    const success = await productService.deleteProduct(product.value.id)
    if (success) {
      router.push('/')
    }
  }
  showDeleteConfirm.value = false
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
}

function getStatusText(status: string) {
  switch (status) {
    case 'rejected': return t('common.rejected')
    case 'moderation': return t('common.moderation')
    case 'active': return t('common.productStatuses.active')
    case 'purchased': return t('pages.profile.purchased')
    default: return status
  }
}
</script>

<template>
  <section v-if="product" class="h-full max-w-7xl w-full flex flex-col items-start gap-6 overflow-auto pb-36 text-mainText lg:flex-row lg:overflow-visible lg:px-0 lg:pb-6">
    <!-- Галерея изображений -->
    <div class="w-full rounded-lg lg:w-1/2 space-y-4">
      <div v-if="selectedImage" class="flex justify-center">
        <img
          :src="`${API_HOST}${selectedImage.image_url}`"
          :alt="product.title"
          class="h-96 max-w-md w-full cursor-zoom-in rounded-lg object-cover transition-opacity hover:opacity-90"
          loading="lazy"
          @click="openImageModal = true"
        >
      </div>

      <div
        v-if="product.images && product.images.length > 1"
        class="flex gap-3 overflow-x-auto pb-2 thumbnails-scroll"
      >
        <img
          v-for="image in product.images"
          :key="image.id"
          :src="`${API_HOST}${image.image_url}`"
          class="h-16 w-16 flex-shrink-0 cursor-pointer border-2 rounded-lg object-cover transition-all duration-200 hover:opacity-80"
          :alt="`Изображение товара: ${product.title}`"
          :class="{
            'border-blue-500 ring-2 ring-blue-400': image.image_url === selectedImage?.image_url,
            'border-gray-600': image.image_url !== selectedImage?.image_url,
          }"
          loading="lazy"
          @click="selectImage(image)"
        >
      </div>

      <div v-else-if="!selectedImage && product.images?.length" class="py-4 text-center text-gray-400">
        {{ $t('pages.product.noImages') }}
      </div>
    </div>

    <!-- Информация о товаре -->
    <div class="w-full lg:flex-1 space-y-6">
      <!-- Заголовок и цена -->
      <div class="space-y-4">
        <h1 class="text-2xl lg:text-3xl font-bold text-white leading-tight">
          {{ product.title }}
        </h1>
        <div class="flex items-center gap-4">
          <span class="text-2xl lg:text-3xl font-bold text-green-400">
            {{ product.price }}₽
          </span>
          <ProductStatusTag :product-status="product.status"/>
        </div>
      </div>

      <!-- Описание -->
      <div class="py-4">
        <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
          {{ product.description || $t('pages.product.descriptionMissing') }}
        </p>
      </div>

      <!-- Мета информация -->
      <div class="space-y-3 py-4 border-t border-gray-800">
        <div class="flex items-center gap-3">
          <span class="text-gray-400 font-medium min-w-20">{{ $t('common.published') }}:</span>
          <span class="text-white">{{ formatFullDate(product.created_at) }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-gray-400 font-medium min-w-20">{{ $t('common.category') }}:</span>
          <span class="text-white">{{ product.category?.name ?? $t('common.notSpecified') }}</span>
        </div>
      </div>

      <!-- Продавец -->
      <div 
        class="flex items-center gap-4 p-4 rounded-xl bg-dark-600 cursor-pointer transition-all duration-200 hover:bg-dark-600/80 group"
        @click="router.push(`/profile/${product.seller.username}`)"
      >
        <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
          <img
            v-if="product.seller.avatar_url"
            :src="`${API_HOST}${product.seller.avatar_url}`"
            class="w-full h-full object-cover"
            alt="Seller avatar"
          >
          <div v-else class="text-white font-bold text-lg">
            {{ product.seller.username.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex-1">
          <p class="text-white font-semibold">
            {{ product.seller.username }}
          </p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-yellow-400 text-sm font-medium">
              {{ product.seller.rating.toFixed(1) }}
            </span>
            <span class="text-yellow-400 text-xs">★★★★★</span>
          </div>
        </div>
        <div class="text-gray-400 text-xl transition-transform duration-200 group-hover:translate-x-1">
          →
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="pt-6 border-t border-gray-800">
        <div v-if="!product.is_sold" class="flex flex-col gap-3 sm:flex-row">
          <div class="w-full flex gap-2" v-if="product.is_owner">
            <button
              class="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white font-semibold transition hover:bg-yellow-700 sm:px-6"
              @click="editProduct"
            >
              {{ $t('common.edit') }}
            </button>
            <button
              class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white font-semibold transition hover:bg-red-700 sm:px-6"
              @click="openDeleteConfirm"
            >
              {{ $t('common.delete') }}
            </button>
          </div>

          <button
            v-else
            class="w-full rounded-lg bg-blue-600 px-6 py-3 text-base text-white font-semibold transition hover:bg-blue-700 sm:w-auto"
            @click="buyProduct(product.id)"
          >
            {{ $t('pages.product.buy') }}
          </button>
        </div>

        <div v-else class="w-full py-4 text-center bg-gray-700 text-gray-400 rounded-xl font-semibold">
          {{ $t('pages.product.sold') }}
        </div>
      </div>
    </div>

    <!-- Модальное окно изображения -->
    <Teleport to="body">
      <div
        v-if="openImageModal && selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer"
        @click="openImageModal = false"
      >
        <div class="relative w-full h-full flex items-center justify-center" @click.stop>
          <img
            :src="`${API_HOST}${selectedImage.image_url}`"
            class="max-w-full max-h-full object-contain rounded-lg"
            :alt="`Модальное изображение: ${product.title}`"
            loading="lazy"
          >
          <button
            class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 bg-black/50 rounded-full p-2"
            @click="openImageModal = false"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </Teleport>

    <ConfirmWindow
      :is-open="showDeleteConfirm"
      :title="$t('pages.product.deleteConfirm.title')"
      :message="$t('pages.product.deleteConfirm.message')"
      :confirm-text="$t('pages.product.deleteConfirm.confirm')"
      :cancel-text="$t('pages.product.deleteConfirm.cancel')"
      @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm"
    />
  </section>

  <div v-else class="w-full h-full flex items-center justify-center">
    <Loader/>
  </div>
</template>

<style scoped>
/* Кастомные стили для скроллбара */
.thumbnails-scroll {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #1F2937;
}

.thumbnails-scroll::-webkit-scrollbar {
  height: 6px;
}

.thumbnails-scroll::-webkit-scrollbar-track {
  background: #1F2937;
  border-radius: 3px;
}

.thumbnails-scroll::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 3px;
}

.thumbnails-scroll::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}
</style>