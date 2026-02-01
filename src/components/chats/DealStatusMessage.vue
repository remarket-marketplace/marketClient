<script setup lang="ts">
import type { ChatMessageUnion } from '@/validation/chat/chatMessage';
import type { Product } from '@/validation/product/product';
import { useI18n } from 'vue-i18n';
import DealStatusTag from '../DealStatusTag.vue';
import { useRouter } from 'vue-router';

defineProps<{
    product: Product | null,
    message: Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>,
    formatDate: (dateStr: string) => string;
}>()

const API_HOST = import.meta.env.VITE_API_HOST
const { t } = useI18n()
const router = useRouter()

function handleViewProduct(productId: string) {
  router.push(`/product/${productId}`)
}
</script>

<template>
    <div class="w-full p-4 rounded-xl flex flex-col gap-3 bg-gray-800/20">
        <!-- Deal status -->
        <div>
            <DealStatusTag :deal-status="message.new_status" />
        </div>

        <!-- Product -->
        <div @click="handleViewProduct(product!.id)" class="flex items-center gap-3 p-2 cursor-pointer bg-gray-800/50 rounded-md">
            <img v-if="product?.images[0]?.image_url" :src="`${API_HOST}${product.images[0].image_url}`" alt="product"
                class="w-12 h-12 object-cover rounded" />

            <div class="flex flex-col">
                <p class="font-medium text-sm text-white truncate">{{ product?.title }}</p>
                <p class="text-xs text-gray-300">{{ product?.price }} ₽</p>
            </div>
        </div>

        <!-- deal status desciption -->
        <div class="pl-3 border-l border-gray-700/60">
            <p class="text-sm leading-relaxed text-gray-300">
                {{ t(`pages.chats.${message.new_status}`) }}
            </p>
        </div>

        <p class="text-xs text-gray-400 text-right mt-1">
            {{ formatDate(message.created_at) }}
        </p>
    </div>
</template>
