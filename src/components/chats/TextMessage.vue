<script setup lang="ts">
defineProps<{
	textMessage: { id: string; chat_room_id: string; created_at: string; message_type: "text_message"; sender_id: string; text: string; is_read: boolean; } | null;
	user: any;
	formatDate: (dateStr: string) => string;
}>()
</script>

<template>
	<div v-if="textMessage != null" class="max-w-[70%] rounded-xl px-4 py-2 text-sm break-words" :class="[
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
