<script setup lang="ts">
import { computed } from 'vue'
import NewPurchaseMessage from './NewPurchaseMessage.vue'
import type { Product } from '@/validation/product/product'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'

const props = defineProps<{
  message: ChatMessageUnion
  user: any
}>()

const content = computed(() => props.message ?? null)

// message_type
const type = computed(() => content.value?.message_type ?? null)


const isTextMessage = computed(() => type.value === 'text_message')
const isProductMessage = computed(() => type.value === 'purchase_message')
const isDealStatusMessage = computed(() => type.value === 'update_deal_status_message')

const textMessage = computed(() => {
  return isTextMessage.value ? content.value : null
})

const product = computed<Product | null>(() => {
  return isProductMessage.value ? content.value.product : null
})


const messageAlignment = computed(() => {
  if (isProductMessage.value) return 'w-full self-center'

  if (textMessage.value?.sender_id === props.user?.id)
    return 'flex justify-end'

  return 'flex justify-start'
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div :class="messageAlignment">

    <!-- PRODUCT MESSAGE -->
    <div v-if="isProductMessage && product">
      <NewPurchaseMessage :product="product" />
    </div>

    <!-- TEXT MESSAGE -->
    <div
      v-else-if="textMessage"
      class="max-w-[70%] rounded-xl px-4 py-2 text-sm break-normal break-all"
      :class="[
        textMessage.sender_id === user?.id
          ? 'bg-blue-600 text-mainText rounded-br-none self-end'
          : 'bg-dark-600 text-mainText rounded-bl-none self-start'
      ]"
    >
      <p>{{ textMessage.text }}</p>

      <p class="mt-1 text-right text-xs text-gray-300">
        {{ formatDate(textMessage.created_at) }}
      </p>
    </div>

    <!-- DEAL STATUS MESSAGE -->
    <div
      v-else-if="isDealStatusMessage"
      class="text-center w-full text-gray-400 text-sm my-2"
    >
      {{ $t('pages.chats.newDealStatus') }} {{ $t(`common.dealStatuses.${content?.new_status}`) }}
    </div>
  </div>
</template>
