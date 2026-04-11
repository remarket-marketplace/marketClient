<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { buildProductKey } from '@/utils/urlKeys'
import { formatCurrencyAmount } from '@/utils/currency'

const API_HOST = import.meta.env.VITE_API_HOST

const props = defineProps<{
  message: Extract<ChatMessageUnion, { message_type: 'review_message' }>
  formatDate: (dateStr: string) => string
}>()

const router = useRouter()

const productPreviewImageUrl = computed(() => {
  const rawImageUrl = props.message.product.images?.[0]?.image_url
  if (!rawImageUrl) return null

  if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
    return rawImageUrl
  }

  if (!API_HOST) return rawImageUrl
  return `${API_HOST}${rawImageUrl}`
})

const reviewStars = computed(() => Array.from({ length: 5 }, (_, index) => index < props.message.review.rating))
const timelineTimestamp = computed(() => {
  const parsed = new Date(props.message.created_at)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

function handleViewProduct() {
  const productKey = buildProductKey(props.message.product)
  if (!productKey) return
  router.push(`/product/${productKey}`)
}
</script>

<template>
  <div class="my-2 flex w-full justify-center">
    <div class="message-compose-shell mx-auto flex w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-background/85 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300/90">
            {{ $t('pages.chats.newReview') }}
          </p>
          <p class="mt-1 text-sm font-medium text-white break-words [overflow-wrap:anywhere]">
            {{ $t('pages.chats.buyerLeftReview') }}
          </p>
        </div>
        <div class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          <span>{{ formatCurrencyAmount(message.product.price) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <button
            type="button"
            class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-dark-600 bg-dark-700"
            @click="handleViewProduct"
          >
            <img
              v-if="productPreviewImageUrl"
              :src="productPreviewImageUrl"
              :alt="message.product.title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
          </button>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div class="min-w-0 flex-1">
                <button
                  type="button"
                  class="mt-1 block min-w-0 text-left text-sm font-semibold text-white transition hover:text-blue-200"
                  @click="handleViewProduct"
                >
                  <span class="line-clamp-2">{{ message.product.title }}</span>
                </button>
              </div>

              <p class="text-sm font-semibold text-emerald-300">
                {{ formatCurrencyAmount(message.product.price) }}
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-white/8"></div>

        <div>
        <div class="flex items-center gap-1">
          <span
            v-for="(isActive, index) in reviewStars"
            :key="index"
            class="text-base"
            :class="isActive ? 'text-blue-500' : 'text-white/15'"
          >
            ★
          </span>
        </div>

        <p
          class="mt-2 text-sm leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"
          :class="message.review.body ? 'text-gray-200' : 'text-gray-400'"
        >
          {{ message.review.body || $t('pages.chats.withoutReviewText') }}
        </p>

        <div v-if="timelineTimestamp" class="mt-3 flex items-center justify-end text-xs text-gray-300">
          <span>{{ timelineTimestamp }}</span>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>
