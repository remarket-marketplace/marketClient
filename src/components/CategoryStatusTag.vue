<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    is_active: boolean
}>()

const statusClass = computed(() => {
    switch (props.is_active) {
        case true:
            return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case false:
            return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        default:
            return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
})
</script>

<template>
    <span :class='["text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap border transition-all duration-200", statusClass]'>
        {{ $t(`common.categoryStatuses.${is_active ? 'active' : 'inactive'}`) }}
    </span>
</template>