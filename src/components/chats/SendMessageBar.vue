<script setup lang="ts">
import { useImages } from '@/composables/useImages';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { images } = useImages()

const props = defineProps<{
    newMessage: string
}>()

const emit = defineEmits(['sendMessage', 'update:newMessage']) 

const handleSendMessage = () => {
    if (props.newMessage.trim()) {
        emit('sendMessage')
    }
}

const updateMessage = (event: Event) => {
    emit('update:newMessage', (event.target as HTMLInputElement).value)
}

</script>

<template>
    <div class="flex flex-none mt-2">
        <input
            :value="props.newMessage"
            @input="updateMessage"
            type="text"
            class="flex-1 rounded-l-2xl bg-dark-600 rounded-r-none bg-input-main border border-dark-700 p-3 outline-none" 
            :placeholder="$t('pages.chats.messagePlaceholder')"
            @keyup.enter="handleSendMessage"
        >
        <button 
            class="rounded-l-none rounded-r-2xl bg-button-main px-4 text-sm font-bold" 
            @click="handleSendMessage"
        >
        <img :src="images.chat.send" alt="">
        </button>
    </div>
</template>