<script setup lang="ts">
withDefaults(
  defineProps<{
    masked?: boolean
  }>(),
  {
    masked: true,
  },
)
</script>

<template>
  <div class="relative h-full w-full overflow-hidden pointer-events-none" :class="masked ? 'hero-mask' : ''">
    <div class="absolute inset-0 bg-background"></div>
    <div class="absolute inset-0 noise-overlay-bg opacity-20 mix-blend-soft-light"></div>
    <div class="absolute inset-0 hero-grid-pattern"></div>

    <div class="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/30 blur-[120px] animate-blob"></div>
    <div class="absolute top-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[100px] animate-blob animation-delay-2000"></div>
    <div class="absolute -bottom-20 left-1/2 h-[600px] w-[600px] rounded-full bg-blue-700/20 blur-[130px] animate-blob animation-delay-4000"></div>
  </div>
</template>

<style scoped>
.hero-mask {
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}

.animate-blob {
  animation: blob 12s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

.animation-delay-2000 { animation-delay: 2s; }
.animation-delay-4000 { animation-delay: 4s; }

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(40px, -60px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.hero-grid-pattern {
  background-image: linear-gradient(to right, var(--grid-pattern-stroke-strong) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-pattern-stroke-strong) 1px, transparent 1px);
  background-size: 60px 60px;
}
</style>
