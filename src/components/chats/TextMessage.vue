<script setup lang="ts">
interface TextMessageProps {
  id: string;
  chat_room_id: string;
  created_at: string;
  message_type: "text_message";
  sender_id: string;
  text: string;
  is_read: boolean;
  is_admin_message?: boolean;
}

defineProps<{
  textMessage: TextMessageProps | null;
  user: any;
  formatDate: (dateStr: string) => string;
  showAdminBadge?: boolean;
}>()
</script>

<template>
	<!-- Admin message - centered, full width -->
	<div v-if="textMessage != null && showAdminBadge && textMessage.is_admin_message" class="w-full flex justify-center">
		<div class="w-full max-w-2xl px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 text-mainText text-sm break-words">
			<div class="flex items-start gap-2">
				<div class="flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-blue-500/20">
					<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
						<path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 011.5-1.5h3V2a.5.5 0 00-.5-.5h-3A4.5 4.5 0 0010 5.5v6a4.5 4.5 0 004.5 4.5h3a.5.5 0 00.5-.5V15h-3a1.5 1.5 0 01-1.5-1.5z"></path>
					</svg>
				</div>
				<div class="flex-1">
					<p class="text-blue-200 font-medium text-xs mb-1">{{ $t('common.admin') }}</p>
					<p class="text-gray-100">{{ textMessage.text }}</p>
					<p class="mt-2 text-right text-xs text-gray-400">
						{{ formatDate(textMessage.created_at) }}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Regular messages -->
	<div v-else-if="textMessage != null" class="max-w-[70%] min-w-4 rounded-xl px-4 py-2 text-sm break-words" :class="[
		textMessage.sender_id === user?.id
			? 'bg-blue-600 text-mainText rounded-br-none self-end'
			: 'bg-dark-600 text-mainText rounded-bl-none self-start'
	]">
		<p>{{ textMessage.text }}</p>
		<p class="mt-1 text-right text-xs text-gray-300">
			{{ formatDate(textMessage.created_at) }}
		</p>
	</div>
</template>
