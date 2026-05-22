<script setup lang="ts">
import type { Product } from '@/validation/product/product'
import { formatCurrencyAmount } from '@/utils/currency'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  products: Product[]
  loading?: boolean
  skeletonCount?: number
}>(), {
  loading: false,
  skeletonCount: 7,
})

const emit = defineEmits<{
  productClick: [product: Product]
  viewAll: []
}>()

const { t } = useI18n()
const API_HOST = import.meta.env.VITE_API_HOST

const carouselRef = ref<HTMLElement | null>(null)
const isCarouselAtStart = ref(true)
const isCarouselAtEnd = ref(false)
const STAGGER_STEP_MS = 90

function resolveProductImageUrl(product: Product): string {
  const firstImage = product.images[0]?.image_url ?? ''
  if (!firstImage) return ''
  if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
    return firstImage
  }
  return `${API_HOST}${firstImage}`
}

function formatOfficialPrice(price: number): string {
  return formatCurrencyAmount(price, {
    currency: 'RUB',
    fromCurrency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function updateCarouselState() {
  const carouselElement = carouselRef.value
  if (!carouselElement) {
    isCarouselAtStart.value = true
    isCarouselAtEnd.value = true
    return
  }

  const maxScrollLeft = Math.max(0, carouselElement.scrollWidth - carouselElement.clientWidth)
  const scrollLeft = Math.max(0, carouselElement.scrollLeft)
  const edgeThreshold = 8
  isCarouselAtStart.value = scrollLeft <= edgeThreshold
  isCarouselAtEnd.value = scrollLeft >= maxScrollLeft - edgeThreshold
}

function scrollCarousel(direction: 'prev' | 'next') {
  const carouselElement = carouselRef.value
  if (!carouselElement) return

  const firstCard = carouselElement.querySelector<HTMLElement>('[data-official-product-card]')
  const scrollStep = firstCard
    ? firstCard.offsetWidth + 16
    : Math.max(320, Math.round(carouselElement.clientWidth * 0.82))

  carouselElement.scrollBy({
    left: direction === 'next' ? scrollStep : -scrollStep,
    behavior: 'smooth',
  })

  window.setTimeout(updateCarouselState, 320)
}

function getRevealDelayStyle(index: number): Record<string, string> {
  return {
    transitionDelay: `${index * STAGGER_STEP_MS}ms`,
  }
}

watch(() => [props.products.length, props.loading], async () => {
  await nextTick()
  updateCarouselState()
})

onMounted(async () => {
  await nextTick()
  updateCarouselState()
  window.addEventListener('resize', updateCarouselState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCarouselState)
})
</script>

<template>
  <section class="official-products-showcase rounded-3xl">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <div class="official-products-showcase__heading inline-flex min-w-0 items-center gap-2">
          <span class="official-products-showcase__mark">
            <span aria-hidden="true">🔥</span>
          </span>
          <span class="truncate">{{ t('pages.index.officialHome.title') }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="official-products-showcase__ghost-btn !hidden sm:!inline-flex"
          @click="emit('viewAll')"
        >
          <span>{{ t('pages.index.officialHome.viewAll') }}</span>
          <ChevronRight class="h-4 w-4" />
        </button>

        <div class="official-products-showcase__control-group hidden items-center gap-1 rounded-full p-1 sm:inline-flex">
          <button
            type="button"
            class="official-products-showcase__arrow-btn"
            :disabled="isCarouselAtStart || props.loading || products.length <= 1"
            :aria-label="t('pages.index.officialHome.scrollPrev')"
            @click="scrollCarousel('prev')"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="official-products-showcase__arrow-btn"
            :disabled="isCarouselAtEnd || props.loading || products.length <= 1"
            :aria-label="t('pages.index.officialHome.scrollNext')"
            @click="scrollCarousel('next')"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="relative">
      <div
        ref="carouselRef"
        class="official-products-showcase__carousel flex gap-4 overflow-x-auto pr-1 no-scrollbar snap-x snap-mandatory"
        @scroll.passive="updateCarouselState"
      >
        <template v-if="props.loading">
          <div
            v-for="n in props.skeletonCount"
            :key="`official-showcase-skeleton-${n}`"
            data-official-product-card
            class="official-products-showcase__card official-products-showcase__skeleton w-[188px] shrink-0 snap-start sm:w-[190px] lg:w-[196px]"
          >
            <div class="official-products-showcase__card-media aspect-square w-full rounded-xl"></div>
            <div class="pt-2">
              <div class="official-products-showcase__skeleton-line h-5 w-20 rounded"></div>
              <div class="official-products-showcase__skeleton-line mt-2 h-4 w-full rounded"></div>
              <div class="official-products-showcase__skeleton-line mt-1.5 h-4 w-3/4 rounded"></div>
            </div>
          </div>
        </template>

        <TransitionGroup
          v-else
          name="official-card-reveal"
          tag="div"
          class="contents"
        >
          <button
            v-for="(product, index) in products"
            :key="`official-showcase-${product.id}`"
            type="button"
            data-official-product-card
            class="official-products-showcase__card w-[188px] shrink-0 snap-start text-left sm:w-[190px] lg:w-[196px]"
            :style="getRevealDelayStyle(index)"
            @click="emit('productClick', product)"
          >
            <div class="official-products-showcase__card-media relative aspect-square w-full overflow-hidden rounded-xl">
              <img
                v-if="resolveProductImageUrl(product)"
                :src="resolveProductImageUrl(product)"
                :alt="product.title"
                class="h-full w-full object-cover object-center"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-xs text-[var(--text-body)]">
                {{ t('common.noImage') }}
              </div>
            </div>
            <div class="pt-2">
              <p class="official-products-showcase__card-price text-[1.25rem] font-extrabold leading-none sm:text-[1.35rem]">
                {{ formatOfficialPrice(product.price) }}
              </p>
              <p class="official-products-showcase__card-title mt-1 min-h-[2.5rem] text-[0.88rem] leading-5 sm:text-[0.94rem]">
                {{ product.title }}
              </p>
            </div>
          </button>
        </TransitionGroup>
      </div>
    </div>

    <div class="mt-3 sm:hidden">
      <button
        type="button"
        class="official-products-showcase__ghost-btn w-full justify-center"
        @click="emit('viewAll')"
      >
        <span>{{ t('pages.index.officialHome.viewAllProducts') }}</span>
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.official-products-showcase {
  border: 1px solid var(--home-official-surface-border);
  background-color: var(--home-official-surface-bg);
  backdrop-filter: blur(20px) saturate(1.14);
  -webkit-backdrop-filter: blur(20px) saturate(1.14);
}

.official-products-showcase__heading {
  min-width: 0;
  color: var(--home-official-title);
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.25;
}

.official-products-showcase__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.15rem;
  line-height: 1;
}

.official-products-showcase__control-group {
  border: 1px solid var(--home-official-control-border);
  background-color: var(--home-official-control-bg);
}

.official-products-showcase__ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid var(--home-official-control-border);
  background-color: var(--home-official-control-bg);
  padding: 0.42rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--home-official-control-text);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.official-products-showcase__ghost-btn:hover {
  border-color: var(--home-official-control-hover-border);
  background-color: var(--home-official-control-hover-bg);
  color: var(--home-official-control-hover-text);
}

.official-products-showcase__arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.85rem;
  width: 1.85rem;
  border-radius: 9999px;
  color: var(--home-official-control-text);
  background-color: var(--home-official-control-bg);
  border: 1px solid var(--home-official-control-border);
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.official-products-showcase__arrow-btn:hover:not(:disabled) {
  color: var(--home-official-control-hover-text);
  border-color: var(--home-official-control-hover-border);
  background-color: var(--home-official-control-hover-bg);
}

.official-products-showcase__arrow-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.official-products-showcase__carousel {
  scroll-behavior: smooth;
  padding-bottom: 0.25rem;
}

.official-products-showcase__card {
  color: rgb(var(--palette-white) / 0.96);
  transition: transform 160ms ease, opacity 160ms ease;
}

.official-products-showcase__card:hover {
  transform: translateY(-2px);
}

.official-products-showcase__card-media {
  background-color: rgb(var(--palette-white) / 0.96);
}

.official-products-showcase__card-price {
  white-space: nowrap;
  color: rgb(var(--palette-white) / 0.98);
}

.official-products-showcase__card-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: rgb(var(--palette-white) / 0.88);
}

.official-products-showcase__skeleton {
  pointer-events: none;
}

.official-products-showcase__skeleton .official-products-showcase__card-media,
.official-products-showcase__skeleton-line {
  background: rgb(var(--palette-white) / 0.12);
  animation: official-showcase-pulse 1.2s ease-in-out infinite;
}

@keyframes official-showcase-pulse {
  0%,
  100% {
    opacity: 0.42;
  }

  50% {
    opacity: 0.82;
  }
}

.official-card-reveal-enter-active {
  transition: opacity 420ms ease, transform 420ms ease, filter 420ms ease;
}

.official-card-reveal-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  filter: blur(2px);
}

.official-card-reveal-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

@media (min-width: 640px) {
  .official-products-showcase__heading {
    font-size: 1.34rem;
  }

  .official-products-showcase__mark {
    font-size: 1.28rem;
  }
}
</style>
