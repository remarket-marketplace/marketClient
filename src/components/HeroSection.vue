<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HeroBackground from '@/components/HeroBackground.vue'
import heroSceneSrc from '@/assets/images/banner.png'

const { t } = useI18n()

const heroBackgroundStyle = computed(() => ({
  backgroundImage: `var(--hero-banner-image-gradient), url(${heroSceneSrc})`,
}))

const highlights = computed(() => ([
  t('hero.highlights.protection'),
  t('hero.highlights.sellers'),
]))
</script>

<template>
  <section class="relative w-full pt-[clamp(4.15rem,6vw,5.15rem)] pb-6 max-[767px]:pt-[4.5rem] max-[767px]:pb-5">
    <div
      class="relative isolate overflow-hidden rounded-[1.9rem] border border-[rgb(var(--palette-white)/0.08)] bg-[var(--hero-banner-bg)] bg-cover bg-[center_right] min-[768px]:min-h-[31rem] min-[768px]:[background-position:68%_center] max-[767px]:rounded-[1.5rem] max-[767px]:bg-[center_center]"
      :style="heroBackgroundStyle"
    >
      <HeroBackground class="absolute inset-0 z-0 opacity-34" :masked="false" />
      <div
        class="pointer-events-none absolute left-[-8rem] top-24 z-[1] h-96 w-96 rounded-full bg-[rgb(var(--palette-blue-500)/0.18)] blur-[80px]"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute bottom-12 right-[-4rem] z-[1] h-80 w-80 rounded-full bg-[rgb(var(--palette-indigo-500)/0.16)] blur-[80px]"
        aria-hidden="true"
      ></div>
      <div class="pointer-events-none absolute inset-0 z-[1] bg-[var(--hero-banner-overlay-desktop)] max-[767px]:bg-[var(--hero-banner-overlay-mobile)]"></div>

      <div class="relative z-[2] h-full px-5 pt-[clamp(2.75rem,5vw,4rem)] pb-[clamp(2rem,4vw,2.75rem)] sm:px-6 lg:px-8 min-[1400px]:px-10 max-[767px]:px-4 max-[767px]:pt-5 max-[767px]:pb-5">
        <div class="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,35rem)_minmax(16rem,1fr)] min-[1100px]:gap-8">
          <div class="max-w-[36rem] min-[1100px]:pb-[0.15rem] max-[767px]:max-w-[20.5rem]">
            <h1 class="animate-fade-in-up mt-5 text-[clamp(2.55rem,5.5vw,4.45rem)] leading-[0.92] font-bold tracking-[-0.05em] text-[var(--text-title)] max-[767px]:mt-0 max-[767px]:max-w-[18.75rem] max-[767px]:text-[clamp(2rem,9vw,3rem)] max-[767px]:leading-[0.94] [animation-delay:0.12s]">
              <span>{{ t('hero.titleLead') }}</span>
              <span class="mt-[0.3rem] block bg-gradient-to-br from-[rgb(var(--palette-white))] via-[rgb(var(--palette-blue-200))] to-[rgb(var(--palette-cyan-300))] bg-clip-text text-[var(--text-transparent)]">
                {{ t('hero.titleAccent') }}
              </span>
            </h1>

            <p class="animate-fade-in-up mt-[1.15rem] max-w-[32rem] text-[clamp(0.98rem,1.35vw,1.06rem)] leading-[1.55] text-[rgb(var(--text-body-rgb)/0.94)] max-[767px]:mt-3 max-[767px]:max-w-[19rem] max-[767px]:text-[0.8rem] max-[767px]:leading-[1.34] [animation-delay:0.24s]">
              {{ t('hero.description') }}
            </p>

            <ul class="animate-fade-in-up mt-[1.1rem] flex flex-wrap gap-x-[1.15rem] gap-y-[0.85rem] p-0 max-[767px]:mt-3 max-[767px]:max-w-[19rem] max-[767px]:flex-col max-[767px]:gap-x-0 max-[767px]:gap-y-2 [animation-delay:0.24s]">
              <li
                v-for="highlight in highlights"
                :key="highlight"
                class="inline-flex items-start gap-[0.55rem] text-[0.88rem] leading-[1.35] text-[rgb(var(--text-body-strong-rgb)/0.92)] max-[767px]:gap-2 max-[767px]:text-[0.76rem] max-[767px]:leading-[1.3]"
              >
                <span class="mt-[0.26rem] h-[0.42rem] w-[0.42rem] shrink-0 rounded-full bg-[rgb(var(--palette-cyan-300))] shadow-[var(--hero-bullet-shadow)]"></span>
                <span>{{ highlight }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(28px);
}

@media (max-width: 767px) {
  .animate-fade-in-up {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(28px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
