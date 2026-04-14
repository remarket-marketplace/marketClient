<script setup lang="ts">
import { Cookie, ShieldCheck } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  COOKIE_SETTINGS_OPEN_EVENT,
  useCookieConsent,
  type CookieConsentPreferences,
} from '@/composables/useCookieConsent'
import { syncMetrikaByAnalyticsConsent } from '@/utils/yandexMetrika'

const { t } = useI18n()

const {
  shouldShowBanner,
  preferences,
  hydrate,
  acceptAll,
  rejectOptional,
  savePreferences,
} = useCookieConsent()

const isPreferencesModalOpen = ref(false)
const draftPreferences = ref<CookieConsentPreferences>({
  necessary: true,
  analytics: false,
  marketing: false,
})

function syncDraftWithSavedPreferences() {
  draftPreferences.value = {
    necessary: true,
    analytics: preferences.value.analytics,
    marketing: preferences.value.marketing,
  }
}

function openPreferences() {
  syncDraftWithSavedPreferences()
  isPreferencesModalOpen.value = true
}

function closePreferences() {
  isPreferencesModalOpen.value = false
}

function acceptAllCookies() {
  acceptAll()
  closePreferences()
}

function rejectOptionalCookies() {
  rejectOptional()
  closePreferences()
}

function saveCookiePreferences() {
  savePreferences({
    necessary: true,
    analytics: draftPreferences.value.analytics,
    marketing: draftPreferences.value.marketing,
  })
  closePreferences()
}

function toggleAnalytics() {
  draftPreferences.value.analytics = !draftPreferences.value.analytics
}

function toggleMarketing() {
  draftPreferences.value.marketing = !draftPreferences.value.marketing
}

function handleOpenSettingsEvent() {
  openPreferences()
}

const showBanner = computed(() => shouldShowBanner.value && !isPreferencesModalOpen.value)

watch(
  preferences,
  () => {
    if (!isPreferencesModalOpen.value) {
      syncDraftWithSavedPreferences()
    }
  },
  { deep: true }
)

watch(
  () => preferences.value.analytics,
  (analyticsEnabled) => {
    syncMetrikaByAnalyticsConsent(analyticsEnabled)
  },
  { immediate: true }
)

onMounted(() => {
  hydrate()
  syncDraftWithSavedPreferences()
  window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettingsEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettingsEvent as EventListener)
})
</script>

<template>
  <Transition name="cookie-banner">
    <aside
      v-if="showBanner"
      class="fixed inset-x-2 bottom-16 z-[150] mx-auto max-w-4xl rounded-2xl border border-white/15 bg-dark-900/95 p-4 text-mainText shadow-[0_20px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl md:bottom-4 md:px-5"
      role="dialog"
      aria-live="polite"
      :aria-label="t('common.cookies.title')"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="min-w-0">
          <div class="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-200">
            <Cookie class="h-3.5 w-3.5" />
            <span>{{ t('common.cookies.title') }}</span>
          </div>
          <p class="text-sm leading-relaxed text-gray-200">
            {{ t('common.cookies.description') }}
            <router-link to="/privacy-policy" class="ml-1 text-blue-300 underline-offset-2 hover:text-blue-200 hover:underline">
              {{ t('common.cookies.privacyLink') }}
            </router-link>
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:border-white/30 hover:bg-white/5"
            @click="rejectOptionalCookies"
          >
            {{ t('common.cookies.rejectOptional') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-blue-400/35 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20"
            @click="openPreferences"
          >
            {{ t('common.cookies.customize') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            @click="acceptAllCookies"
          >
            {{ t('common.cookies.acceptAll') }}
          </button>
        </div>
      </div>
    </aside>
  </Transition>

  <Transition name="cookie-modal">
    <div
      v-if="isPreferencesModalOpen"
      class="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 px-3 py-6"
      role="dialog"
      aria-modal="true"
      :aria-label="t('common.cookies.modalTitle')"
    >
      <div class="w-full max-w-xl rounded-2xl border border-white/15 bg-dark-900 p-4 text-mainText shadow-[0_25px_80px_rgba(0,0,0,0.6)] sm:p-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white">{{ t('common.cookies.modalTitle') }}</h3>
            <p class="mt-1 text-sm text-gray-300">{{ t('common.cookies.modalDescription') }}</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-white/15 px-2 py-1 text-xs text-gray-300 transition hover:border-white/30 hover:text-white"
            @click="closePreferences"
          >
            {{ t('common.close') }}
          </button>
        </div>

        <div class="space-y-2.5">
          <div class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div class="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ t('common.cookies.necessary') }}</p>
                <p class="mt-0.5 text-xs text-gray-400">{{ t('common.cookies.necessaryDescription') }}</p>
              </div>
              <div class="flex justify-end">
                <span class="inline-flex w-[124px] justify-center whitespace-nowrap items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                  <ShieldCheck class="h-3.5 w-3.5" />
                  {{ t('common.cookies.alwaysActive') }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div class="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ t('common.cookies.analytics') }}</p>
                <p class="mt-0.5 text-xs text-gray-400">{{ t('common.cookies.analyticsDescription') }}</p>
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                  :class="draftPreferences.analytics ? 'bg-blue-500' : 'bg-dark-700'"
                  @click="toggleAnalytics"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                    :class="draftPreferences.analytics ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div class="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ t('common.cookies.marketing') }}</p>
                <p class="mt-0.5 text-xs text-gray-400">{{ t('common.cookies.marketingDescription') }}</p>
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                  :class="draftPreferences.marketing ? 'bg-blue-500' : 'bg-dark-700'"
                  @click="toggleMarketing"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                    :class="draftPreferences.marketing ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:border-white/30 hover:bg-white/5"
            @click="rejectOptionalCookies"
          >
            {{ t('common.cookies.rejectOptional') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-blue-400/35 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20"
            @click="acceptAllCookies"
          >
            {{ t('common.cookies.acceptAll') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            @click="saveCookiePreferences"
          >
            {{ t('common.cookies.saveSelection') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner-enter-active,
.cookie-banner-leave-active {
  transition: all 0.2s ease;
}

.cookie-banner-enter-from,
.cookie-banner-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

.cookie-modal-enter-active,
.cookie-modal-leave-active {
  transition: opacity 0.2s ease;
}

.cookie-modal-enter-from,
.cookie-modal-leave-to {
  opacity: 0;
}
</style>
