<script setup lang="ts">
import type { ReviewSchema } from '@/validation/review/review';

defineProps<{
  review: ReviewSchema,
  formatDate: (dateStr: string) => string;
}>()
</script>

<template>
  <div class="w-full min-w-0 rounded-xl bg-gray-800/20 p-4">

    <p class="text-2xl break-words [overflow-wrap:anywhere]">{{ $t('pages.chats.buyerLeftReview') }}</p>

    <!-- Rating -->
    <div class="mt-3 flex items-center gap-1">
      <template v-for="n in 5" :key="n">
        <span
          class="text-blue-600 text-lg"
          :class="{ 'opacity-30': n > review.rating }"
        >
          ★
        </span>
      </template>
    </div>

    <!-- Review content -->
    <div class="mt-3 rounded-md border border-gray-700/60 bg-gray-800/50 p-3">
      <p v-if="review.body" class="text-sm leading-relaxed text-gray-200 whitespace-pre-line break-words [overflow-wrap:anywhere]">
        {{ review.body }}
      </p>
      <p v-else class="text-sm leading-relaxed text-gray-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
        {{ $t('pages.chats.withoutReviewText') }}
      </p>
    </div>

    <!-- date -->
    <p class="mt-3 text-right text-xs text-gray-400">
      {{ formatDate(review.created_at) }}
    </p>
  </div>
</template>
