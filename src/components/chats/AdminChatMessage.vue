<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'
import { useI18n } from 'vue-i18n'

// ===== TYPE GUARDS =====
function isTextMessage(msg: ChatMessageUnion): msg is Extract<ChatMessageUnion, { message_type: 'text_message' }> {
  return msg.message_type === 'text_message'
}

const props = defineProps<{
  message: ChatMessageUnion
  currentUserId: string | null
  otherUserName: string | null
}>()

const { t } = useI18n()

const textMessage = computed(() => isTextMessage(props.message) ? props.message : null)

const isCurrentUserMessage = computed(() => {
  if (!textMessage.value) return false
  return textMessage.value.sender_id === props.currentUserId
})

const senderName = computed(() => {
  if (!textMessage.value) return ''
  if (textMessage.value.is_admin_message) {
    return t('common.admin')
  }
  return isCurrentUserMessage.value ? 'Вы' : (props.otherUserName || 'Пользователь')
})

const messageAlignment = computed(() => {
  if (textMessage.value?.is_admin_message) return 'w-full flex justify-center'
  return isCurrentUserMessage.value ? 'flex justify-end' : 'flex justify-start'
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
  <div v-if="textMessage != null" :class="messageAlignment">
    <!-- Admin message - centered, full width -->
    <div v-if="textMessage.is_admin_message" class="w-full max-w-2xl px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 text-mainText text-sm break-words">
      <div class="flex items-start gap-2">
        <div class="flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-blue-500/20">
          <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 011.5-1.5h3V2a.5.5 0 00-.5-.5h-3A4.5 4.5 0 0010 5.5v6a4.5 4.5 0 004.5 4.5h3a.5.5 0 00.5-.5V15h-3a1.5 1.5 0 01-1.5-1.5z"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-blue-200 font-medium text-xs mb-1">{{ senderName }}</p>
          <p class="text-gray-100">{{ textMessage.text }}</p>
          <p class="mt-2 text-right text-xs text-gray-400">
            {{ formatDate(textMessage.created_at) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Regular messages with sender name -->
    <div v-else class="flex flex-col gap-1" :class="isCurrentUserMessage ? 'items-end' : 'items-start'">
      <p class="text-xs text-gray-400 px-2">{{ senderName }}</p>
      <div class="max-w-[70%] min-w-4 rounded-xl px-4 py-2 text-sm break-words" :class="[
        isCurrentUserMessage
          ? 'bg-blue-600 text-mainText rounded-br-none'
          : 'bg-dark-600 text-mainText rounded-bl-none'
      ]">
        <p>{{ textMessage.text }}</p>
        <p class="mt-1 text-right text-xs text-gray-300">
          {{ formatDate(textMessage.created_at) }}
        </p>
      </div>
    </div>
  </div>
</template>
