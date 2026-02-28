<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    productStatus: string
    size?: 'default' | 'compact'
}>()

const statusClass = computed(() => {
    switch (props.productStatus) {
        case 'active':
            return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'sold':
            return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
        case 'pending':
            return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        case 'completed':
            return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        case 'disputed':
            return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        case 'moderation':
            return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        case 'rejected':
            return 'text-red-400 bg-red-400/10 border-red-400/20';
        default:
            return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
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
