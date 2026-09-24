<script setup lang="ts">
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex w-screen min-h-[calc(100vh-56px)] flex-col items-center justify-center overflow-hidden">
    
    <!-- Фон с анимированными шарами -->
    <div class="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <div class="absolute inset-0 bg-background"></div>
        <div class="absolute inset-0 noise-overlay-bg opacity-20 mix-blend-soft-light"></div>
        
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-[30vw] md:text-[25vw] lg:text-[20vw] font-black tracking-tight opacity-[0.03] select-none">
            404
          </div>
        </div>
        
        <div class="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[rgb(var(--palette-blue-600)/0.25)] rounded-full blur-[100px] animate-blob"></div>
        <div class="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[rgb(var(--palette-cyan-500)/0.2)] rounded-full blur-[80px] animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-1/4 left-1/2 w-[450px] h-[450px] bg-[rgb(var(--palette-blue-700)/0.2)] rounded-full blur-[110px] animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative z-10 px-6 w-full max-w-xl mx-auto text-center flex flex-col items-center">
      
      <!-- Иконка и заголовок -->
      <div class="mb-8 flex flex-col items-center gap-4">
        <div class="inline-flex items-center justify-center w-24 h-24 rounded-full border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.05)] backdrop-blur-md animate-fade-in-up">
          <Search class="w-12 h-12 text-[rgb(var(--text-link-rgb)/0.9)]" />
        </div>

        <!-- Заголовок -->
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-title)] mb-2 animate-fade-in-up animation-delay-100">
          <span class="bg-clip-text text-[var(--text-transparent)] bg-gradient-to-r from-[rgb(var(--palette-blue-400))] via-[rgb(var(--palette-cyan-300))] to-[rgb(var(--palette-blue-500))] animate-gradient-x">
            {{ t('pages.notFound.pageNotFound') }}
          </span>
        </h1>

        <!-- Подзаголовок -->
        <p class="text-xl md:text-2xl text-[var(--text-body)] font-light animate-fade-in-up animation-delay-200">
          {{ t('pages.notFound.errorCode') }}
        </p>
      </div>

      <!-- Сообщение -->
      <div class="mb-8 max-w-md animate-fade-in-up animation-delay-300">
        <div class="flex items-start gap-3 p-4 rounded-lg border border-[rgb(var(--palette-blue-500)/0.2)] bg-[rgb(var(--palette-blue-500)/0.05)] backdrop-blur-sm">
          <AlertCircle class="w-5 h-5 text-[var(--text-link)] flex-shrink-0 mt-0.5" />
          <p class="text-base text-[rgb(var(--text-body-rgb)/0.9)] text-left font-light">
            {{ t('pages.notFound.description') }}
          </p>
        </div>
      </div>

      <!-- Кнопки -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm animate-fade-in-up animation-delay-400">
        <button
          @click="$router.back()"
          class="not-access-primary-btn market-primary-surface market-primary-hover group relative flex items-center justify-center gap-3 overflow-hidden rounded-xl px-8 py-3 font-semibold text-[var(--text-title)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft class="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
          {{ t('pages.notFound.back') }}
        </button>

        <button
          @click="goHome"
          class="group px-8 py-3 bg-[rgb(var(--palette-white)/0.1)] text-[var(--text-title)] border border-[rgb(var(--palette-white)/0.2)] font-semibold rounded-xl hover:bg-[rgb(var(--palette-white)/0.15)] transition-all hover:scale-[1.02] active:scale-[0.98] duration-300 flex items-center justify-center gap-3 backdrop-blur-sm"
        >
          <Home class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          {{ t('pages.notFound.goHome') }}
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
  33% { transform: translate(30px, -40px) scale(1.08); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(25px);
}

.animation-delay-100 { animation-delay: 0.1s; }
.animation-delay-200 { animation-delay: 0.2s; }
.animation-delay-300 { animation-delay: 0.3s; }
.animation-delay-400 { animation-delay: 0.4s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(25px); }
  to { opacity: 1; transform: translateY(0); }
}

.not-access-primary-btn:hover {
  box-shadow: 0 10px 25px -5px var(--shadow-blue-600-40);
}
</style>
