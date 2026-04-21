<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    productStatus: string
    size?: 'default' | 'compact'
}>()

const statusClass = computed(() => {
    switch (props.productStatus) {
        case 'active':
            return 'text-[rgb(var(--palette-emerald-400))] bg-[rgb(var(--palette-emerald-400)/0.1)] border-[rgb(var(--palette-emerald-400)/0.2)]';
        case 'sold':
            return 'text-[rgb(var(--palette-rose-400))] bg-[rgb(var(--palette-rose-400)/0.1)] border-[rgb(var(--palette-rose-400)/0.2)]';
        case 'pending':
            return 'text-[rgb(var(--palette-amber-400))] bg-[rgb(var(--palette-amber-400)/0.1)] border-[rgb(var(--palette-amber-400)/0.2)]';
        case 'completed':
            return 'text-[rgb(var(--palette-blue-400))] bg-[rgb(var(--palette-blue-400)/0.1)] border-[rgb(var(--palette-blue-400)/0.2)]';
        case 'disputed':
            return 'text-[rgb(var(--palette-orange-400))] bg-[rgb(var(--palette-orange-400)/0.1)] border-[rgb(var(--palette-orange-400)/0.2)]';
        case 'moderation':
            return 'text-[rgb(var(--palette-purple-400))] bg-[rgb(var(--palette-purple-400)/0.1)] border-[rgb(var(--palette-purple-400)/0.2)]';
        case 'rejected':
            return 'text-[rgb(var(--palette-red-400))] bg-[rgb(var(--palette-red-400)/0.1)] border-[rgb(var(--palette-red-400)/0.2)]';
        default:
            return 'text-[rgb(var(--palette-gray-400))] bg-[rgb(var(--palette-gray-400)/0.1)] border-[rgb(var(--palette-gray-400)/0.2)]';
    }
})

const sizeClass = computed(() => {
    if (props.size === 'compact') {
        return 'text-[10px] px-1.5 py-0.5'
    }
    return 'text-xs px-2.5 py-1'
})
</script>

<template>
    <span :class='["font-medium rounded-full whitespace-nowrap border transition-all duration-200", statusClass, sizeClass]'>
        {{ $t(`common.productStatuses.${productStatus}`) }}
    </span>
</template>
