<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

defineProps<{
  title: string
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-corner-toast">
      <section
        class="pointer-events-none fixed inset-x-4 top-4 z-[120] sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[360px]"
        aria-live="polite"
      >
        <div
          class="auth-corner-toast flex items-center gap-3 rounded-2xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-dark-900)/0.94)] px-4 py-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.45)]"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--palette-blue-500)/0.16)] text-[var(--text-accent-strong)]">
            <CheckCircle2 class="h-4.5 w-4.5" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-5 text-[var(--text-title)]">
              {{ title }}
            </p>
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-corner-toast {
  backdrop-filter: blur(14px);
}

.auth-corner-toast-enter-active,
.auth-corner-toast-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-corner-toast-enter-from,
.auth-corner-toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
