<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const isTouchTooltipVisible = ref(false)
let touchTooltipTimer: ReturnType<typeof setTimeout> | null = null

function showTouchTooltip(): void {
  if (touchTooltipTimer) {
    clearTimeout(touchTooltipTimer)
  }
  isTouchTooltipVisible.value = true
  touchTooltipTimer = setTimeout(() => {
    isTouchTooltipVisible.value = false
    touchTooltipTimer = null
  }, 1700)
}

function handleTouchStart(event: TouchEvent): void {
  event.preventDefault()
  event.stopPropagation()
  showTouchTooltip()
}

function handleClick(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

onBeforeUnmount(() => {
  if (touchTooltipTimer) {
    clearTimeout(touchTooltipTimer)
  }
})
</script>

<template>
  <span
    class="group relative inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-[rgb(var(--palette-blue-500)/0.7)] bg-[rgb(var(--palette-blue-950)/0.7)] text-[var(--text-accent-strong)]"
    role="button"
    tabindex="0"
    @touchstart="handleTouchStart"
    @click="handleClick"
  >
    <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 text-current" fill="none" aria-hidden="true">
      <path
        d="M9.9 1.2H5.6c-.3 0-.5.2-.6.4L3 7.1c-.1.4.1.8.6.8h2.7L5 14.2c-.1.4.4.7.8.4l7-8.2c.3-.3 0-.9-.4-.9H9.3l1.2-3.4c.1-.4-.1-.9-.6-.9z"
        stroke="currentColor"
        stroke-width="1.45"
        stroke-linejoin="round"
      />
    </svg>
    <span
      class="auto-delivery-tooltip pointer-events-none absolute right-0 top-6 z-20 hidden w-max max-w-[150px] whitespace-normal rounded-md border border-[rgb(var(--palette-blue-400)/0.35)] px-2 py-1 text-center text-[10px] font-medium leading-tight text-[var(--text-accent-strong)] opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 sm:block"
    >
      Мгновенная выдача после покупки
    </span>

    <span
      v-if="isTouchTooltipVisible"
      class="auto-delivery-tooltip auto-delivery-tooltip-mobile pointer-events-none fixed bottom-20 left-1/2 z-[70] w-[min(220px,calc(100vw-1rem))] -translate-x-1/2 rounded-md border border-[rgb(var(--palette-blue-400)/0.35)] px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight text-[var(--text-accent-strong)] backdrop-blur-sm sm:hidden"
    >
      Мгновенная выдача после покупки
    </span>
  </span>
</template>

<style scoped>
.auto-delivery-tooltip {
  background: var(--auto-delivery-tooltip-bg);
  box-shadow: var(--auto-delivery-tooltip-shadow);
}

.auto-delivery-tooltip-mobile {
  box-shadow: var(--auto-delivery-tooltip-shadow-mobile);
}
</style>
