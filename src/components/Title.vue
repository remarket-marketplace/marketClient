<script setup lang="ts">
    defineProps<{
    text: string
}>()
</script>

<template>
    <p class="text-2xl font-bold title">{{ text }}</p>
</template>