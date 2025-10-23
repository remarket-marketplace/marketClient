<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ChatContentUnion, ChatMessage } from '@/validation/chat/chatMessage'
import type { Product } from '@/validation/product/product'
import NewPurchaseMessage from './NewPurchaseMessage.vue';

const props = defineProps<{
  message: ChatContentUnion
  user: any
}>()

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

/**
 * @param message - Объект сообщения или товара.
 */
function isProduct(message: ChatContentUnion): message is Product {
  return (
    'title' in message
    && 'price' in message
    && 'seller' in message
  )
}

// Вычисляемое свойство: является ли сообщение карточкой товара
const isProductMessage = computed(() => {
  return isProduct(props.message)
})

// Вычисляемое свойство: извлекает объект товара, если это товар
const product = computed(() => {
  if (isProduct(props.message)) {
    return props.message
  }
  return null
})

// Вычисляемое свойство: извлекает объект сообщения, если это не товар
const chatMessage = computed<ChatMessage | null>(() => {
  if (!isProduct(props.message)) {
    return props.message as ChatMessage
  }
  return null
})

// Вычисляемый класс для выравнивания сообщения
const messageAlignment = computed(() => {
  if (isProduct(props.message)) {
    // Карточка товара всегда на всю ширину
    return 'w-full self-center'
  }
  // Обычное сообщение: self-end для владельца, self-start для собеседника
  return chatMessage.value?.sender_id === props.user?.id ? 'self-end' : 'self-start'
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
      class="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap break-all" 
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

<style scoped>
</style>