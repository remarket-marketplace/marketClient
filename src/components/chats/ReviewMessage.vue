<script setup lang="ts">
import type { ReviewSchema } from '@/validation/review/review';

defineProps<{
  review: ReviewSchema,
  formatDate: (dateStr: string) => string;
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-xl min-w-0 rounded-2xl border border-dark-700 bg-dark-800/50 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300/90">
          {{ $t('pages.chats.newReview') }}
        </p>
        <p class="mt-1 text-sm font-medium text-white break-words [overflow-wrap:anywhere]">
          {{ $t('pages.chats.buyerLeftReview') }}
        </p>
      </div>

      <p class="flex-shrink-0 text-xs text-gray-400">
        {{ formatDate(review.created_at) }}
      </p>
    </div>

    <div class="mt-3 flex items-center gap-1">
      <template v-for="n in 5" :key="n">
        <span
          class="text-blue-600 text-base"
          :class="{ 'opacity-30': n > review.rating }"
        >
          ★
        </span>
      </template>
    </div>

    <p
      class="mt-3 text-sm leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"
      :class="review.body ? 'text-gray-200' : 'text-gray-400'"
    >
      {{ review.body || $t('pages.chats.withoutReviewText') }}
    </p>
  </div>
</template>
