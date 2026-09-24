<script setup lang="ts">

defineProps<{
    successMessage: string
}>()
</script>

<template>
    <div class="w-full bg-[rgb(var(--palette-green-600)/0.3)] border-1 border-[rgb(var(--palette-green-600))] rounded-xl px-3 py-4">
        {{ successMessage }}
    </div>
</template>