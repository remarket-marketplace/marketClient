<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import UserRating from './UserRating.vue'
import ProductStatusTag from './ProductStatusTag.vue'
import AutoDeliveryTag from './AutoDeliveryTag.vue'
import StyledUsername from './StyledUsername.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { resolveApiMediaUrl } from '@/utils/mediaUrl'
import { buildProductKey } from '@/utils/urlKeys'
import { ImageOff } from 'lucide-vue-next'
import { useCardImageReveal } from '@/composables/useCardImageReveal'

const { t } = useI18n()
const router = useRouter()

const props = withDefaults(defineProps<{
  product: Product
  showStatusTag?: boolean
}>(), {
  showStatusTag: false,
})

const emit = defineEmits<{
  click: [productKey: string]
}>()

const shouldShowSellerRating = computed(() => props.product.seller.rating > 0)
const activeImageIndex = ref(0)
const touchStartX = ref(0)
const touchStartY = ref(0)
const suppressNextCardClick = ref(false)
const brokenImageUrls = ref<Record<string, true>>({})

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

const formattedPrice = computed(() => formatCurrencyAmount(props.product.price))
const productPath = computed(() => `/product/${buildProductKey(props.product)}`)
const currentImageUrl = computed(() => {
  if (!props.product.images.length) return ''
  return resolveApiMediaUrl(
    props.product.images[activeImageIndex.value]?.image_url ?? props.product.images[0]?.image_url ?? '',
  )
})
const { imageElement, isImageLoaded, markImageLoaded, markImagePending } = useCardImageReveal(currentImageUrl)
const hasVisibleImage = computed(() => (
  Boolean(currentImageUrl.value) && !brokenImageUrls.value[currentImageUrl.value]
))

function markCurrentImageBroken(): void {
  if (!currentImageUrl.value) return
  markImagePending()
  brokenImageUrls.value = {
    ...brokenImageUrls.value,
    [currentImageUrl.value]: true,
  }
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
  <div
    class="flex flex-col cursor-pointer border border-[rgb(var(--palette-dark-700))] rounded-2xl hover:shadow-xl hover:border-[rgb(var(--palette-dark-500))] transition duration-200 bg-[rgb(var(--palette-dark-900))] h-full"
    @click="onClick">
    <!-- Image -->
    <div
      class="product-card-image-surface group relative m-1 mb-2 aspect-square w-auto overflow-hidden rounded-xl flex-shrink-0 border-[0.5px] border-[rgb(var(--palette-dark-600)/0.7)]"
      @pointermove="handleImagePointerMove"
      @pointerleave="resetActiveImage"
      @touchstart="handleImageTouchStart"
      @touchend="handleImageTouchEnd"
    >
      <Transition name="image-fade" mode="out-in">
        <img
          v-if="hasVisibleImage"
          ref="imageElement"
          :key="currentImageUrl"
          :src="currentImageUrl"
          class="h-full w-full object-cover transition-opacity duration-300"
          :class="isImageLoaded ? 'opacity-100' : 'opacity-0'"
          alt="product image"
          loading="lazy"
          decoding="async"
          @load="markImageLoaded"
          @error="markCurrentImageBroken"
        />
      </Transition>
      <div
        v-if="hasVisibleImage && !isImageLoaded"
        class="pointer-events-none absolute inset-0 animate-pulse bg-[rgb(var(--palette-dark-700)/0.72)]"
        aria-hidden="true"
      />
      <div
        v-if="product.images.length > 1 && hasVisibleImage"
        class="touch-dots pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <span
          v-for="(_, index) in product.images"
          :key="`dot-${product.id}-${index}`"
          class="h-1.5 rounded-full transition-all duration-150"
          :class="index === activeImageIndex ? 'w-4 bg-[rgb(var(--palette-white)/0.95)]' : 'w-1.5 bg-[rgb(var(--palette-white)/0.55)]'"
        />
      </div>
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--text-body)]">
        <ImageOff class="h-7 w-7 text-[var(--text-meta)]" />
        <span class="text-sm">{{ t('common.noImage') }}</span>
      </div>
      <div v-if="showStatusTag" class="pointer-events-none absolute right-2 top-2 z-10">
        <ProductStatusTag :product-status="product.status" />
      </div>
    </div>

    <div class="px-3 pb-3 flex flex-1 flex-col">
      <!-- Title -->
      <h3 class="product-title text-sm md:text-base font-semibold text-mainText leading-[1.125rem] md:leading-5 mb-2 h-[2.25rem] md:h-[2.5rem] flex-shrink-0">
        <RouterLink
          :to="productPath"
          class="hover:text-[var(--text-link)]"
          @click.stop
        >
          {{ product.title }}
        </RouterLink>
      </h3>

      <hr class="border-[rgb(var(--palette-dark-700))] opacity-80 mb-2 flex-shrink-0" />

      <!-- Bottom section with seller and button -->
      <div class="mt-auto flex w-full flex-col gap-2">
        <!-- Seller info-->
        <div class="flex w-full min-w-0 items-center gap-1 sm:gap-2 min-h-6">
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

          <span v-if="product.seller.is_active" class="w-2 h-2 rounded-full bg-[rgb(var(--palette-green-500))] flex-shrink-0 self-center" title="Online" />

          <!-- Rating -->
          <div v-if="shouldShowSellerRating" class="inline-flex flex-shrink-0 items-center self-center">
            <UserRating :rating="product.seller.rating" />
          </div>

          <div v-if="product.auto_delivery" class="ml-auto inline-flex flex-shrink-0 items-center self-center">
            <AutoDeliveryTag />
          </div>
        </div>

        <!-- Buy button -->
        <button
          class="market-primary-surface market-primary-hover group relative w-full flex-shrink-0 cursor-pointer overflow-hidden whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--text-title)] transition sm:px-3 sm:py-2 sm:text-sm"
          @click.stop="onClick">
          <span class="block text-center tabular-nums transition-all duration-200 group-hover:-translate-y-full group-hover:opacity-0">
            {{ formattedPrice }}
          </span>
          <span
            class="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
            {{ t('common.buy') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  text-overflow: ellipsis;
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
