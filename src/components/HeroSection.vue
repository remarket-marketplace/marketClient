<script setup lang="ts">
import {
  ArrowRight,
  AtSign,
  Globe,
  Hash,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

type PlatformKey = 'telegram' | 'x'

const router = useRouter()
const { t } = useI18n()
const props = defineProps<{
  selectedPlatform: PlatformKey
}>()
const emit = defineEmits<{
  platformChange: [platform: PlatformKey]
}>()

const heroTabs: Array<{ key: PlatformKey, labelKey: string }> = [
  { key: 'telegram', labelKey: 'hero.tabs.telegram' },
  { key: 'x', labelKey: 'hero.tabs.x' },
]

const scrollToCatalog = () => {
  const catalogElement = document.getElementById('catalog-start')
  if (catalogElement) {
    catalogElement.scrollIntoView({ behavior: 'smooth' })
  }
}

function onTabClick(platform: PlatformKey) {
  emit('platformChange', platform)
  scrollToCatalog()
}

function connectWallet() {
  window.open('https://tonkeeper.com/', '_blank', 'noopener,noreferrer')
}

const store = useUserStore()
const { user } = storeToRefs(store)
</script>

<template>
  <section class="hero-shell relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen overflow-hidden">
    <div class="hero-bg absolute inset-0 z-0 pointer-events-none hero-mask">
      <div class="absolute inset-0 bg-background"></div>
      <div class="absolute inset-0 hero-grid opacity-20"></div>
      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-soft-light"></div>

      <div class="hero-orb hero-orb-a"></div>
      <div class="hero-orb hero-orb-b"></div>
      <div class="hero-orb hero-orb-c"></div>
    </div>

    <div class="relative z-20 mx-auto w-full max-w-6xl px-4 py-12 md:py-14 lg:py-16">
      <div class="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="hero-enter space-y-5 md:space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
            <Send class="h-3.5 w-3.5 text-button-main" />
            <span>{{ t('hero.badge') }}</span>
          </div>

          <div class="space-y-4">
            <h1 class="text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              <span class="block bg-gradient-to-b from-white to-sky-100/80 bg-clip-text text-transparent">
                {{ t('hero.mainTitle') }}
              </span>
              <span class="block bg-gradient-to-r from-amber-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent hero-gradient-sweep">
                {{ t('hero.mainTitleGradient') }}
              </span>
            </h1>

            <p class="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl">
              {{ t('hero.description') }}
            </p>
          </div>

          <div class="hero-tabs rounded-2xl border border-slate-300/20 bg-slate-950/55 p-1.5">
            <button
              v-for="tab in heroTabs"
              :key="tab.key"
              type="button"
              class="hero-tab"
              :class="[
                props.selectedPlatform === tab.key ? 'hero-tab-active' : 'hero-tab-idle',
              ]"
              @click="onTabClick(tab.key)"
            >
              <AtSign v-if="tab.key === 'telegram'" class="h-3.5 w-3.5" />
              <Hash v-else class="h-3.5 w-3.5" />
              {{ t(tab.labelKey) }}
            </button>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              @click="scrollToCatalog"
              class="group inline-flex items-center justify-center gap-2 rounded-xl bg-button-main px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:translate-y-[-1px] hover:shadow-[0_14px_34px_-16px_rgba(42,171,238,0.9)] sm:text-base"
            >
              {{ t('hero.exploreCatalog') }}
              <ArrowRight class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            <button
              @click="connectWallet"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-gradient-to-r from-amber-300/15 to-violet-500/20 px-6 py-3.5 text-sm font-semibold text-amber-100 transition-all duration-300 hover:border-amber-200/55 hover:text-white sm:text-base"
            >
              <Wallet class="h-4 w-4" />
              {{ t('hero.connectWallet') }}
            </button>

            <button
              @click="router.push(user && user.username ? '/product/create' : '/signin')"
              class="inline-flex items-center justify-center rounded-xl border border-sky-300/25 bg-sky-950/45 px-6 py-3.5 text-sm font-semibold text-sky-100 transition-all duration-300 hover:border-sky-300/45 hover:bg-sky-900/45 sm:text-base"
            >
              {{ t('hero.startSelling') }}
            </button>
          </div>

          <div class="flex flex-wrap gap-2.5 pt-1">
            <span class="hero-chip">
              <AtSign class="h-3.5 w-3.5" />
              {{ t('hero.highlights.usernames') }}
            </span>
            <span class="hero-chip">
              <ShieldCheck class="h-3.5 w-3.5" />
              {{ t('hero.highlights.escrow') }}
            </span>
            <span class="hero-chip">
              <Hash class="h-3.5 w-3.5" />
              {{ t('hero.highlights.xHandles') }}
            </span>
          </div>
        </div>

        <div class="hero-enter hero-delay relative">
          <div class="hero-card rounded-3xl border border-sky-300/20 bg-slate-950/55 p-4 backdrop-blur-xl sm:p-5">
            <div class="mb-4 flex items-center justify-between rounded-2xl border border-sky-300/20 bg-sky-950/50 px-3.5 py-2.5">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">
                <Globe class="h-3.5 w-3.5 text-button-main" />
                {{ t('hero.panel.liveMarket') }}
              </div>
              <span class="rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                {{ t('hero.panel.online') }}
              </span>
            </div>

            <div class="mt-4 grid grid-cols-3 gap-2.5">
              <div class="hero-stat">
                <ShieldCheck class="h-3.5 w-3.5 text-emerald-300" />
                <span class="text-sm font-semibold text-white">{{ t('hero.panel.escrowTitle') }}</span>
                <span class="text-[11px] text-slate-400">{{ t('hero.panel.escrowSub') }}</span>
              </div>
              <div class="hero-stat">
                <Wallet class="h-3.5 w-3.5 text-amber-300" />
                <span class="text-sm font-semibold text-white">{{ t('hero.panel.tonTitle') }}</span>
                <span class="text-[11px] text-slate-400">{{ t('hero.panel.tonSub') }}</span>
              </div>
              <div class="hero-stat">
                <Hash class="h-3.5 w-3.5 text-sky-300" />
                <span class="text-sm font-semibold text-white">{{ t('hero.panel.auditTitle') }}</span>
                <span class="text-[11px] text-slate-400">{{ t('hero.panel.auditSub') }}</span>
              </div>
            </div>

            <div class="mt-4 space-y-2.5">
              <div class="hero-row">
                <span class="hero-row-name">@mint</span>
                <span class="hero-row-price">$4,200</span>
              </div>
              <div class="hero-row">
                <span class="hero-row-name">@threadcraft</span>
                <span class="hero-row-price">$1,600</span>
              </div>
              <div class="hero-row">
                <span class="hero-row-name">@dailyalpha</span>
                <span class="hero-row-price">$2,900</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-shell {
  min-height: 58vh;
}

.hero-mask {
  mask-image: linear-gradient(to bottom, black 78%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 78%, transparent 100%);
}

.hero-grid {
  background-image:
    linear-gradient(to right, rgba(147, 197, 253, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(147, 197, 253, 0.07) 1px, transparent 1px);
  background-size: 54px 54px;
}

.hero-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(120px);
  animation: hero-orbit 14s infinite ease-in-out;
}

.hero-orb-a {
  top: -8%;
  left: -6%;
  width: 420px;
  height: 420px;
  background: rgba(42, 171, 238, 0.24);
}

.hero-orb-b {
  right: -10%;
  top: 12%;
  width: 360px;
  height: 360px;
  background: rgba(250, 204, 21, 0.22);
  animation-delay: 2.5s;
}

.hero-orb-c {
  left: 38%;
  bottom: -22%;
  width: 500px;
  height: 500px;
  background: rgba(139, 92, 246, 0.2);
  animation-delay: 5s;
}

.hero-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
  max-width: 720px;
}

.hero-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  border-radius: 0.8rem;
  border: 1px solid transparent;
  padding: 0.64rem 0.72rem;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition: all 0.22s ease;
}

.hero-tab-idle {
  color: #cad7e7;
  background: rgba(12, 24, 38, 0.58);
  border-color: rgba(148, 163, 184, 0.14);
}

.hero-tab-idle:hover {
  color: #fff;
  border-color: rgba(148, 211, 252, 0.35);
}

.hero-tab-active {
  color: #fff;
  background: linear-gradient(120deg, rgba(56, 189, 248, 0.75), rgba(14, 165, 233, 0.9));
  border-color: rgba(186, 230, 253, 0.45);
  box-shadow: 0 16px 30px -22px rgba(56, 189, 248, 0.9);
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 211, 252, 0.24);
  background: rgba(12, 28, 42, 0.7);
  padding: 0.4rem 0.72rem;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #d3ecff;
}

.hero-card {
  box-shadow:
    0 22px 48px -22px rgba(10, 28, 43, 0.95),
    inset 0 1px 0 rgba(186, 230, 253, 0.08);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background: rgba(8, 23, 37, 0.68);
  padding: 0.6rem;
}

.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0.9rem;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: rgba(8, 23, 37, 0.58);
  padding: 0.62rem 0.72rem;
}

.hero-row-name {
  color: #f3fbff;
  font-size: 0.86rem;
  font-weight: 600;
}

.hero-row-price {
  color: #fcd34d;
  font-size: 0.82rem;
  font-weight: 700;
}

.hero-enter {
  opacity: 0;
  transform: translateY(26px);
  animation: hero-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.hero-delay {
  animation-delay: 0.2s;
}

.hero-gradient-sweep {
  background-size: 210% 210%;
  animation: hero-gradient 4.8s ease infinite;
}

@keyframes hero-fade-up {
  from {
    opacity: 0;
    transform: translateY(26px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes hero-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes hero-orbit {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  35% {
    transform: translate3d(26px, -18px, 0) scale(1.06);
  }
  70% {
    transform: translate3d(-18px, 22px, 0) scale(0.94);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@media (max-width: 1023px) {
  .hero-shell {
    min-height: auto;
  }

  .hero-tabs {
    grid-template-columns: 1fr;
  }

  .hero-card {
    max-width: 560px;
    margin-inline: auto;
  }
}
</style>
