<script setup lang="ts">

defineProps<{
    buttonText: string,
    sended: boolean
}>()


</script>

<template>
    <button
        type="submit"
        :disabled="sended"
        class="market-btn market-btn-primary w-full rounded-lg px-2 py-2 text-mainText"
        >
        {{ buttonText }}
    </button>
</template>
