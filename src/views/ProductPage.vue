<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import ConfirmDelete from '@/components/ConfirmDelete.vue'
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
</script>

<template>
  <section v-if="product" class="no-scrollbar h-full max-w-7xl w-full flex flex-col items-start gap-6 overflow-scroll px-4 pb-36 text-mainText lg:flex-row lg:px-0">
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
        class="scrollbar-width-none flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
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

    <!-- Информация о товаре, в стиле профиля -->
    <div class="w-full border-1 border-dark-600 rounded-lg p-6 lg:flex-1 space-y-4">
      <div class="flex flex-col gap-4">
        <h1 class="truncate text-2xl text-mainText font-bold sm:text-3xl">
          {{ product.title }}
        </h1>
        <p class="text-2xl text-green-400 font-bold">
          {{ product.price }}₽
        </p>
      </div>

      <div class="whitespace-pre-line text-sm text-gray-300 leading-relaxed sm:text-base">
        {{ product.description || $t('pages.product.descriptionMissing') }}
      </div>

      <!-- Мета информация, как в профиле -->
      <div class="border-t border-gray-700 pt-4 text-sm text-gray-400 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-mainText font-semibold">{{ $t('common.published') }}:</span>
          <span>{{ formatFullDate(product.created_at) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-mainText font-semibold">{{ $t('common.category') }}:</span>
          <span>{{ product.category?.name ?? $t('common.notSpecified') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-mainText font-semibold">{{ $t('common.status') }}:</span>
          <span
            v-if="product.status === 'rejected'"
            class="rounded bg-red-400 px-2 py-1 text-mainText"
          >
            {{ $t('common.rejected') }}
          </span>

          <span
            v-if="product.status === 'moderation'"
            class="rounded bg-yellow-600 px-2 py-1 text-mainText"
          >
            {{ $t('common.moderation') }}
          </span>

          <span
            v-if="product.status === 'active'"
            class="rounded bg-green-600 px-2 py-1 text-mainText"
          >
            {{ $t('common.active') }}
          </span>

          <span
            v-if="product.status === 'purchased'"
            class="rounded bg-gray-600 px-2 py-1 text-mainText"
          >
            {{ $t('pages.profile.purchased') }}
          </span>
        </div>

        <!-- Информация о продавце -->
        <div class="flex cursor-pointer items-center gap-3 border-t border-gray-700 pt-2" @click="router.push(`/profile/${product.seller.username}`)">
          <img
            v-if="product.seller.avatar_url"
            :src="`${API_HOST}${product.seller.avatar_url}`"
            class="h-8 w-8 rounded-full object-cover"
            alt="Seller avatar"
          >
          <div>
            <p class="text-sm text-mainText font-semibold">
              {{ product.seller.username }}
            </p>
            <p class="text-xs text-gray-400">
              {{ $t('common.rating') }}: {{ product.seller.rating.toFixed(1) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Кнопки, стилизованные как в профиле -->
      <div v-if="!product.is_sold" class="flex flex-col gap-3 border-t border-gray-700 pt-4 sm:flex-row">
        <div class="w-full flex gap-2" v-if="product.is_owner">
          <button
            class="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm text-mainText font-semibold transition hover:bg-yellow-700 sm:px-6"
            @click="editProduct"
          >
            {{ $t('common.edit') }}
          </button>
          <button
            class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-mainText font-semibold transition hover:bg-red-700 sm:px-6"
            @click="openDeleteConfirm"
          >
            {{ $t('common.delete') }}
          </button>
        </div>

        <template v-else>
          <button
            class="w-full rounded-lg bg-blue-600 px-6 py-3 text-base text-mainText font-semibold transition sm:w-auto hover:bg-blue-700"
            @click="buyProduct(product.id)"
          >
            {{ $t('pages.product.buy') }}
          </button>
        </template>
      </div>
    </div>

    <!-- Модальное окно -->
    <Teleport to="body">
      <div
        v-if="openImageModal && selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
        @click.self="openImageModal = false"
      >
        <img
          :src="`${API_HOST}${selectedImage.image_url}`"
          class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-xl"
          :alt="`Модальное изображение: ${product.title}`"
          loading="lazy"
        >
        <button
          class="absolute right-4 top-4 text-3xl text-mainText font-bold hover:text-blue-500"
          @click="openImageModal = false"
        >
          &times;
        </button>
      </div>
    </Teleport>

    <ConfirmDelete
      :is-open="showDeleteConfirm"
      :title="$t('pages.product.deleteConfirmTitle')"
      :message="$t('pages.product.deleteConfirmMessage')"
      :confirm-text="$t('pages.product.deleteConfirm')"
      :cancel-text="$t('pages.product.deleteCancel')"
      @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm"
    />
  </section>

  <div v-else class="text-gray-400">
    {{ $t('pages.product.loading') }}
  </div>
</template>