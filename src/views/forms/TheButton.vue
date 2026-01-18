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
        class="w-full rounded-lg bg-button-main py-2 px-2 text-mainText font-semibold transition-colors duration-200 hover:bg-blue-700"
        >
        {{ buttonText }}
    </button>
</template>