<script setup lang="ts">
import { useImages } from '@/composables/useImages';
import { computed } from 'vue';

const { images } = useImages()

const props = defineProps<{
    newMessage: string
    disabled?: boolean
}>()

const emit = defineEmits(['sendMessage', 'update:newMessage']) 

const isDisabled = computed(() => props.disabled === true)

const handleSendMessage = () => {
    if (!isDisabled.value && props.newMessage.trim()) {
        emit('sendMessage')
    }
}

const updateMessage = (event: Event) => {
    if (isDisabled.value) return
    emit('update:newMessage', (event.target as HTMLInputElement).value)
}

</script>

<template>
    <div class="flex flex-none mt-2 sticky bottom-0 z-10">
        <input
            :value="props.newMessage"
            @input="updateMessage"
            type="text"
            class="flex-1 rounded-l-2xl bg-white/5 backdrop-blur-lg rounded-r-none border border-white/10 p-3 outline-none text-white placeholder:text-gray-400 focus:border-blue-400/60 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:border-amber-400/40 disabled:bg-amber-500/10 disabled:placeholder:text-amber-200/70" 
            :placeholder="$t('pages.chats.messagePlaceholder')"
            :disabled="isDisabled"
            maxlength="500"
            @keyup.enter="handleSendMessage"
        >
        <button 
            class="rounded-l-none rounded-r-2xl bg-blue-600/90 hover:bg-blue-500 transition text-white px-4 text-sm font-bold backdrop-blur-lg border border-blue-400/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-dark-500 disabled:hover:bg-dark-500 disabled:border-amber-400/40" 
            :disabled="isDisabled"
            @click="handleSendMessage"
        >
        <img :src="images.chat.send" alt="">
        </button>
    </div>
</template>
