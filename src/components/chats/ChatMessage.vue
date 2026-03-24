<script setup lang="ts">
import { computed } from 'vue'
import NewPurchaseMessage from './NewPurchaseMessage.vue'
import PriceOfferMessage from './PriceOfferMessage.vue'
import type { Product } from '@/validation/product/product'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import TextMessage from './TextMessage.vue'
import DealStatusMessage from './DealStatusMessage.vue'
import ReviewMessage from './ReviewMessage.vue'
import ImageMessage from './ImageMessage.vue'

// ===== TYPE GUARDS =====
function isTextMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'text_message' }> {
  return msg.message_type === 'text_message'
}
function isImageMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'image_message' }> {
  return msg.message_type === 'image_message'
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
function isPriceOfferMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'price_offer_message' }> {
  return msg.message_type === 'price_offer_message'
}

const props = defineProps<{
  message: ChatMessageUnion
  user: any
  showAdminBadge?: boolean
  chatParticipantIds?: string[]
  senderLabels?: Record<string, string>
  senderRoles?: Record<string, 'buyer' | 'seller' | 'admin'>
  forceShowSender?: boolean
  dealStatusOverrides?: Record<string, string>
  reviewedDealIds?: string[]
}>()

const textMessage = computed(() => isTextMessage(props.message) ? props.message : null)
const imageMessage = computed(() => isImageMessage(props.message) ? props.message : null)
const product = computed<Product | null>(() => {
  if (isProductMessage(props.message)) return props.message.product
  if (isDealStatusMessage(props.message)) return props.message.product
  return null
})
const dealId = computed<string | null>(() => {
  if (isProductMessage(props.message)) return props.message.deal_id
  return null
})

const dealStatus = computed<string | null>(() => {
  if (isProductMessage(props.message)) {
    return props.dealStatusOverrides?.[props.message.deal_id] ?? props.message.deal_status
  }
  return null
})

const hasReview = computed<boolean | null>(() => {
  if (isProductMessage(props.message)) {
    return props.message.has_review || props.reviewedDealIds?.includes(props.message.deal_id) || false
  }
  return null
})

const isDealStatus = computed(() => isDealStatusMessage(props.message))

const isDealReviewMessage = computed(() => isReviewMessage(props.message))
const isPriceOffer = computed(() => isPriceOfferMessage(props.message))

const messageAlignment = computed(() => {
  if (isDealStatus.value) return 'w-full self-center'
  if (product.value && !isDealStatus.value) return 'w-full self-center'
  if (isPriceOffer.value) return 'w-full self-center'
  if (imageMessage.value && imageMessage.value.sender_id === props.user?.id) return 'flex justify-end'
  if (imageMessage.value) return 'flex justify-start'
  if (textMessage.value && textMessage.value.sender_id === props.user?.id) return 'flex justify-end'
  return 'flex justify-start'
})

function formatDate(dateInput: string | Date): string {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' 
    ? new Date(dateInput) 
    : dateInput;
  
  return date.toLocaleString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="max-w-full min-w-0" :class="messageAlignment">
    <!-- PRODUCT MESSAGE -->
    <div v-if="product && !isDealStatus && dealId">
      <NewPurchaseMessage :product="product" :deal-id="dealId" :deal-status="dealStatus" :has_review="hasReview" />
    </div>

    <!-- TEXT MESSAGE -->
    <TextMessage
      v-else-if="textMessage"
      :textMessage="textMessage"
      :user="user"
      :formatDate="formatDate"
      :showAdminBadge="showAdminBadge"
      :chat-participant-ids="props.chatParticipantIds"
      :sender-label="props.senderLabels?.[textMessage.sender_id]"
      :sender-role="props.senderRoles?.[textMessage.sender_id]"
      :force-show-sender="props.forceShowSender"
    />

    <ImageMessage
      v-else-if="imageMessage"
      :image-message="imageMessage"
      :user="user"
      :format-date="formatDate"
      :sender-label="props.senderLabels?.[imageMessage.sender_id]"
      :force-show-sender="props.forceShowSender"
    />

    <!-- DEAL STATUS MESSAGE -->
    <DealStatusMessage v-else-if="isDealStatus" :message="(props.message as Extract<ChatMessageUnion, { message_type: 'update_deal_status_message' }>)" :product="product" :formatDate="formatDate" />

    <ReviewMessage v-else-if="isDealReviewMessage" :review="(props.message as Extract<ChatMessageUnion, { message_type: 'review_message' }>).review" :formatDate="formatDate"/>

    <PriceOfferMessage
      v-else-if="isPriceOffer"
      :message="(props.message as Extract<ChatMessageUnion, { message_type: 'price_offer_message' }>)"
      :user="user"
      :format-date="formatDate"
    />
  </div>
</template>
