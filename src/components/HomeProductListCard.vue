<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import StyledUsername from '@/components/StyledUsername.vue'
import UserRating from '@/components/UserRating.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'

const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  product: Product
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
  router.push(`/user/${props.product.seller.username}`)
}
</script>

<template>
  <article
    class="flex min-h-[112px] min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 transition duration-200 hover:border-dark-500 hover:shadow-xl sm:min-h-[128px]"
    @click="onClick"
  >
    <div class="relative m-2 aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-dark-600/70 bg-gray-700 sm:w-28 md:w-32">
      <img
        v-if="product.images.length"
        :src="`${API_HOST}${product.images[0]?.image_url}`"
        class="h-full w-full object-cover"
        alt="product image"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-xs text-gray-300 sm:text-sm">
        {{ t('common.noImage') }}
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col py-2 pr-3 sm:py-3 sm:pr-4">
      <div class="flex min-w-0 items-start justify-between gap-3">
        <h3 class="home-list-title min-w-0 text-sm font-semibold text-mainText sm:text-base">
          {{ product.title }}
        </h3>
        <div class="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white sm:text-sm">
          {{ formattedPrice }}
        </div>
      </div>

      <p class="home-list-description mt-1 min-w-0 text-xs text-gray-400 sm:text-sm">
        {{ product.description || t('common.noDescription') }}
      </p>

      <div class="mt-auto flex w-full min-w-0 items-center gap-1.5 sm:gap-2 min-h-6">
        <button
          type="button"
          class="inline-flex min-h-6 min-w-0 shrink items-center text-left text-xs underline decoration-transparent hover:decoration-blue-300 sm:text-sm"
          @click.stop="goToSeller"
        >
          <StyledUsername
            :username="product.seller.username"
            :style-id="product.seller.nickname_style_id"
            class="block truncate leading-none transition"
          />
        </button>

        <span
          v-if="product.seller.is_active"
          class="h-2 w-2 flex-shrink-0 self-center rounded-full bg-green-500"
          title="Online"
        />

        <div class="inline-flex flex-shrink-0 items-center self-center">
          <UserRating :rating="product.seller.rating" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.home-list-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.home-list-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
