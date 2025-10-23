<script setup lang="ts">
import type { ChatListItem } from '@/validation/chat/ChatList';
import {defineProps } from 'vue'

const API_HOST = import.meta.env.VITE_API_HOST

const props = defineProps<{
    chat: ChatListItem,
}>()
</script>

<template>
    <div
    :key="chat.id"
    class="flex cursor-pointer items-center gap-3 py-3 px-4 transition hover:bg-dark-800/50"
    @click="$emit('loadChatMessages', chat.id)"
    >
    <div class="h-12 w-12 flex items-center justify-center">
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
        {{ chat.another_user.username.charAt(0) }}
        </div>
    </div>
    <div class="flex flex-col truncate">
        <p class="truncate text-mainText font-semibold">
        {{ chat.another_user.username }}
        </p>
        <p class="text-sm text-gray-500">last message...</p>
    </div>
    </div>
</template>