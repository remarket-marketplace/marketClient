<script setup lang="ts">
import { computed } from 'vue'
import NewPurchaseMessage from './NewPurchaseMessage.vue'
import type { Product } from '@/validation/product/product'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { useI18n } from 'vue-i18n'
import TextMessage from './TextMessage.vue'
import DealStatusMessage from './DealStatusMessage.vue'
import ReviewMessage from './ReviewMessage.vue'

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
function isReviewMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'review_message' }> {
  return msg.message_type === 'review_message'
}

const props = defineProps<{
  message: ChatMessageUnion
  user: any
}>()

const { t } = useI18n()

const textMessage = computed(() => isTextMessage(props.message) ? props.message : null)
const product = computed<Product | null>(() => {
  if (isProductMessage(props.message)) return props.message.product
  if (isDealStatusMessage(props.message)) return props.message.product
  return null
})
const dealId = computed<string | null>(() => {
  if (isProductMessage(props.message)) return props.message.deal_id
  return null
})

const hasReview = computed<boolean | null>(() => {
  if (isProductMessage(props.message)) return props.message.has_review
  return null
})

const isDealStatus = computed(() => isDealStatusMessage(props.message))

const isDealReviewMessage = computed(() => isReviewMessage(props.message))

const messageAlignment = computed(() => {
  if (isDealStatus.value) return 'w-full self-center'
  if (product.value && !isDealStatus.value) return 'w-full self-center'
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
    <div v-if="product && !isDealStatus && dealId">
      <NewPurchaseMessage :product="product" :deal-id="dealId" :deal-status="dealStatus" :has_review="hasReview" />
    </div>

    <!-- TEXT MESSAGE -->
    <TextMessage v-else-if="textMessage" :textMessage="textMessage" :user="user" :formatDate="formatDate" />

    <!-- DEAL STATUS MESSAGE -->
    <DealStatusMessage v-else-if="isDealStatus" :message="(props.message as Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>)" :product="product" :formatDate="formatDate" />

    <ReviewMessage v-else-if="isDealReviewMessage" :review="(props.message as Extract<ChatMessageUnion, { message_type: 'review_message' }>).review" :formatDate="formatDate"/>
  </div>
</template>
