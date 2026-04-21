<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    is_active: boolean
}>()

const statusClass = computed(() => {
    switch (props.is_active) {
        case true:
            return 'text-[var(--text-success-strong)] bg-[rgb(var(--palette-emerald-400)/0.1)] border-[rgb(var(--palette-emerald-400)/0.2)]';
        case false:
            return 'text-[var(--text-muted)] bg-[rgb(var(--palette-gray-400)/0.1)] border-[rgb(var(--palette-gray-400)/0.2)]';
        default:
            return 'text-[var(--text-muted)] bg-[rgb(var(--palette-gray-400)/0.1)] border-[rgb(var(--palette-gray-400)/0.2)]';
    }
})
</script>

<template>
    <span :class='["text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap border transition-all duration-200", statusClass]'>
        {{ $t(`common.categoryStatuses.${is_active ? 'active' : 'inactive'}`) }}
    </span>
</template>