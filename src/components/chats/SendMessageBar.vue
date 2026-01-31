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
    <div class="flex flex-none mt-2 sticky bottom-0 z-10">
        <input
            :value="props.newMessage"
            @input="updateMessage"
            type="text"
            class="flex-1 rounded-l-2xl bg-white/5 backdrop-blur-lg rounded-r-none border border-white/10 p-3 outline-none text-white placeholder:text-gray-400 focus:border-blue-400/60 transition" 
            :placeholder="$t('pages.chats.messagePlaceholder')"
            maxlength="500"
            @keyup.enter="handleSendMessage"
        >
        <button 
            class="rounded-l-none rounded-r-2xl bg-blue-600/90 hover:bg-blue-500 transition text-white px-4 text-sm font-bold backdrop-blur-lg border border-blue-400/40" 
            @click="handleSendMessage"
        >
        <img :src="images.chat.send" alt="">
        </button>
    </div>
</template>
