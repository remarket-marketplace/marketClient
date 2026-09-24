<script setup lang="ts">

defineProps<{
    errorMessage: string
}>()
</script>

<template>
    <div class="w-full bg-[rgb(var(--palette-red-600)/0.3)] border-1 border-[rgb(var(--palette-red-600))] rounded-xl px-3 py-4">
        {{ errorMessage }}
    </div>
</template>