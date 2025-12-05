<script setup lang="ts">
import type { ReviewSchema } from '@/validation/review/review';

defineProps<{
  review: ReviewSchema,
  formatDate: (dateStr: string) => string;
}>()
</script>

<template>
  <div class="w-full p-4 rounded-xl flex flex-col gap-3 bg-gray-800/20">

    <p class="text-2xl">{{ $t('pages.chats.buyerLeftReview') }}</p>

    <!-- Rating -->
    <div class="flex items-center gap-1">
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
    <div class="p-3 rounded-md bg-gray-800/50 border border-gray-700/60">
      <p v-if="review.body" class="text-sm leading-relaxed text-gray-200 whitespace-pre-line">
        {{ review.body }}
      </p>
      <p v-else class="text-sm leading-relaxed text-gray-400 whitespace-pre-line">
        {{ $t('pages.chats.withoutReviewText') }}
      </p>
    </div>

    <!-- date -->
    <p class="text-xs text-gray-400 text-right">
      {{ formatDate(review.created_at) }}
    </p>
  </div>
</template>
