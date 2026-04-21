<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'

type UserRatingVariant = 'compact' | 'detail'

const props = withDefaults(defineProps<{
  rating: number
  reviewCount?: number
  reviewLabel?: string
  variant?: UserRatingVariant
}>(), {
  reviewCount: undefined,
  reviewLabel: 'reviews',
  variant: 'compact',
})

const formattedRating = computed(() => props.rating.toFixed(1))
const formattedReviewCount = computed(() => {
  if (typeof props.reviewCount !== 'number') return null
  return props.reviewCount.toLocaleString('ru-RU')
})

const ratingTone = computed(() => {
  if (props.rating >= 4.7) {
    return 'var(--rating-tone-excellent-star)'
  }

  if (props.rating >= 4) {
    return 'var(--rating-tone-good-star)'
  }

  if (props.rating >= 3) {
    return 'var(--rating-tone-fair-star)'
  }

  return 'var(--rating-tone-low-star)'
})
</script>

<template>
  <div
    :class="props.variant === 'detail'
      ? 'inline-flex min-w-0 items-center gap-2.5 text-sm leading-none'
      : 'inline-flex h-7 w-max items-center gap-1 text-xs'"
    :title="`Rating: ${formattedRating}`"
  >
    <span
      :class="props.variant === 'detail'
        ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--palette-white)/0.1)]'
        : 'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full'"
      :style="{ color: ratingTone }"
    >
      <Star
        :class="props.variant === 'detail'
          ? 'h-3.5 w-3.5'
          : 'h-3 w-3'"
        class="fill-current"
      />
    </span>

    <span class="whitespace-nowrap font-semibold leading-none tabular-nums text-[var(--text-title)]">
      {{ formattedRating }}
    </span>

    <template v-if="props.variant === 'detail'">
      <span class="whitespace-nowrap text-[var(--text-tertiary)]">/ 5</span>
      <span
        v-if="formattedReviewCount !== null"
        class="hidden h-1 w-1 rounded-full bg-[rgb(var(--palette-white)/0.18)] sm:inline-block"
      />
      <span
        v-if="formattedReviewCount !== null"
        class="whitespace-nowrap text-[var(--text-tertiary)]"
      >
        {{ formattedReviewCount }} {{ props.reviewLabel }}
      </span>
    </template>
  </div>
</template>
