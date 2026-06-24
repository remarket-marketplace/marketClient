<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import ProductStatusTag from './ProductStatusTag.vue'
import UserRating from './UserRating.vue'
import AutoDeliveryTag from './AutoDeliveryTag.vue'
import StyledUsername from './StyledUsername.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { buildProductKey } from '@/utils/urlKeys'
import { resolveApiMediaUrl } from '@/utils/mediaUrl'
import { ImageOff } from 'lucide-vue-next'
import { useCardImageReveal } from '@/composables/useCardImageReveal'
const { t } = useI18n()
const router = useRouter()

const props = defineProps<{
  product: Product
  isOwner: boolean
  hideDescription?: boolean
}>()

const emit = defineEmits<{
  click: [productKey: string]
}>()

const formattedPrice = computed(() => formatCurrencyAmount(props.product.price))
const shouldShowSellerRating = computed(() => props.product.seller.rating > 0)
const activeImageIndex = ref(0)
const touchStartX = ref(0)
const touchStartY = ref(0)
const suppressNextCardClick = ref(false)
const brokenImageUrls = ref<Record<string, true>>({})
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

function onClick() {
  if (suppressNextCardClick.value) {
    suppressNextCardClick.value = false
    return
  }
  emit('click', buildProductKey(props.product))
}

function goToSeller() {
  if (props.isOwner) return
  router.push(`/user/${props.product.seller.username}`)
}

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
    class="profile-product-card flex h-full cursor-pointer flex-col rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-900))] transition duration-200 hover:border-[rgb(var(--palette-dark-500))] hover:shadow-xl"
    @click="onClick"
  >
    <div
      class="profile-product-media profile-product-image-surface group relative m-1 mb-2 aspect-square w-auto overflow-hidden rounded-xl border-[0.5px] border-[rgb(var(--palette-dark-600)/0.7)]"
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
    </div>

    <div class="profile-product-content flex min-w-0 flex-1 flex-col px-3 pb-3">
      <h3 class="profile-product-title mb-2 h-[2.25rem] min-w-0 w-full text-sm font-semibold leading-[1.125rem] text-mainText md:h-[2.5rem] md:text-base md:leading-5">
        {{ product.title }}
      </h3>

      <p
        v-if="!hideDescription"
        class="profile-product-description mb-2 min-w-0 w-full line-clamp-2 min-h-[2rem] text-xs text-[var(--text-muted)]"
      >
        {{ product.description || t('common.noDescription') }}
      </p>

      <hr class="border-[rgb(var(--palette-dark-700))] opacity-80" :class="hideDescription ? 'mb-3 mt-1' : 'mb-2'" />

      <div class="mt-auto flex w-full flex-col gap-2">
        <div v-if="!isOwner" class="flex w-full min-w-0 items-center gap-1.5 sm:gap-2 min-h-6">
          <button
            type="button"
            class="inline-flex min-h-6 min-w-0 shrink items-center truncate text-left text-xs transition sm:text-sm"
            @click.stop="goToSeller"
          >
            <StyledUsername
              :username="product.seller.username"
              :style-id="product.seller.nickname_style_id"
              class="block truncate leading-none"
            />
          </button>
          <span v-if="product.seller.is_active" class="h-2 w-2 flex-shrink-0 self-center rounded-full bg-[rgb(var(--palette-green-500))]" />
          <div v-if="shouldShowSellerRating" class="inline-flex flex-shrink-0 items-center self-center">
            <UserRating :rating="product.seller.rating" />
          </div>

          <div v-if="product.auto_delivery" class="ml-auto inline-flex flex-shrink-0 items-center self-center">
            <AutoDeliveryTag />
          </div>
        </div>

        <div v-if="isOwner" class="flex w-full items-center gap-2">
          <ProductStatusTag :product-status="product.status" size="compact" />
          <div v-if="product.auto_delivery" class="inline-flex flex-shrink-0 items-center self-center">
            <AutoDeliveryTag />
          </div>
        </div>

        <button
          class="group relative w-full flex-shrink-0 cursor-pointer overflow-hidden whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-2 sm:text-sm"
          :class="isOwner
            ? 'border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.7)] text-[var(--text-heading)] hover:bg-[rgb(var(--palette-dark-700))]'
            : 'group market-primary-surface market-primary-hover text-[var(--text-title)]'"
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

.profile-product-image-surface {
  background: var(--product-card-image-placeholder-bg);
}

@media (max-width: 359px) {
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

</style>
