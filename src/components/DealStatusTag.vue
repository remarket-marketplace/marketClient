<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    dealStatus: string
}>()

const statusClass = computed(() => {
    switch (props.dealStatus) {
        case 'pending':
            return 'text-[var(--text-warning-strong)] bg-[rgb(var(--palette-amber-400)/0.1)] border-[rgb(var(--palette-amber-400)/0.2)]';
        case 'confirmed':
            return 'text-[var(--text-success-strong)] bg-[rgb(var(--palette-emerald-400)/0.1)] border-[rgb(var(--palette-emerald-400)/0.2)]';
        case 'disputed':
            return 'text-[var(--text-warning-strong)] bg-[rgb(var(--palette-orange-400)/0.1)] border-[rgb(var(--palette-orange-400)/0.2)]';
        case 'completed':
            return 'text-[var(--text-link)] bg-[rgb(var(--palette-blue-400)/0.1)] border-[rgb(var(--palette-blue-400)/0.2)]';
        case 'cancelled':
            return 'text-[var(--text-danger)] bg-[rgb(var(--palette-red-400)/0.1)] border-[rgb(var(--palette-red-400)/0.2)]';
        case 'refunded':
            return 'text-[var(--text-link)] bg-[rgb(var(--palette-purple-400)/0.1)] border-[rgb(var(--palette-purple-400)/0.2)]';
        default:
            return 'text-[var(--text-muted)] bg-[rgb(var(--palette-gray-400)/0.1)] border-[rgb(var(--palette-gray-400)/0.2)]';
    }
})

</script>

<template>
    <span :class='["text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap border transition-all duration-200", statusClass]'>
        {{ $t(`common.dealStatuses.${dealStatus}`) }}
    </span>
</template>