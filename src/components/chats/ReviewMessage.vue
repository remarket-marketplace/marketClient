<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { buildProductKey } from '@/utils/urlKeys'
import { formatCurrencyAmount } from '@/utils/currency'
import { formatChatTime } from '@/utils/chatDate'

const API_HOST = import.meta.env.VITE_API_HOST

const props = defineProps<{
  message: Extract<ChatMessageUnion, { message_type: 'review_message' }>
  formatDate: (dateStr: string) => string
}>()

const router = useRouter()
const { locale } = useI18n()

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
const timelineTimestamp = computed(() => formatChatTime(props.message.created_at, locale.value) || null)

function handleViewProduct() {
  const productKey = buildProductKey(props.message.product)
  if (!productKey) return
  router.push(`/product/${productKey}`)
}
</script>

<template>
  <div class="my-2 flex w-full justify-center">
    <div class="message-compose-shell mx-auto flex w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-[26px] border border-[rgb(var(--palette-white)/0.1)] bg-background/85 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--palette-white)/0.08)] pb-2.5">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-link-rgb)/0.9)]">
            {{ $t('pages.chats.newReview') }}
          </p>
          <p class="mt-1 text-sm font-medium text-[var(--text-title)] break-words [overflow-wrap:anywhere]">
            {{ $t('pages.chats.buyerLeftReview') }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <button
            type="button"
            class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700))]"
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
                  class="mt-1 block min-w-0 text-left text-sm font-semibold text-[var(--text-title)] transition hover:text-[var(--text-accent)]"
                  @click="handleViewProduct"
                >
                  <span class="line-clamp-2">{{ message.product.title }}</span>
                </button>
              </div>

              <p class="text-sm font-semibold text-[var(--text-success)]">
                {{ formatCurrencyAmount(message.product.price) }}
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-[rgb(var(--palette-white)/0.08)]"></div>

        <div>
        <div class="flex items-center gap-1">
          <span
            v-for="(isActive, index) in reviewStars"
            :key="index"
            class="text-base"
            :class="isActive ? 'text-[var(--text-link)]' : 'text-[rgb(var(--text-title-rgb)/0.15)]'"
          >
            ★
          </span>
        </div>

        <p
          class="mt-2 text-sm leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"
          :class="message.review.body ? 'text-[var(--text-body-strong)]' : 'text-[var(--text-muted)]'"
        >
          {{ message.review.body || $t('pages.chats.withoutReviewText') }}
        </p>

        <div v-if="timelineTimestamp" class="mt-3 flex items-center justify-end text-xs text-[var(--text-body)]">
          <span>{{ timelineTimestamp }}</span>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>
