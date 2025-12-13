<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import type { Product, ProductImage } from '@/validation/product/product'
import type { ReviewSchema } from '@/validation/review/review'
import { onMounted, ref, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, X, Star } from 'lucide-vue-next'

const API_HOST = import.meta.env.VITE_API_HOST
const route = useRoute('/product/[productId]')
const router = useRouter()
const { locale, t } = useI18n()
const productId = route.params.productId as string

const product = ref<Product | null>(null)
const selectedImage = ref<ProductImage | null>(null)
const openImageModal = ref(false)
const showDeleteConfirm = ref(false)
const showBuyConfirm = ref(false)

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

function openBuyConfirm() {
  showBuyConfirm.value = true
}

async function handleBuyConfirm() {
  if (product.value) {
    const success = await productService.buyProduct(product.value.id)
    if (success) {
      router.push('/chats')
    }
  }
  showBuyConfirm.value = false
}

function closeBuyConfirm() {
  showBuyConfirm.value = false
}

function nextImage() {
  if (!product.value?.images || product.value.images.length === 0 || !selectedImage.value) return

  const currentIndex = product.value.images.findIndex(img => img.image_url === selectedImage.value?.image_url)
  if (currentIndex === -1) return

  const nextIndex = (currentIndex + 1) % product.value.images.length
  const nextImage = product.value.images[nextIndex]
  if (nextImage) {
    selectedImage.value = nextImage
  }
}

function prevImage() {
  if (!product.value?.images || product.value.images.length === 0 || !selectedImage.value) return

  const currentIndex = product.value.images.findIndex(img => img.image_url === selectedImage.value?.image_url)
  if (currentIndex === -1) return

  const prevIndex = (currentIndex - 1 + product.value.images.length) % product.value.images.length
  const prevImage = product.value.images[prevIndex]
  if (prevImage) {
    selectedImage.value = prevImage
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!openImageModal.value) return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      prevImage()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextImage()
      break
    case 'Escape':
      event.preventDefault()
      openImageModal.value = false
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const filledStars = computed(() => Math.round(product.value?.seller.rating ?? 0))

const reviews = computed<ReviewSchema[]>(() => {
  return product.value?.reviews ? (product.value.reviews as ReviewSchema[]) : []
})
</script>

<template>
  <section v-if="product"
    class="h-full max-w-7xl w-full flex flex-col items-start gap-6 overflow-auto no-scrollbar pb-36 text-mainText lg:overflow-visible lg:px-0 lg:pb-6">
    <!-- Image gallery -->

    <div class="w-full flex flex-col lg:flex-row">
      <div class="w-full rounded-lg lg:w-1/2 space-y-4">
        <div v-if="selectedImage" class="flex justify-center">
          <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
            class="h-96 max-w-md w-full cursor-zoom-in rounded-lg object-cover transition-opacity hover:opacity-90"
            loading="lazy" @click="openImageModal = true">
        </div>

        <div v-if="product.images && product.images.length > 1"
          class="flex gap-3 overflow-x-auto pb-2 thumbnails-scroll">
          <img v-for="image in product.images" :key="image.id" :src="`${API_HOST}${image.image_url}`"
            class="h-16 w-16 flex-shrink-0 cursor-pointer border-2 rounded-lg object-cover transition-all duration-200 hover:opacity-80"
            :alt="`Product image: ${product.title}`" :class="{
              'border-gray-600': image.image_url !== selectedImage?.image_url,
            }" loading="lazy" @click="selectImage(image)">
        </div>

        <div v-else-if="!selectedImage && product.images?.length" class="py-4 text-center text-gray-400">
          {{ $t('pages.product.noImages') }}
        </div>
      </div>

      <!-- Product details -->
      <div class="w-full lg:flex-1 space-y-6 pt-4 lg:pt-0">
        <!-- Title and price -->
        <div class="space-y-4">
          <h1 class="text-2xl lg:text-3xl font-bold text-white leading-tight">
            {{ product.title }}
          </h1>
          <div class="flex items-center gap-4">
            <span class="text-2xl lg:text-3xl font-bold text-green-400">
              {{ product.price }}₽
            </span>
            <ProductStatusTag :product-status="product.status" />
          </div>
        </div>

        <!-- Description -->
        <div class="py-4">
          <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
            {{ product.description || $t('pages.product.descriptionMissing') }}
          </p>
        </div>

        <!-- Meta info -->
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

        <!-- Seller -->
        <div
          class="flex items-center gap-4 p-4 rounded-xl bg-dark-600 cursor-pointer transition-all duration-200 hover:bg-dark-600/80 group"
          @click="router.push(`/user/${product.seller.username}`)">
          <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
            <img v-if="product.seller.avatar_url" :src="`${API_HOST}${product.seller.avatar_url}`"
              class="w-full h-full object-cover" alt="Seller avatar">
            <div v-else class="text-white font-bold text-lg">
              {{ product.seller.username.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="flex-1">
            <p class="text-white font-semibold">
              {{ product.seller.username }}
            </p>
            <div class="flex items-center gap-1 mt-1">
              <Star v-for="(_, i) in 5" :key="i" class="w-5 h-5"
                :class="i < filledStars ? 'text-blue-500 fill-blue-500' : 'text-gray-500'" />
            </div>
          </div>
          <div class="text-gray-400 text-xl transition-transform duration-200 group-hover:translate-x-1">
            →
          </div>
        </div>

        <!-- Action buttons -->
        <div class="pt-6 border-t border-gray-800">
          <div v-if="!product.is_sold" class="flex flex-col gap-3 sm:flex-row">
            <div class="w-full flex gap-2" v-if="product.is_owner">
              <button
                class="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white font-semibold transition hover:bg-yellow-700 sm:px-6"
                @click="editProduct">
                {{ $t('common.edit') }}
              </button>
              <button
                class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white font-semibold transition hover:bg-red-700 sm:px-6"
                @click="openDeleteConfirm">
                {{ $t('common.delete') }}
              </button>
            </div>

            <button v-else
              class="w-full rounded-lg bg-blue-600 px-6 py-3 text-base text-white font-semibold transition hover:bg-blue-700 sm:w-auto"
              @click="openBuyConfirm">
              {{ $t('pages.product.buy') }}
            </button>
          </div>

          <div v-else class="w-full py-4 text-center bg-gray-700 text-gray-400 rounded-xl font-semibold">
            {{ $t('pages.product.sold') }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="product.reviews" class="w-full flex flex-col gap-4">
      <p class="text-3xl font-bold">{{ $t('pages.product.reviews') }}</p>
      <div class="flex flex-col gap-2">
        <div v-for="review in product.reviews" :key="review.id" class="p-4 rounded-lg bg-gray-800/20 border border-gray-700">
          <div class="flex justify-between items-center">
            <span class="font-medium">{{ review.rating }} ⭐</span>
            <span class="text-xs text-gray-400">{{ formatFullDate(review.created_at) }}</span>
          </div>
          <p class="mt-2 text-sm">{{ review.body }}</p>
        </div>
      </div>
    </div>

    <!-- Image modal -->
    <Teleport to="body">
      <div v-if="openImageModal && selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer"
        @click="openImageModal = false">
        <div class="relative w-full h-full flex items-center justify-center max-w-7xl mx-auto" @click.stop>
          <img :src="`${API_HOST}${selectedImage.image_url}`" class="max-w-full max-h-full object-contain rounded-lg"
            :alt="`Modal image: ${product.title}`" loading="lazy" />

          <button
            class="absolute top-4 right-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-2 hover:bg-black/70"
            @click="openImageModal = false">
            <X class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            class="absolute left-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-3 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="product.images.findIndex(img => img.image_url === selectedImage?.image_url) === 0"
            @click="prevImage">
            <ChevronLeft class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            class="absolute right-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-3 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="product.images.findIndex(img => img.image_url === selectedImage?.image_url) === product.images.length - 1"
            @click="nextImage">
            <ChevronRight class="w-6 h-6" />
          </button>

          <div v-if="product.images && product.images.length > 1"
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full px-3 py-1 text-white text-sm">
            {{product.images.findIndex(img => img.image_url === selectedImage?.image_url) + 1}} / {{
              product.images.length }}
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmWindow :is-open="showDeleteConfirm" :title="$t('pages.product.deleteConfirm.title')"
      :message="$t('pages.product.deleteConfirm.message')" :confirm-text="$t('pages.product.deleteConfirm.confirm')"
      :cancel-text="$t('pages.product.deleteConfirm.cancel')" @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm" />

    <ConfirmWindow :is-open="showBuyConfirm"
      :title="$t('pages.product.buyConfirm.title')"
      :message="$t('pages.product.buyConfirm.message')"
      :confirm-text="$t('pages.product.buyConfirm.confirm')"
      :cancel-text="$t('pages.product.buyConfirm.cancel')"
      @confirm="handleBuyConfirm"
      @cancel="closeBuyConfirm" />
  </section>

  <div v-else class="w-full h-full flex items-center justify-center">
    <Loader />
  </div>
</template>

<style scoped>
/* Custom scrollbar for image thumbnails */
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

/* Button hover animations */
button {
  transition: all 0.2s ease-in-out;
}
</style>
