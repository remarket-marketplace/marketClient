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

</style>
