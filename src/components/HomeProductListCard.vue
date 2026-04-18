<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import AutoDeliveryTag from '@/components/AutoDeliveryTag.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import UserRating from '@/components/UserRating.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'
import { ImageOff } from 'lucide-vue-next'

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
const shouldShowSellerRating = computed(() => props.product.seller.rating > 0)
const activeImageIndex = ref(0)
const touchStartX = ref(0)
const touchStartY = ref(0)
const suppressNextCardClick = ref(false)
const brokenImageUrls = ref<Record<string, true>>({})
const currentImageUrl = computed(() => {
  if (!props.product.images.length) return ''
  return `${API_HOST}${props.product.images[activeImageIndex.value]?.image_url ?? props.product.images[0]?.image_url ?? ''}`
})
const hasVisibleImage = computed(() => (
  Boolean(currentImageUrl.value) && !brokenImageUrls.value[currentImageUrl.value]
))

function markCurrentImageBroken(): void {
  if (!currentImageUrl.value) return
  brokenImageUrls.value = {
    ...brokenImageUrls.value,
    [currentImageUrl.value]: true,
  }
}

function onClick() {
  if (suppressNextCardClick.value) {
    suppressNextCardClick.value = false
    return
  }
  emit('click', buildProductKey(props.product))
}

function goToSeller() {
  router.push(`/user/${props.product.seller.username}`)
}

function handleImagePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  const imageCount = props.product.images.length
  if (imageCount <= 1) return

  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  if (rect.width <= 0) return

  const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
  const ratio = relativeX / rect.width
  const mappedIndex = Math.min(imageCount - 1, Math.floor(ratio * imageCount))
  activeImageIndex.value = mappedIndex
}

function resetActiveImage(event?: PointerEvent) {
  if (event?.pointerType === 'touch') return
  activeImageIndex.value = 0
}

function handleImageTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function handleImageTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return
  const imageCount = props.product.images.length
  if (imageCount <= 1) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value
  const horizontalThreshold = 24

  if (Math.abs(deltaX) < horizontalThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) return

  event.preventDefault()
  suppressNextCardClick.value = true

  if (deltaX < 0) {
    activeImageIndex.value = (activeImageIndex.value + 1) % imageCount
    return
  }

  activeImageIndex.value = (activeImageIndex.value - 1 + imageCount) % imageCount
}
</script>

<template>
  <article
    class="flex min-h-[112px] min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 transition duration-200 hover:border-dark-500 hover:shadow-xl sm:min-h-[128px]"
    @click="onClick"
  >
    <div
      class="product-card-image-surface group relative m-2 aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-dark-600/70 sm:w-28 md:w-32"
      @pointermove="handleImagePointerMove"
      @pointerleave="resetActiveImage"
      @touchstart="handleImageTouchStart"
      @touchend="handleImageTouchEnd"
    >
      <Transition name="image-fade" mode="out-in">
        <img
          v-if="hasVisibleImage"
          :key="currentImageUrl"
          :src="currentImageUrl"
          class="h-full w-full object-cover"
          alt="product image"
          @error="markCurrentImageBroken"
        />
      </Transition>
      <div
        v-if="product.images.length > 1 && hasVisibleImage"
        class="touch-dots pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <span
          v-for="(_, index) in product.images"
          :key="`dot-${product.id}-${index}`"
          class="h-1.5 rounded-full transition-all duration-150"
          :class="index === activeImageIndex ? 'w-4 bg-white/95' : 'w-1.5 bg-white/55'"
        />
      </div>
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-300">
        <ImageOff class="h-6 w-6 text-gray-500 sm:h-7 sm:w-7" />
        <span class="text-xs sm:text-sm">{{ t('common.noImage') }}</span>
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
          class="inline-flex min-h-6 min-w-0 shrink items-center text-left text-xs sm:text-sm"
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

        <div v-if="shouldShowSellerRating" class="inline-flex flex-shrink-0 items-center self-center">
          <UserRating :rating="product.seller.rating" />
        </div>

        <div v-if="product.auto_delivery" class="ml-auto inline-flex flex-shrink-0 items-center self-center">
          <AutoDeliveryTag />
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

.image-fade-enter-active,
.image-fade-leave-active {
  transition: opacity 0.18s ease;
}

.image-fade-enter-from,
.image-fade-leave-to {
  opacity: 0;
}

@media (hover: none) {
  .touch-dots {
    opacity: 1;
  }
}

.product-card-image-surface {
  background: var(--product-card-image-placeholder-bg);
}
</style>
