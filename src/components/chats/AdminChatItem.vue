<script setup lang="ts">
import type { ChatListItem } from '@/validation/chat/ChatList';
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n';
import { ShoppingBag, Headphones } from 'lucide-vue-next';

const API_HOST = import.meta.env.VITE_API_HOST
const { t } = useI18n()

const props = defineProps<{
    chat: ChatListItem,
    selectedChatId: string | null
}>()

const emit = defineEmits<{
    loadChatMessages: [chatId: string]
}>()

const isMobile = ref(false)

const formattedLastMessage = computed((): string | null => {
    if (!props.chat.last_message) {
        return null
    }

    let text = null;
    switch (props.chat.last_message.message_type) {
        case "purchase_message":
            text = t('pages.chats.newPurchase')
            break
        case "text_message":
            text = props.chat.last_message.text
            if (text.length > 60) {
                text = text.substring(0, 57) + '...'
            }
            break
        case "update_deal_status_message":
            text = t('pages.chats.updateDealStatus')
            break
        case "review_message":
            text = t('pages.chats.newReview')
            break
    }
    return text
})

const isSelected = computed(() => props.chat.id === props.selectedChatId)
const userInitial = computed(() => {
    return props.chat.another_user.username.charAt(0).toUpperCase()
})

const isUserOnline = computed(() => {
    if (isSupportChat) {
        return true
    }
    return props.chat.another_user.is_active
})

const isSupportChat = computed(() => {
    return props.chat.chat_type === 'support_chat'
})

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
})
</script>

<template>
    <div
        :key="chat.id"
        :class="['flex cursor-pointer items-center gap-3 py-3 px-4 transition hover:bg-dark-800/50 group', !isMobile && isSelected ? 'bg-dark-800/50' : '']"
        @click="$emit('loadChatMessages', chat.id)"
    >
        <div class="flex-shrink-0 relative">
            <div class="h-12 w-12 flex items-center justify-center">
                <!-- Regular chat avatar -->
                <img
                    v-if="!isSupportChat && chat.another_user.avatar_url"
                    :src="`${API_HOST}${chat.another_user.avatar_url}`"
                    class="h-12 w-12 border-2 border-dark-600 rounded-full object-cover"
                    :alt="chat.another_user.username"
                >
                <!-- Initials for regular chat -->
                <div
                    v-else-if="!isSupportChat"
                    class="h-12 w-12 flex items-center justify-center rounded-full bg-gray-700 text-lg text-mainText font-bold uppercase"
                >
                    {{ userInitial }}
                </div>
                <!-- Support icon -->
                <div
                    v-else
                    class="h-12 w-12 flex items-center justify-center rounded-full bg-blue-500/20 border-2 border-blue-500/30"
                >
                    <Headphones class="w-6 h-6 text-blue-400" />
                </div>
            </div>
            
            <!-- Online status indicator -->
            <div
                class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                :class="{
                    'bg-green-500 border-1 border-dark-800': isUserOnline,
                    'bg-gray-500 border-1 border-dark-800': !isUserOnline,
                    'border-dark-800': !isSelected || isMobile
                }"
            >
                <div 
                    v-if="isUserOnline"
                    class="w-full h-full bg-green-500 rounded-full animate-ping opacity-75"
                ></div>
            </div>
        </div>

        <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 truncate">
                    <!-- Show "Support" for support chats -->
                    <p 
                        v-if="isSupportChat"
                        class="truncate font-semibold text-base text-blue-500"
                    >
                        {{ t('pages.chats.support') }}
                    </p>
                    <!-- Show username for regular chats -->
                    <p 
                        v-else
                        class="truncate text-mainText font-semibold text-base"
                    >
                        {{ chat.another_user.username }}
                    </p>
                </div>
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
                        'text-blue-500 font-light': chat.last_message?.message_type === 'purchase_message'
                        || chat.last_message?.message_type === 'update_deal_status_message'
                        || chat.last_message?.message_type === 'review_message',
                        'text-gray-500': chat.last_message?.message_type === 'text_message'
                    }"
                >
                    <!-- Message type icon -->
                    <component
                        v-if="chat.last_message?.message_type === 'purchase_message'"
                        :is="ShoppingBag"
                        class="inline-block w-3 h-3 mr-1.5 -mt-0.5"
                    />
                    {{ formattedLastMessage || t('pages.chats.noMessages') }}
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

@keyframes ping {
    0% {
        transform: scale(1);
        opacity: 0.75;
    }
    75%, 100% {
        transform: scale(2);
        opacity: 0;
    }
}

.animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>