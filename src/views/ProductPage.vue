<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import type { Product, ProductImage } from '@/validation/product/product'
import { onMounted, ref, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, X, Heart, Trash, Trash2 } from 'lucide-vue-next'
import UserRating from '@/components/UserRating.vue'
import TrustComponent from './TrustComponent.vue'
import { useUserStore } from '@/stores/user'
import BackButton from '@/components/navigation/BackButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'

const API_HOST = import.meta.env.VITE_API_HOST
const RAIKA_BOT_URL = 'https://t.me/Raika_CheckBot'
const route = useRoute('/product/[productId]')
const router = useRouter()
const { locale, t } = useI18n()
const productId = route.params.productId as string


const store = useUserStore()
const user = await store.getUser()

const product = ref<Product | null>(null)
const selectedImage = ref<ProductImage | null>(null)
const openImageModal = ref(false)
const showDeleteConfirm = ref(false)
const showBuyConfirm = ref(false)
const buyError = ref<string | null>(null)

onMounted(async () => {
  try {
    product.value = await productService.getProductById(productId) ?? null
    selectedImage.value = product.value?.images?.[0] ?? null
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await router.replace({ name: 'notAccess' })
      return
    }

    console.error('Failed to load product:', error)
  }
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
  if (!product.value) return

  buyError.value = null

  const result = await productService.buyProduct(product.value.id)

  if (result.success) {
    router.push('/chats')
  } else if (result.error) {
    buyError.value = getErrorMessage(result.error, t)
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

async function likeProduct() {
  if (product.value) {
    const result = await productService.addProductLike(product.value.id)
    if (result) {
      product.value.is_liked = true
    }
  }
}

async function removeProductLike() {
  if (product.value) {
    const result = await productService.removeProductLike(product.value.id)
    if (result) {
      product.value.is_liked = false
    }
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

</script>

<template>
  <section v-if="product"
    class="h-full w-full flex flex-col items-start gap-2 lg:pt-2 overflow-scroll pb-36 text-mainText lg:px-0 lg:pb-6 px-4">
    <div class="pt-1">
      <BackButton />
    </div>

    <!-- Image gallery -->
    <div class="w-full flex flex-col lg:flex-row gap-5">
      <div class="w-full rounded-lg lg:w-3/5 space-y-4">
        <div v-if="selectedImage" class="flex justify-center bg-blue-500 rounded-lg overflow-hidden">
          <div class="w-full h-98 lg:h-[550px] relative flex items-center justify-center">
            <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
              class="absolute inset-0 w-full h-full object-cover cursor-zoom-in transition-opacity hover:opacity-90"
              loading="lazy" @click="openImageModal = true" />
          </div>
        </div>

        <div v-if="product.images && product.images.length > 1" class="flex gap-3 overflow-x-auto pb-2 no-scroollbar">
          <img v-for="image in product.images" :key="image.id" :src="`${API_HOST}${image.image_url}`"
            class="h-20 w-20 flex-shrink-0 cursor-pointer border-2 rounded-lg object-cover transition-all duration-200 hover:opacity-80"
            :alt="`Product image: ${product.title}`" :class="{
              'border-blue-500': image.image_url === selectedImage?.image_url,
              'border-dark-700': image.image_url !== selectedImage?.image_url,
            }" loading="lazy" @click="selectImage(image)">
        </div>

        <div v-else-if="!selectedImage && product.images?.length" class="py-4 text-center text-gray-400">
          {{ $t('pages.product.noImages') }}
        </div>

        <!-- Description -->
        <div class="py-4 space-y-4 hidden lg:block">
          <h1 class="text-xl font-bold text-white">{{ $t('pages.product.description') }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
            {{ product.description || $t('pages.product.descriptionMissing') }}
          </p>
        </div>
      </div>

      <!-- Product details -->
      <div class="w-full lg:flex-1 space-y-6 pt-4 lg:pt-0">
        <!-- Title and price -->
        <div class="flex justify-between">
          <div class="space-y-4">
            <h1 class="text-2xl lg:text-3xl font-bold text-white leading-tight">
              {{ product.title }}
            </h1>
            <div class="flex items-center gap-4">
              <span class="text-2xl lg:text-3xl font-bold text-green-400">
                {{ product.price }}₽
              </span>
              <ProductStatusTag v-if="product.is_owner || user?.role === 'admin'" :product-status="product.status" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-4 lg:hidden">
          <h1 class="text-xl font-bold text-white">{{ $t('pages.product.description') }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
            {{ product.description || $t('pages.product.descriptionMissing') }}
          </p>
        </div>

        <!-- Meta info -->
        <div class="space-y-3 py-4 border-t border-dark-700">
          <div class="flex items-center gap-3">
            <span class="text-gray-400 font-medium min-w-20">{{ $t('common.published') }}:</span>
            <span class="text-white">{{ formatFullDate(product.created_at) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-gray-400 font-medium min-w-20">{{ $t('common.category') }}:</span>
            <span class="text-white">{{ product.category?.name ?? $t('common.notSpecified') }}</span>
          </div>
        </div>

        <div
          v-if="product.is_raika_verified"
          class="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-xs text-emerald-200"
        >
          <p>
            {{ $t('pages.product.raikaVerifiedPrefix') }}
            <a
              :href="RAIKA_BOT_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="underline decoration-emerald-300/60 underline-offset-2 hover:text-emerald-100 transition-colors"
            >
              {{ $t('pages.product.raikaName') }}
            </a>
          </p>
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
          <div class="flex-1 flex flex-col gap-1">
            <p class="text-white font-semibold">
              {{ product.seller.username }}
            </p>
            <div class="flex">
              <UserRating :rating="product.seller.rating" />
            </div>
          </div>
          <div class="text-gray-400 text-xl transition-transform duration-200 group-hover:translate-x-1">
            →
          </div>
        </div>

        <!-- Action buttons -->
        <div class="pt-6 border-t border-gray-800">
          <div v-if="!product.is_sold" class="flex flex-col gap-3 sm:flex-row justify-end">
            <div class="w-full flex gap-6 pr-4 items-center justify-end" v-if="product.is_owner">
              <button
                class="rounded-lg flex-1 lg:flex-none bg-blue-600 px-4 py-4 text-sm text-white font-semibold transition hover:bg-blue-700 sm:px-6"
                @click="editProduct">
                {{ $t('common.edit') }}
              </button>
              <Trash2 @click="openDeleteConfirm" class="cursor-pointer w-6 h-6" />
            </div>

            <div v-else class="flex gap-6 pr-4 items-center">
              <span v-if="user === null" class="text-sm text-gray-400">
                {{ $t('pages.product.authRequired') }}
              </span>
              <div v-if="product.status === 'active'" class="flex flex-col items-end gap-1">
                <button :disabled="user === null" @click="user !== null && openBuyConfirm()" class="w-full rounded-lg px-10 py-4 text-base font-semibold transition sm:w-auto
        bg-blue-600 text-white hover:bg-blue-700
        disabled:bg-blue-600/40
        disabled:text-white/60
        disabled:cursor-not-allowed
        disabled:hover:bg-blue-600/40">
                  {{ $t('pages.product.buy') }}
                </button>
              </div>

              <div v-if="product.status == 'active'">
                <Heart v-if="product.is_liked" @click="removeProductLike" class="w-8 h-8 text-red-500 cursor-pointer"
                  :style="{ fill: 'currentColor' }" />
                <Heart v-else @click="likeProduct" class="cursor-pointer w-8 h-8" />
              </div>
            </div>

            <div v-if="buyError" class="mt-2 text-sm text-red-400">
              {{ buyError }}
            </div>
          </div>

          <div v-else
            class="w-full py-4 text-center bg-dark-600/40 border border-dark-700 text-gray-400 rounded-2xl font-semibold">
            {{ $t('pages.product.sold') }}
          </div>

        </div>

        <TrustComponent v-if="!product.is_owner" />
        <div v-else class="w-full flex justify-end gap-2 text-gray-400">
          <Heart />
          <span>{{ product.likes }}</span>
        </div>
      </div>
    </div>

    <div v-if="product.reviews" class="w-full flex flex-col gap-4">
      <p class="text-3xl font-bold">{{ $t('pages.product.reviews') }}</p>
      <div class="flex flex-col gap-2">
        <div v-for="review in product.reviews" :key="review.id"
          class="p-4 rounded-lg bg-gray-800/20 border border-dark-700">
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

    <ConfirmWindow :is-open="showBuyConfirm" :title="$t('pages.product.buyConfirm.title')"
      :message="$t('pages.product.buyConfirm.message')" :confirm-text="$t('pages.product.buyConfirm.confirm')"
      :cancel-text="$t('pages.product.buyConfirm.cancel')" @confirm="handleBuyConfirm" @cancel="closeBuyConfirm" />
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
