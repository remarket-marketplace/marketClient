<script setup lang="ts">
import { ArrowRight, Sparkles } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

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
  <div class="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen min-h-[70vh] flex flex-col items-center justify-center overflow-hidden">
    
    <div class="absolute inset-0 w-full h-full z-0 pointer-events-none hero-mask">
        <div class="absolute inset-0 bg-background"></div>
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
        <div class="absolute inset-0 hero-grid-pattern"></div>
        
        <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-blob"></div>
        <div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div class="absolute -bottom-20 left-1/2 w-[600px] h-[600px] bg-blue-700/20 rounded-full blur-[130px] animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative z-20 px-4 max-w-5xl mx-auto text-center flex flex-col items-center py-20">
      
      <div class="mb-8 inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
        <Sparkles class="w-4 h-4 text-blue-400 mr-2" />
        <span class="text-xs font-semibold text-blue-100 uppercase tracking-[0.2em]">{{ t('hero.badge') }}</span>
      </div>

      <h1 class="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 animate-fade-in-up animation-delay-100 drop-shadow-2xl">
        <span class="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          {{ t('hero.mainTitle') }}
        </span>
        <br />
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 animate-gradient-x">
          {{ t('hero.mainTitleGradient') }}
        </span>
      </h1>

      <p class="text-lg md:text-2xl text-gray-400 max-w-2xl mb-12 animate-fade-in-up animation-delay-200 leading-relaxed font-light">
        {{ t('hero.description') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-5 animate-fade-in-up animation-delay-300 w-full sm:w-auto px-6">
        <button 
          @click="scrollToCatalog"
          class="hero-primary-btn group relative px-10 py-4 bg-blue-600 text-white font-bold rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] duration-300"
        >
          <span class="relative flex items-center justify-center text-lg">
            {{ t('hero.exploreCatalog') }}
            <ArrowRight class="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </button>

        <button
            @click="router.push(user && user.username ? '/product/create' : '/signin')"
            class="px-10 py-4 bg-white/5 text-white border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-300 backdrop-blur-md text-lg"
        >
          {{ t('hero.startSelling') }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hero-mask {
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}

.animate-gradient-x {
  background-size: 200% 200%;
  animation: gradient-x 5s ease infinite;
}

@keyframes gradient-x {
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
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

.animate-fade-in-up {
  animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(30px);
}

.animation-delay-100 { animation-delay: 0.15s; }
.animation-delay-200 { animation-delay: 0.3s; }
.animation-delay-300 { animation-delay: 0.45s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-grid-pattern {
  background-image: linear-gradient(to right, var(--grid-pattern-stroke-strong) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-pattern-stroke-strong) 1px, transparent 1px);
  background-size: 60px 60px;
}

.hero-primary-btn:hover {
  box-shadow: 0 10px 30px -5px var(--shadow-blue-600-30);
}
</style>
