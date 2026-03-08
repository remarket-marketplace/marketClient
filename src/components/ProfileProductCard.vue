<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import ProductStatusTag from './ProductStatusTag.vue'
import UserRating from './UserRating.vue'
import StyledUsername from './StyledUsername.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'

const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  product: Product
  isOwner: boolean
}>()

const emit = defineEmits<{
  click: [productKey: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST
const formattedPrice = computed(() => formatCurrencyAmount(props.product.price))

function onClick() {
  emit('click', buildProductKey(props.product))
}

function goToSeller() {
  if (props.isOwner) return
  router.push(`/user/${props.product.seller.username}`)
}
</script>

<template>
  <div
    class="profile-product-card flex h-full cursor-pointer flex-col rounded-2xl border border-dark-700 bg-dark-900 transition duration-200 hover:border-dark-500 hover:shadow-xl"
    @click="onClick"
  >
    <div class="profile-product-media relative m-1 mb-2 aspect-square w-auto overflow-hidden rounded-xl border-[0.5px] border-dark-600/70 bg-gray-700">
      <img
        v-if="product.images.length"
        :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="h-full w-full object-cover"
        alt="product image"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-sm text-gray-300">
        {{ t('common.noImage') }}
      </div>
    </div>

    <div class="profile-product-content flex min-w-0 flex-1 flex-col px-3 pb-3">
      <h3 class="profile-product-title mb-2 h-[2.25rem] min-w-0 w-full text-sm font-semibold leading-[1.125rem] text-mainText md:h-[2.5rem] md:text-base md:leading-5">
        {{ product.title }}
      </h3>

      <p class="profile-product-description mb-2 min-w-0 w-full line-clamp-2 min-h-[2rem] text-xs text-gray-400">
        {{ product.description || t('common.noDescription') }}
      </p>

      <hr class="mb-2 border-dark-700 opacity-80" />

      <div class="mt-auto flex w-full flex-col gap-2">
        <div v-if="!isOwner" class="flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            class="min-w-0 shrink truncate text-left text-xs underline decoration-transparent transition hover:decoration-blue-300 sm:text-sm"
            @click.stop="goToSeller"
          >
            <StyledUsername
              :username="product.seller.username"
              :style-id="product.seller.nickname_style_id"
              class="block truncate"
            />
          </button>
          <span v-if="product.seller.is_active" class="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
          <div class="flex-shrink-0">
            <UserRating :rating="product.seller.rating" />
          </div>
        </div>

        <div v-if="isOwner" class="flex w-full justify-end">
          <ProductStatusTag :product-status="product.status" size="compact" />
        </div>

        <button
          class="group relative w-full flex-shrink-0 cursor-pointer overflow-hidden whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-2 sm:text-sm"
          :class="isOwner
            ? 'border border-dark-600 bg-dark-700/70 text-gray-100 hover:bg-dark-700'
            : 'group bg-blue-600 text-white hover:bg-blue-700'"
          @click.stop="onClick"
        >
          <span
            class="block text-center tabular-nums"
            :class="!isOwner ? 'transition-all duration-200 group-hover:-translate-y-full group-hover:opacity-0' : ''"
          >
            {{ formattedPrice }}
          </span>
          <span
            v-if="!isOwner"
            class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          >
            {{ t('common.buy') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-product-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}

.profile-product-description {
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 359px), (min-width: 1536px) and (max-width: 1799px) {
  .profile-product-card {
    flex-direction: row;
    align-items: center;
    overflow: hidden;
  }

  .profile-product-media {
    flex: 0 0 auto;
    max-width: calc(50% - 8px);
    height: calc(100% - 16px);
    aspect-ratio: auto;
    margin: 8px 0 8px 8px;
  }

  .profile-product-content {
    min-width: 0;
    overflow: hidden;
  }

  .profile-product-title {
    display: block !important;
    height: auto !important;
    min-height: 0;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 1 !important;
    line-clamp: 1 !important;
  }

  .profile-product-description {
    display: block;
    min-height: 0 !important;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 1 !important;
    line-clamp: 1 !important;
  }

  .profile-product-content hr {
    margin-bottom: 6px;
  }

  .profile-product-content .mt-auto {
    gap: 6px;
  }
}

@media (max-width: 359px) {
  .profile-product-card {
    height: 118px;
    min-height: 118px;
    max-height: 118px;
  }

  .profile-product-media {
    width: 44%;
  }

  .profile-product-content {
    padding: 8px 10px;
  }
}

@media (min-width: 1536px) and (max-width: 1799px) {
  .profile-product-card {
    height: 142px;
    min-height: 142px;
    max-height: 142px;
  }

  .profile-product-media {
    width: clamp(160px, 36%, 200px);
  }

  .profile-product-content {
    padding: 10px 14px 10px 12px;
  }
}
</style>
