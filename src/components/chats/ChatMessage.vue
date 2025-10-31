<script setup lang="ts">
import { computed } from 'vue'
import type { ChatContentUnion, ChatMessage } from '@/validation/chat/chatMessage'
import type { Product } from '@/validation/product/product'
import NewPurchaseMessage from './NewPurchaseMessage.vue';

const props = defineProps<{
  message: ChatContentUnion
  user: any
}>()

function isProduct(message: ChatContentUnion): message is Product {
  return (
    'title' in message
    && 'price' in message
    && 'seller' in message
  )
}

const isProductMessage = computed(() => {
  return isProduct(props.message)
})

const product = computed(() => {
  if (isProduct(props.message)) {
    return props.message
  }
  return null
})

const chatMessage = computed<ChatMessage | null>(() => {
  if (!isProduct(props.message)) {
    return props.message as ChatMessage
  }
  return null
})

const messageAlignment = computed(() => {
  if (isProduct(props.message)) {
    return 'w-full self-center'
  }
  return chatMessage.value?.sender_id === props.user?.id ? 'flex justify-end' : 'flex justify-start'
})

function formatDate(dateStr: string): string {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  return date.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div :class="messageAlignment">
    
    <!-- сообщение о покупке товара -->
    <div v-if="isProductMessage && product">
      <NewPurchaseMessage
      :product="product"
      />
    </div>

    <!-- текстовое сообщение -->
    <div
      v-else-if="chatMessage"
      class="max-w-[70%] rounded-xl px-4 py-2 text-sm break-normal break-all" 
      :class="[
        chatMessage.sender_id === user?.id
          ? 'bg-blue-600 text-mainText rounded-br-none self-end' // Стили для моего сообщения (синий, справа)
          : 'bg-dark-600 text-mainText rounded-bl-none self-start' // Стили для сообщения собеседника (серый, слева)
      ]"
    >
      <p>{{ chatMessage.text }}</p>

      <p class="mt-1 text-right text-xs text-gray-300">
        {{ formatDate(chatMessage.created_at) }}
      </p>
    </div>
  </div>
</template>