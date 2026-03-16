<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string | null
    opacity?: number
    offsetY?: number
  }>(),
  {
    opacity: 1,
    offsetY: 0,
  }
)

const wrapperStyle = computed(() => {
  const safeOpacity = Math.min(1, Math.max(0, props.opacity))
  const safeOffsetY = Number.isFinite(props.offsetY) ? props.offsetY : 0

  return {
    opacity: String(safeOpacity),
    transform: `translate(-50%, ${safeOffsetY}px)`,
    transition: 'opacity 0.14s linear, transform 0.14s linear',
  }
})
</script>

<template>
  <transition name="floating-date-fade">
    <div
      v-if="props.label"
      class="pointer-events-none absolute left-1/2 top-2 z-20"
      :style="wrapperStyle"
    >
      <div class="rounded-full border border-dark-600/80 bg-dark-900/85 px-3 py-1 text-xs font-medium text-mainText backdrop-blur">
        {{ props.label }}
      </div>
    </div>
  </transition>
</template>

<style scoped>
.floating-date-fade-enter-active,
.floating-date-fade-leave-active {
  transition: opacity 0.18s ease;
}

.floating-date-fade-enter-from,
.floating-date-fade-leave-to {
  opacity: 0;
}
</style>
