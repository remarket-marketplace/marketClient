<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'h-5 w-5'
  if (props.size === 'lg') return 'h-10 w-10'
  return 'h-8 w-8'
})
</script>

<template>
  <LoaderCircle :class="`${sizeClass} animate-spin text-blue-500`" />
</template>
