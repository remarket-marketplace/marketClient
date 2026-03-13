<script setup lang="ts">
    defineProps<{
    text: string
}>()
</script>

<template>
    <p class="text-2xl font-bold">{{ text }}</p>
</template>