<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, ChevronUp, Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

interface LanguageOption {
  label: string
  value: 'en' | 'ru'
}

const languageOptions: LanguageOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Русский', value: 'ru' }
]

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const { locale } = useI18n()

const isClient = typeof window !== 'undefined'

const getInitialLanguage = (): 'en' | 'ru' => {
  if (!isClient) return 'en'
  const saved = localStorage.getItem('user-language') as 'en' | 'ru' | null
  if (saved) return saved

  const lang = navigator.language || navigator.languages?.[0]
  return lang?.startsWith('ru') ? 'ru' : 'en'
}

const selectedLanguage = ref<'en' | 'ru'>(getInitialLanguage())

const currentOption = computed(() => {
  return (
    languageOptions.find(opt => opt.value === selectedLanguage.value) ??
    languageOptions[0]
  )
})

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  locale.value = selectedLanguage.value
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

function toggle() {
  isOpen.value = !isOpen.value
}

function selectLanguage(value: 'en' | 'ru') {
  if (selectedLanguage.value === value) return

  selectedLanguage.value = value
  locale.value = value
  if (isClient) {
    localStorage.setItem('user-language', value)
  }
  isOpen.value = false
}
</script>

<template>
  <div ref="wrapperRef" class="relative shrink-0 flex items-center">
    <!-- Button -->
    <button
      type="button"
      class="h-8 min-w-[58px] flex items-center justify-between gap-1.5 rounded-md border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] px-2 py-1 text-mainText transition hover:border-[rgb(var(--palette-dark-500))] focus:outline-none"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="flex items-center gap-1.5 truncate">
        <Languages class="h-3.5 w-3.5 text-mainText/70" />
        <span class="hidden md:block text-xs font-medium">
          {{ currentOption?.value.toUpperCase() }}
        </span>
      </span>

      <ChevronUp v-if="isOpen" class="h-2.5 w-2.5" />
      <ChevronDown v-else class="h-2.5 w-2.5" />
    </button>

    <!-- Dropdown -->
    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute top-full right-0 z-50 mt-1.5 min-w-[58px] rounded-md border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-800))] overflow-hidden"
        role="listbox"
      >
        <li
          v-for="opt in languageOptions"
          :key="opt.value"
          class="cursor-pointer px-3 py-1.5 text-xs transition-colors first:rounded-t-md last:rounded-b-md"
          :class="selectedLanguage === opt.value
            ? 'bg-[rgb(var(--palette-blue-500)/0.1)] text-[var(--text-link)] font-medium'
            : 'text-mainText hover:bg-[rgb(var(--palette-dark-700))]'"
          @click="selectLanguage(opt.value)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
