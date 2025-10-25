<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const newMessage = ref('')
</script>

<template>
    <div class="flex flex-none pb-2 lg:pb-0">
        <input
            v-model="newMessage" type="text" class="flex-1 rounded-l-2xl bg-dark-600 rounded-r-none bg-input-main border border-dark-700 p-3 outline-none" :placeholder="$t('pages.chats.messagePlaceholder')"
            @keyup.enter="$emit('sendMessage', newMessage)"
        >
        <button class="rounded-l-none rounded-r-2xl bg-button-main px-4 text-sm font-bold" @click="$emit('sendMessage', newMessage)">
            <p>{{ $t("common.send") }}</p>
        </button>
    </div>
</template>