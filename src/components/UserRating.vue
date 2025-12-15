<script setup lang="ts">
import { Star } from 'lucide-vue-next'
defineProps<{
    rating: number
}>()
</script>

<template>
    <div class="flex items-center gap-1 rounded-full bg-dark-700 px-1.5 py-0.5 text-xs font-semibold text-yellow-400 flex-shrink-0"
        title="Seller rating">
        <Star class="h-3 w-3 fill-yellow-400" />
        <span class="whitespace-nowrap">{{ rating.toFixed(1) }}</span>
    </div>
</template>
