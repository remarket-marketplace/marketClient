<script setup lang="ts">
import { Heart, ExternalLink, Star } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import { productService } from '@/api/product/ProductService'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'

const { t } = useI18n()
const router = useRouter()
const props = defineProps<{
  product: Product
  isOwner: boolean
}>()

const emit = defineEmits<{
  removed: [id: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST

function onClick() {
  router.push(`/product/${buildProductKey(props.product)}`)
}

function goToSeller(e: Event) {
  e.stopPropagation()
  if (!props.isOwner) {
    router.push(`/user/${props.product.seller.username}`)
  }
}

async function removeProductFromFavorites(e: Event) {
  e.stopPropagation()
  try {
    const result = await productService.removeProductLike(props.product.id)
    if (result) {
      emit('removed', props.product.id)
    }
  } catch (e) {
    console.error('Failed to remove product from favorites', e)
  }
}

// Форматирование даты
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  })
}
</script>

<template>
  <div
    class="flex flex-col h-full cursor-pointer"
    @click="onClick"
  >
    <!-- Product image -->
    <div class="favorite-product-image-surface relative mb-3 aspect-square w-full overflow-hidden">
      <img
        v-if="product.images && product.images.length > 0"
        :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        :alt="product.title"
        @error="(e: any) => e.target.src = '/api/placeholder/400/400'"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
      >
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-dark-600 flex items-center justify-center">
            <span class="text-2xl">📷</span>
          </div>
          <span class="text-xs text-gray-500">{{ $t('common.noImage') }}</span>
        </div>
      </div>

      <!-- Status badge -->
      <div
        v-if="product.is_sold"
        class="absolute top-2 left-2 px-2 py-1 rounded-md bg-dark-900/90 backdrop-blur-sm text-xs font-medium text-gray-300"
      >
        {{ $t('common.productStatuses.sold') }}
      </div>
      
      <!-- Heart button -->
      <button
        @click.stop="removeProductFromFavorites"
        class="absolute top-2 right-2 rounded-full border border-white/10 bg-dark-900/90 p-2 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-dark-900"
        :title="$t('pages.favoriteProducts.remove')"
      >
        <Heart
          class="w-5 h-5 text-red-500"
          :style="{ fill: 'currentColor' }"
        />
      </button>

      <!-- Count badge -->
      <div
        v-if="product.count > 1"
        class="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-blue-900/90 backdrop-blur-sm text-xs font-medium text-blue-300"
      >
        ×{{ product.count }}
      </div>
    </div>

    <!-- Product info -->
    <div class="flex flex-col flex-1 px-3 pb-3">
      <!-- Title -->
      <h3 class="text-sm font-semibold text-white line-clamp-2 mb-2 leading-tight">
        {{ product.title }}
      </h3>

      <!-- Category -->
      <div class="mb-2">
        <span class="px-2 py-1 rounded text-xs bg-dark-700 text-gray-400">
          {{ product.category.name }}
        </span>
      </div>

      <!-- Description -->
      <p class="text-xs text-gray-400 line-clamp-2 mb-3 flex-1">
        {{ product.description }}
      </p>

      <!-- Seller and price -->
      <div class="flex items-center justify-between gap-2">
        <!-- Seller -->
        <button
          @click.stop="goToSeller"
          class="flex items-center gap-2 min-w-0 group"
        >
          <div class="relative flex-shrink-0">
            <UserAvatar
              :avatar-url="product.seller.avatar_url"
              :alt="product.seller.username"
              class="w-6 h-6 rounded-full border border-dark-600 object-cover"
            />
            <div
              v-if="product.seller.is_active"
              class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-dark-700"
            />
          </div>
          <div class="min-w-0">
            <StyledUsername
              :username="product.seller.username"
              :style-id="product.seller.nickname_style_id"
              class="text-xs truncate transition-colors"
            />
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <Star class="w-3 h-3 text-yellow-500 fill-current" />
              <span>{{ product.seller.rating.toFixed(1) }}</span>
            </div>
          </div>
        </button>

        <!-- Price -->
        <div class="text-right flex-shrink-0">
          <div class="text-base font-bold text-white">
            {{ formatCurrencyAmount(product.price) }}
          </div>
          <div class="text-xs text-gray-500">
            {{ formatDate(product.created_at) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.favorite-product-image-surface {
  background: var(--product-card-image-placeholder-bg);
}
</style>
