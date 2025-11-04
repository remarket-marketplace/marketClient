<script setup lang="ts">

defineProps<{
    successMessage: string
}>()
</script>

<template>
    <div class="w-full bg-green-600/30 border-1 border-green-600 rounded-xl px-3 py-4">
        {{ successMessage }}
    </div>
</template>