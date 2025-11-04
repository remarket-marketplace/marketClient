<script setup lang="ts">

defineProps<{
    errorMessage: string
}>()
</script>

<template>
    <div class="w-full bg-red-600/30 border-1 border-red-600 rounded-xl px-3 py-4">
        {{ errorMessage }}
    </div>
</template>