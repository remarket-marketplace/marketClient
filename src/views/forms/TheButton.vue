<script setup lang="ts">

defineProps<{
    buttonText: string,
    sended: boolean,
    disabled?: boolean
}>()


</script>

<template>
    <button
        type="submit"
        :disabled="sended || disabled"
        class="market-btn market-btn-primary w-full rounded-lg px-2 py-2 text-mainText disabled:cursor-not-allowed disabled:opacity-60"
        >
        {{ buttonText }}
    </button>
</template>
