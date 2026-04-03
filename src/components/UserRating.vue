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
</script>

<template>
  <div
    :class="props.variant === 'detail'
      ? 'inline-flex min-w-0 items-center gap-2.5 text-sm leading-none text-stone-200/88'
      : 'inline-flex h-7 w-max items-center gap-1 rounded-full border border-white/8 bg-white/[0.035] pl-1.75 pr-1.75 text-[11px] font-medium leading-none text-stone-100/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'"
    :title="`Rating: ${formattedRating}`"
  >
    <span
      :class="props.variant === 'detail'
        ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-200/12 bg-amber-200/[0.06]'
        : 'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full'"
    >
      <Star
        :class="props.variant === 'detail'
          ? 'h-3.5 w-3.5 text-amber-200/82'
          : 'h-3 w-3 text-white'"
        class="fill-current"
      />
    </span>

    <span class="whitespace-nowrap font-semibold leading-none tabular-nums text-white">
      {{ formattedRating }}
    </span>

    <template v-if="props.variant === 'detail'">
      <span class="whitespace-nowrap text-stone-400/82">/ 5</span>
      <span
        v-if="formattedReviewCount !== null"
        class="hidden h-1 w-1 rounded-full bg-white/18 sm:inline-block"
      />
      <span
        v-if="formattedReviewCount !== null"
        class="whitespace-nowrap text-stone-400/82"
      >
        {{ formattedReviewCount }} {{ props.reviewLabel }}
      </span>
    </template>
  </div>
</template>
