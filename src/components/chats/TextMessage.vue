<script setup lang="ts">
import { computed } from 'vue'
import { Check, CheckCheck } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
interface TextMessageProps {
  id: string;
  chat_room_id: string;
  created_at: string;
  message_type: "text_message";
  sender_id: string;
  text: string;
  is_read: boolean;
  is_admin_message?: boolean;
  data?: Record<string, any> | null;
}

const props = defineProps<{
  textMessage: TextMessageProps | null;
  user: any;
  formatDate: (dateStr: string) => string;
  showAdminBadge?: boolean;
  chatParticipantIds?: string[];
  senderLabel?: string;
  senderRole?: 'buyer' | 'seller' | 'admin';
  forceShowSender?: boolean;
}>()

const { t } = useI18n()

const adminContent = computed(() => {
  if (!props.textMessage) return ''
  if (props.textMessage.data?.i18n_key) {
    const prefix = t(String(props.textMessage.data.i18n_key))
    return prefix
  }
  return props.textMessage.text
})

const regularContent = computed(() => {
  if (!props.textMessage) return ''
  if (props.textMessage.data?.i18n_key) {
    const prefix = t(String(props.textMessage.data.i18n_key))
    return prefix
  }
  return props.textMessage.text
})

const reasonText = computed(() => {
  if (!props.textMessage) return ''
  return props.textMessage.data?.reason || props.textMessage.text
})

const hasReason = computed(() => {
  return Boolean(props.textMessage?.data?.reason)
})

const isOwnMessage = computed(() => {
  return props.textMessage?.sender_id === props.user?.id
})

const readStatusTitle = computed(() => {
  if (!props.textMessage || !isOwnMessage.value) return ''
  return props.textMessage.is_read ? t('common.messageRead') : t('common.messageUnread')
})

const readStatusClass = computed(() => {
  if (!props.textMessage || !isOwnMessage.value) return ''
  return props.textMessage.is_read ? 'text-sky-300' : 'text-gray-300/85'
})

const bubbleRoleClass = computed(() => {
  if (props.textMessage?.sender_id === props.user?.id) {
    return 'bg-blue-600 text-mainText rounded-br-none self-end'
  }

  return 'bg-dark-600 text-mainText rounded-bl-none'
})

const pillClasses = computed(() => 'text-gray-200 bg-dark-700/80 border border-dark-600')

const isAdminSenderParticipantInCurrentChat = computed(() => {
  if (!props.textMessage?.is_admin_message) return false
  const participants = props.chatParticipantIds ?? []
  if (participants.length === 0) return false
  return participants.includes(props.textMessage.sender_id)
})

const shouldRenderAdminMessage = computed(() => {
  return Boolean(
    props.textMessage
    && props.showAdminBadge
    && props.textMessage.is_admin_message
    && !isAdminSenderParticipantInCurrentChat.value
  )
})
</script>

<template>
	<!-- Admin message - centered, full width -->
	<div v-if="shouldRenderAdminMessage" class="w-full min-w-0 flex justify-center">
		<div class="w-full min-w-0 max-w-2xl overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-3 text-sm text-mainText break-words [overflow-wrap:anywhere]">
			<div class="flex items-start gap-2">
				<div class="flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-blue-500/20">
					<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
						<path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 011.5-1.5h3V2a.5.5 0 00-.5-.5h-3A4.5 4.5 0 0010 5.5v6a4.5 4.5 0 004.5 4.5h3a.5.5 0 00.5-.5V15h-3a1.5 1.5 0 01-1.5-1.5z"></path>
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-blue-200 font-medium text-xs mb-1">{{ $t('common.admin') }}</p>
          <p v-if="senderLabel || forceShowSender" class="text-xs text-gray-400 mb-1">{{ senderLabel || $t('common.admin') }}</p>
					<p class="text-gray-100 break-words [overflow-wrap:anywhere]">{{ adminContent }}</p>
          <div v-if="hasReason" class="mt-2 space-y-2">
            <p class="font-semibold text-gray-50">{{ $t('common.reason') }}</p>
            <div class="rounded-lg border border-dark-600 bg-dark-900/70 px-3 py-2 text-gray-100">
              <p class="whitespace-pre-line break-words [overflow-wrap:anywhere]">{{ reasonText }}</p>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-end gap-2 text-xs text-gray-400">
            <span>{{ textMessage ? formatDate(textMessage.created_at) : '' }}</span>
            <span
              v-if="isOwnMessage"
              class="inline-flex items-center leading-none select-none transition-colors duration-200"
              :class="readStatusClass"
              :title="readStatusTitle"
              :aria-label="readStatusTitle"
            >
              <Check
                v-if="textMessage ? !textMessage.is_read : false"
                class="h-3.5 w-3.5 translate-y-[0.25px]"
                :stroke-width="2.35"
                aria-hidden="true"
              />
              <CheckCheck
                v-else
                class="h-3.5 w-3.5 -translate-x-[0.5px] translate-y-[0.25px]"
                :stroke-width="2.35"
                aria-hidden="true"
              />
            </span>
          </div>
				</div>
			</div>
		</div>
	</div>

	<!-- Regular messages -->
	<div v-else-if="textMessage != null" class="min-w-0 max-w-[70%] rounded-xl px-4 py-2 text-sm break-words [overflow-wrap:anywhere] md:max-w-[40%]" :class="[
    bubbleRoleClass,
    textMessage.sender_id === user?.id ? 'self-end' : 'self-start'
	]">
    <div v-if="senderLabel || forceShowSender" class="mb-1 flex items-center gap-2">
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="pillClasses">
        {{ senderLabel || $t('common.user') }}
      </span>
    </div>
		<p class="break-words [overflow-wrap:anywhere]">{{ regularContent }}</p>
    <div v-if="hasReason" class="mt-2 space-y-2">
      <p class="font-semibold text-gray-50">{{ $t('common.reason') }}</p>
      <div class="rounded-lg border border-dark-700 bg-dark-900/60 px-3 py-2 text-gray-100">
        <p class="whitespace-pre-line break-words [overflow-wrap:anywhere]">{{ reasonText }}</p>
      </div>
    </div>
    <div class="mt-1 flex items-center justify-end gap-2 text-xs text-gray-300">
      <span>{{ formatDate(textMessage.created_at) }}</span>
      <span
        v-if="isOwnMessage"
        class="inline-flex items-center leading-none select-none transition-colors duration-200"
        :class="readStatusClass"
        :title="readStatusTitle"
        :aria-label="readStatusTitle"
      >
        <Check
          v-if="!textMessage.is_read"
          class="h-3.5 w-3.5 translate-y-[0.25px]"
          :stroke-width="2.35"
          aria-hidden="true"
        />
        <CheckCheck
          v-else
          class="h-3.5 w-3.5 -translate-x-[0.5px] translate-y-[0.25px]"
          :stroke-width="2.35"
          aria-hidden="true"
        />
      </span>
    </div>
	</div>
</template>
