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
    <div class="w-full min-w-0 overflow-hidden rounded-xl bg-gray-800/20 p-4">
        <!-- Deal status -->
        <div class="min-w-0">
            <DealStatusTag :deal-status="message.new_status" />
        </div>

        <!-- Product -->
        <div
          @click="handleViewProduct(product)"
          class="mt-3 flex w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-md bg-gray-800/50 p-2"
        >
            <img v-if="product?.images[0]?.image_url" :src="`${API_HOST}${product.images[0].image_url}`" alt="product"
                class="h-12 w-12 flex-shrink-0 rounded object-cover" />

            <div class="flex min-w-0 flex-1 flex-col">
                <p class="font-medium text-sm text-white truncate">{{ product?.title }}</p>
                <p class="text-xs text-gray-300">{{ product ? formatCurrencyAmount(product.price) : '-' }}</p>
            </div>
        </div>

        <!-- deal status desciption -->
        <div class="mt-3 border-l border-gray-700/60 pl-3">
            <p class="text-sm leading-relaxed text-gray-300 break-words [overflow-wrap:anywhere]">
                {{ t(`pages.chats.${message.new_status}`) }}
            </p>
        </div>

        <p class="mt-3 text-right text-xs text-gray-400">
            {{ formatDate(message.created_at) }}
        </p>
    </div>
</template>
