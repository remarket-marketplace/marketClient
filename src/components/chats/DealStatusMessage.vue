<script setup lang="ts">
import type { ChatMessageUnion } from '@/validation/chat/chatMessage';
import type { Product } from '@/validation/product/product';
import { useI18n } from 'vue-i18n';
import DealStatusTag from '../DealStatusTag.vue';
import { useRouter } from 'vue-router';
import { formatCurrencyAmount } from '@/utils/currency';
import { buildProductKey } from '@/utils/urlKeys';

defineProps<{
    product: Product | null,
    message: Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>,
    formatDate: (dateStr: string) => string;
}>()

const API_HOST = import.meta.env.VITE_API_HOST
const { t } = useI18n()
const router = useRouter()

function handleViewProduct(product: Product | null) {
  const productKey = buildProductKey(product)
  if (!productKey) return
  router.push(`/product/${productKey}`)
}
</script>

<template>
    <div class="mx-auto w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/50 px-4 py-3">
        <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300/90">
                        {{ $t('pages.chats.updateDealStatus') }}
                    </span>
                    <DealStatusTag :deal-status="message.new_status" />
                </div>

                <button
                  type="button"
                  class="mt-2 flex min-w-0 items-center gap-3 text-left"
                  @click="handleViewProduct(product)"
                >
                    <img
                      v-if="product?.images[0]?.image_url"
                      :src="`${API_HOST}${product.images[0].image_url}`"
                      alt="product"
                      class="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                    />

                    <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-white">{{ product?.title }}</span>
                        <span class="block text-xs text-gray-400">
                            {{ t(`pages.chats.${message.new_status}`) }}
                        </span>
                    </span>
                </button>
            </div>

            <div class="flex-shrink-0 text-right">
                <p class="text-sm font-medium text-gray-200">{{ product ? formatCurrencyAmount(product.price) : '-' }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ formatDate(message.created_at) }}</p>
            </div>
        </div>
    </div>
</template>
