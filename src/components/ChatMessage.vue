<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ChatContentUnion, ChatMessage } from '@/validation/chat/chatMessage'
import type { Product } from '@/validation/product/product'

const props = defineProps<{
  message: ChatContentUnion
  user: any // Предполагается, что user имеет свойство id (user?.id)
}>()

const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

/**
 * Защитник типа для проверки, является ли сообщение товаром.
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


/**
 * Форматирует строку даты в формат времени (HH:MM).
 * @param dateStr - Строка даты.
 */
function formatDate(dateStr: string): string {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  // Используем 'ru-RU' для русскоязычного формата
  return date.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleViewProduct(productId: string) {
  router.push(`/product/${productId}`)
}

function handleReport() {
  // Логика жалобы
}

function handleConfirmDeal() {
  // Логика подтверждения сделки
}
</script>

<template>
  <div :class="messageAlignment">
    <div v-if="isProductMessage && product" class="my-2 max-w-full">
      <div
        class="overflow-hidden border border-gray-700 rounded-xl bg-gray-800 shadow-lg"
      >
        <div class="bg-gray-700/50 p-4">
          <p class="text-white font-semibold">
            {{ $t('chats.newPurchase') }}
          </p>
        </div>

        <div class="flex flex-col gap-4 p-4 sm:flex-row">
          <div class="flex-shrink-0 sm:w-1/3">
            <img
              :src="`${API_HOST}${product.images?.[0]?.image_url}`"
              :alt="product.title"
              class="h-32 w-full rounded-lg object-cover sm:h-full"
              loading="lazy"
              @click="handleViewProduct(product.id)"
            >
          </div>

          <div class="flex-1 text-white space-y-1">
            <h3
              class="cursor-pointer truncate text-lg font-bold"
              @click="handleViewProduct(product.id)"
            >
              {{ product.title }}
            </h3>
            <p class="text-xl text-green-400 font-extrabold">
              {{ product.price }}₽
            </p>
            <div class="my-4">
              <p class="text-base font-bold">
                Данные товара
              </p>
              <p class="my-2 text-gray-400">
                {{ product.product_data_string }}
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-700 p-4 space-y-3">
          <div class="flex gap-2 text-sm">
            <button
              v-if="!product.is_owner"
              class="flex-1 rounded-lg bg-green-600 px-3 py-2 text-white font-semibold transition hover:bg-green-700"
              @click="handleConfirmDeal"
            >
              {{ $t('chats.confirmReceipt') }}
            </button>

            <button
              class="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-white font-semibold transition hover:bg-blue-700"
              @click="handleViewProduct(product.id)"
            >
              {{ $t('chats.viewProduct') }}
            </button>

            <button
              v-if="!product.is_owner"
              class="rounded-lg bg-red-600 px-3 py-2 text-white font-semibold transition hover:bg-red-700"
              @click="handleReport"
            >
              {{ $t('chats.report') }}
            </button>
          </div>
        </div>
      </div>
    </div>


    <div
      v-else-if="chatMessage"
      class="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap break-words" 
      :class="[
        chatMessage.sender_id === user?.id
          ? 'bg-blue-600 text-white rounded-br-none self-end' // Стили для моего сообщения (синий, справа)
          : 'bg-gray-700 text-white rounded-bl-none self-start' // Стили для сообщения собеседника (серый, слева)
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