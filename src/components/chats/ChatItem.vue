<script setup lang="ts">
import type { ChatListItem } from '@/validation/chat/ChatList';
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n';
import { ShoppingBag, Headphones, Image as ImageIcon } from 'lucide-vue-next';
import UserAvatar from '@/components/UserAvatar.vue';
import StyledUsername from '@/components/StyledUsername.vue';

const { t } = useI18n()

const props = defineProps<{
    chat: ChatListItem,
    selectedChatId: string | null,
    showSupportAsUser?: boolean
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
        case "price_offer_message":
            text = t('pages.chats.newPriceOffer')
            break
        case "purchase_message":
            text = t('pages.chats.newPurchase')
            break
        case "text_message":
            // Check if this is an admin message
            const last = props.chat.last_message as any
            const dataKey = last.data?.i18n_key
            if (dataKey) {
                const prefix = t(String(dataKey))
                const reason = last.data?.reason || ''
                text = `${prefix} ${reason}`.trim()
            } else {
                text = props.chat.last_message.text
            }
            if (text.length > 60) {
                text = text.substring(0, 57) + '...'
            }
            break
        case "image_message":
            text = t('pages.chats.imageMessage')
            break
        case "update_deal_status_message":
            text = t(`pages.chats.${props.chat.last_message.new_status}`)
            break
        case "review_message":
            text = t('pages.chats.newReview')
            break
    }
    return text
})

const isSelected = computed(() => props.chat.id === props.selectedChatId)

const isUserOnline = computed(() => {
    if (isSupportChat.value && !props.showSupportAsUser) {
        return true
    }
    return props.chat.another_user.is_active
})

const isSupportChat = computed(() => {
    return props.chat.chat_type === 'support_chat'
})

const isAdminMessage = computed(() => {
    return props.chat.last_message?.message_type === 'text_message' 
        && (props.chat.last_message as any).is_admin_message 
        && !isSupportChat.value
})

// Вычисляемое свойство для отображения имени
const displayName = computed(() => {
    if (isSupportChat.value && !props.showSupportAsUser) {
        return t('pages.chats.support')
    }
    return props.chat.another_user.username
})

const unreadCount = computed(() => props.chat.unread_count ?? 0)

// Вычисляемое свойство для цвета имени
const displayNameColor = computed(() => {
    if (isSupportChat.value && !props.showSupportAsUser) {
        return 'text-blue-500'
    }
    return 'text-mainText'
})

// Вычисляемое свойство для аватара
const displayAvatarUrl = computed(() => {
    if (isSupportChat.value && !props.showSupportAsUser) {
        return null
    }
    return props.chat.another_user.avatar_url
})

const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

const WEEKDAY_SHORT_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeekMonday(date: Date): Date {
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)
    return startOfDay(monday)
}

function formatChatListDateLabel(rawDate: string): string {
    const date = new Date(rawDate)
    if (Number.isNaN(date.getTime())) return ''

    const now = new Date()
    const todayStart = startOfDay(now)
    const messageDayStart = startOfDay(date)
    const diffDays = Math.round((todayStart.getTime() - messageDayStart.getTime()) / 86400000)

    if (diffDays === 0) {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    }
    if (diffDays === 1) return 'Вчера'

    const weekStart = startOfWeekMonday(now)
    if (messageDayStart >= weekStart && messageDayStart <= todayStart) {
        return WEEKDAY_SHORT_RU[date.getDay()] ?? ''
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    }).format(date)
}

const lastMessageDateLabel = computed(() => {
    const createdAt = props.chat.last_message?.created_at
    if (!createdAt) return ''
    return formatChatListDateLabel(createdAt)
})

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
                <!-- Support chat with icon -->
                <div
                    v-if="isSupportChat && !showSupportAsUser"
                    class="h-12 w-12 flex items-center justify-center rounded-full bg-blue-500/20 border-2 border-blue-500/30"
                >
                    <Headphones class="w-6 h-6 text-blue-400" />
                </div>
                <!-- Regular chat avatar (or support chat in admin mode) -->
                <template v-else>
                    <UserAvatar
                        :avatar-url="displayAvatarUrl"
                        :alt="displayName"
                        class="h-12 w-12 border-2 border-dark-600 rounded-full object-cover"
                    />
                </template>
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
                    class="w-full h-full bg-green-500 rounded-full opacity-75"
                ></div>
            </div>
        </div>

        <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 flex-1 items-center gap-2">
                    <!-- Name based on context -->
                    <p
                        v-if="isSupportChat && !showSupportAsUser"
                        :class="['truncate font-semibold text-base', displayNameColor]"
                    >
                        {{ displayName }}
                    </p>
                    <div v-else class="min-w-0 flex-1 truncate">
                        <StyledUsername
                            :username="displayName"
                            :style-id="chat.another_user.nickname_style_id"
                            class="text-base font-semibold"
                        />
                    </div>
                    <span
                        v-if="unreadCount > 0"
                        class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold"
                    >
                        {{ unreadCount > 99 ? '99+' : unreadCount }}
                    </span>
                </div>
                <span 
                    v-if="chat.last_message?.created_at" 
                    class="flex-shrink-0 text-xs text-gray-500 whitespace-nowrap"
                >
                    {{ lastMessageDateLabel }}
                </span>
            </div>

            <div class="flex items-center justify-between gap-2 mt-1">
                <p 
                    class="truncate text-sm flex-1 min-w-0"
                    :class="{
                        'text-blue-500 font-light': chat.last_message?.message_type === 'purchase_message'
                        || chat.last_message?.message_type === 'price_offer_message'
                        || chat.last_message?.message_type === 'image_message'
                        || chat.last_message?.message_type === 'update_deal_status_message'
                        || chat.last_message?.message_type === 'review_message'
                        || isAdminMessage,
                        'text-gray-500': chat.last_message?.message_type === 'text_message' && !isAdminMessage
                    }"
                >
                    <!-- Message type icon -->
                    <component
                        v-if="chat.last_message?.message_type === 'price_offer_message'"
                        :is="ShoppingBag"
                        class="inline-block w-3 h-3 mr-1.5 -mt-0.5"
                    />
                    <component
                        v-if="chat.last_message?.message_type === 'purchase_message'"
                        :is="ShoppingBag"
                        class="inline-block w-3 h-3 mr-1.5 -mt-0.5"
                    />
                    <component
                        v-else-if="chat.last_message?.message_type === 'image_message'"
                        :is="ImageIcon"
                        class="inline-block w-3 h-3 mr-1.5 -mt-0.5"
                    />
                    <component
                        v-else-if="isAdminMessage"
                        :is="Headphones"
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
    color: var(--text-hover-muted);
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

</style>
