<script setup lang="ts">
import { computed } from 'vue'
import NewPurchaseMessage from './NewPurchaseMessage.vue'
import type { Product } from '@/validation/product/product'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { useI18n } from 'vue-i18n'

// ===== TYPE GUARDS =====
function isTextMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'text_message' }> {
  return msg.message_type === 'text_message'
}
function isProductMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'purchase_message' }> {
  return msg.message_type === 'purchase_message'
}
function isDealStatusMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }> {
  return msg.message_type === 'update_deal_status_message'
}

const props = defineProps<{
  message: ChatMessageUnion
  user: any
}>()

const { t } = useI18n()

const textMessage = computed(() => isTextMessage(props.message) ? props.message : null)
const product = computed<Product | null>(() => isProductMessage(props.message) ? props.message.product : null)
const isDealStatus = computed(() => isDealStatusMessage(props.message))

const messageAlignment = computed(() => {
  if (product.value) return 'w-full self-center'
  if (textMessage.value && textMessage.value.sender_id === props.user?.id) return 'flex justify-end'
  return 'flex justify-start'
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div :class="messageAlignment">
    <!-- PRODUCT MESSAGE -->
    <div v-if="product">
      <NewPurchaseMessage :product="product" />
    </div>

    <!-- TEXT MESSAGE -->
    <div v-else-if="textMessage"
         class="max-w-[70%] rounded-xl px-4 py-2 text-sm break-normal break-all"
         :class="[
           textMessage.sender_id === user?.id
             ? 'bg-blue-600 text-mainText rounded-br-none self-end'
             : 'bg-dark-600 text-mainText rounded-bl-none self-start'
         ]">
      <p>{{ textMessage.text }}</p>
      <p class="mt-1 text-right text-xs text-gray-300">
        {{ formatDate(textMessage.created_at) }}
      </p>
    </div>

    <!-- DEAL STATUS MESSAGE -->
    <div v-else-if="isDealStatus" class="text-center w-full text-gray-400 text-sm my-2">
      {{ t('pages.chats.newDealStatus') }}
      {{ t(`common.dealStatuses.${(props.message as Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>).new_status}`) }}
    </div>
  </div>
</template>
