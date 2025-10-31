<script setup lang="ts">
import type { ChatListItem } from '@/validation/chat/ChatList';
import { computed } from 'vue'
import { defineProps } from 'vue'

const API_HOST = import.meta.env.VITE_API_HOST

const props = defineProps<{
    chat: ChatListItem,
}>()

const formattedLastMessage = computed(() => {
    if (!props.chat.last_message?.text) {
        return 'Нет сообщений'
    }
    
    const text = props.chat.last_message.text
    if (text.length > 60) {
        return text.substring(0, 57) + '...'
    }
    return text
})

const userInitial = computed(() => {
    return props.chat.another_user.username.charAt(0).toUpperCase()
})
</script>

<template>
    <div
        :key="chat.id"
        class="flex cursor-pointer items-center gap-3 py-3 px-4 transition hover:bg-dark-800/50 group"
        @click="$emit('loadChatMessages', chat.id)"
    >
        <!-- Аватар -->
        <div class="flex-shrink-0 h-12 w-12 flex items-center justify-center">
            <img
                v-if="chat.another_user.avatar_url"
                :src="`${API_HOST}${chat.another_user.avatar_url}`"
                class="h-12 w-12 border-2 border-dark-600 rounded-full object-cover"
                :alt="chat.another_user.username"
            >
            <div
                v-else
                class="h-12 w-12 flex items-center justify-center rounded-full bg-gray-700 text-lg text-mainText font-bold uppercase"
            >
                {{ userInitial }}
            </div>
        </div>

        <!-- Информация о чате -->
        <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
                <p class="truncate text-mainText font-semibold text-base">
                    {{ chat.another_user.username }}
                </p>
                <span 
                    v-if="chat.last_message?.created_at" 
                    class="flex-shrink-0 text-xs text-gray-500 whitespace-nowrap"
                >
                    {{new Date(chat.last_message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}}
                </span>
            </div>

            <div class="flex items-center justify-between gap-2 mt-1">
                <p 
                class="truncate text-sm flex-1 min-w-0"
                :class="{
                    'text-blue-500 font-light': chat.last_message.message_type === 'purchase_info',
                    'text-gray-500': chat.last_message.message_type !== 'purchase_info'
                }"
                >
                    {{ chat.last_message.message_type === 'purchase_info' ? $t('pages.chats.newPurchase') : formattedLastMessage }}
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.group:hover .text-gray-500 {
    color: #d1d5db;
}

.min-w-0 {
    min-width: 0;
}

.badge-enter-active {
    transition: all 0.3s ease;
}
</style>