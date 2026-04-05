<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Coins, Languages, SlidersHorizontal } from 'lucide-vue-next'
import {
  type CurrencyCode,
  preferredCurrency,
  setPreferredCurrency,
} from '@/utils/currency'

type LanguageCode = 'en' | 'ru'

const { t, locale } = useI18n()
const route = useRoute()
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const languageOptions = computed(() => [
  { label: 'English', value: 'en' as LanguageCode },
  { label: 'Русский', value: 'ru' as LanguageCode },
])

const currencyOptions = [
  { label: 'USD', value: 'USD' as CurrencyCode },
  { label: 'RUB', value: 'RUB' as CurrencyCode },
]

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function selectLanguage(value: LanguageCode) {
  if (locale.value === value) return

  locale.value = value
  if (typeof window !== 'undefined') {
    localStorage.setItem('user-language', value)
  }
}

function selectCurrency(value: CurrencyCode) {
  if (preferredCurrency.value === value) return
  setPreferredCurrency(value)
}

function handleOutsideClick(event: MouseEvent) {
  if (!isOpen.value || !rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  closeMenu()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="relative flex h-8 w-8 items-center justify-center rounded-md border border-dark-700 bg-dark-600 text-mainText transition hover:border-dark-500 focus:outline-none"
      :aria-expanded="isOpen"
      :aria-label="t('common.settings')"
      @click="toggleMenu"
    >
      <SlidersHorizontal class="h-3.5 w-3.5 text-mainText/70" />
    </button>

    <transition
      enter-active-class="transition duration-120 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-dark-700 bg-dark-900/98 p-4 shadow-2xl backdrop-blur md:absolute md:left-auto md:right-0 md:top-10 md:w-[320px]"
      >
        <div class="space-y-4">
          <div>
            <p class="text-sm font-semibold text-white">{{ t('common.settings') }}</p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <Languages class="h-3.5 w-3.5" />
              <span>{{ t('common.language') }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in languageOptions"
                :key="option.value"
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                :class="locale === option.value
                  ? 'border-blue-500/50 bg-blue-600 text-white'
                  : 'border-dark-600 bg-dark-700/50 text-gray-300 hover:border-dark-500 hover:bg-dark-700'"
                @click="selectLanguage(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <Coins class="h-3.5 w-3.5" />
              <span>{{ t('common.currency') }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in currencyOptions"
                :key="option.value"
                type="button"
                class="inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                :class="preferredCurrency === option.value
                  ? 'border-blue-500/50 bg-blue-600 text-white'
                  : 'border-dark-600 bg-dark-700/50 text-gray-300 hover:border-dark-500 hover:bg-dark-700'"
                @click="selectCurrency(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
