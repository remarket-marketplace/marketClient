<script setup lang="ts">
defineProps<{
  label: string | null
}>()
</script>

<template>
  <transition name="floating-date-fade">
    <div
      v-if="label"
      class="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2"
    >
      <div class="rounded-full border border-dark-600/80 bg-dark-900/85 px-3 py-1 text-xs font-medium text-mainText backdrop-blur">
        {{ label }}
      </div>
    </div>
  </transition>
</template>

<style scoped>
.floating-date-fade-enter-active,
.floating-date-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.floating-date-fade-enter-from,
.floating-date-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}
</style>
