<script setup lang="ts">
import { ArrowRight, Sparkles } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import HeroBackground from '@/components/HeroBackground.vue'

const router = useRouter()
const { t } = useI18n()

const scrollToCatalog = () => {
  const catalogElement = document.getElementById('catalog-start')
  if (catalogElement) {
    catalogElement.scrollIntoView({ behavior: 'smooth' })
  }
}
const store = useUserStore()
const { user } = storeToRefs(store)
</script>

<template>
  <div
    class="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen min-h-[30vh] flex flex-col items-center justify-center overflow-hidden">
    <div class="absolute inset-0 h-full w-full z-0">
      <HeroBackground />
    </div>

    <div class="relative z-20 px-4 max-w-5xl mx-auto text-center flex flex-col items-center py-20">

      <div
        class="mb-8 inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
        <Sparkles class="w-4 h-4 text-blue-400 mr-2" />
        <span class="text-xs font-semibold text-blue-100 uppercase tracking-[0.2em]">{{ t('hero.badge') }}</span>
      </div>

      <h1
        class="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-8 animate-fade-in-up animation-delay-100 drop-shadow-2xl">
        <span class="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          {{ t('hero.mainTitle') }}
        </span>
        <br />
        <span
          class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 animate-gradient-x">
          {{ t('hero.mainTitleGradient') }}
        </span>
      </h1>

      <p
        class="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 animate-fade-in-up animation-delay-200 leading-relaxed font-light">
        {{ t('hero.description') }}
      </p>

      <div v-if="$slots.search" class="mb-8 w-full max-w-2xl animate-fade-in-up animation-delay-300">
        <slot name="search" />
      </div>

      <div class="flex gap-3 animate-fade-in-up animation-delay-300 w-full sm:w-auto">
        <button @click="scrollToCatalog"
          class="market-primary-surface market-primary-hover group relative
          overflow-hidden rounded-xl px-8 py-3 font-bold text-white transition-colors duration-300">
          <span class="relative flex items-center justify-center font-sm">
            {{ t('hero.exploreCatalog') }}
          </span>
        </button>

        <button @click="router.push(user && user.username ? '/product/create' : '/signin')"
          class="px-8 py-3 bg-white/5 text-white border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-colors duration-300 backdrop-blur-md text-sm">
          {{ t('hero.startSelling') }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-gradient-x {
  background-size: 200% 200%;
  animation: gradient-x 5s ease infinite;
}

@keyframes gradient-x {
  0% {
    background-position: 0% 50%
  }

  50% {
    background-position: 100% 50%
  }

  100% {
    background-position: 0% 50%
  }
}

.animate-fade-in-up {
  animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(30px);
}

.animation-delay-100 {
  animation-delay: 0.15s;
}

.animation-delay-200 {
  animation-delay: 0.3s;
}

.animation-delay-300 {
  animation-delay: 0.45s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
