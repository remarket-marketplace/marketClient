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
    class="group relative inline-flex h-5 w-5 items-center justify-center rounded-[7px] border border-blue-400/65 bg-blue-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
    role="button"
    tabindex="0"
    @touchstart="handleTouchStart"
    @click="handleClick"
  >
    <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 text-current" fill="currentColor" aria-hidden="true">
      <path
        d="M8.9 1.2c.16-.35-.17-.73-.52-.6L3.6 2.3a.55.55 0 0 0-.36.52v3.73c0 .31.24.56.54.56h2.55l-1.18 6.2c-.08.4.38.67.67.4l7.04-6.66a.56.56 0 0 0-.37-.97H9.8l1.1-4.88z"
      />
    </svg>
    <span
      class="pointer-events-none absolute right-0 top-6 z-20 hidden w-max max-w-[150px] whitespace-normal rounded-md border border-blue-400/35 bg-[#0a1528]/85 px-2 py-1 text-center text-[10px] font-medium leading-tight text-blue-100 opacity-0 shadow-[0_8px_20px_rgba(2,8,23,0.55)] backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 sm:block"
    >
      Мгновенная выдача после покупки
    </span>

    <span
      v-if="isTouchTooltipVisible"
      class="pointer-events-none fixed bottom-20 left-1/2 z-[70] w-[min(220px,calc(100vw-1rem))] -translate-x-1/2 rounded-md border border-blue-400/35 bg-[#0a1528]/90 px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight text-blue-100 shadow-[0_10px_24px_rgba(2,8,23,0.6)] backdrop-blur-sm sm:hidden"
    >
      Мгновенная выдача после покупки
    </span>
  </span>
</template>
