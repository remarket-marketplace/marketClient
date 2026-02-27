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
      class="min-w-[86px] flex items-center justify-between gap-2 rounded-lg border border-dark-700 bg-dark-600 px-3 lg:px-4 py-2 text-mainText transition hover:border-dark-500 focus:outline-none"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="flex items-center gap-2 truncate">
        <Languages class="h-4 w-4 text-mainText/70" />
        <span class="hidden lg:block">
          {{ currentOption?.label }}
        </span>
      </span>

      <ChevronUp v-if="isOpen" class="h-3 w-3" />
      <ChevronDown v-else class="h-3 w-3" />
    </button>

    <!-- Dropdown -->
    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute top-full right-0 z-50 mt-1.5 min-w-16 rounded-lg border border-dark-700 bg-dark-800 overflow-hidden"
        role="listbox"
      >
        <li
          v-for="opt in languageOptions"
          :key="opt.value"
          class="cursor-pointer px-4 py-2 text-sm transition-colors
                 first:rounded-t-lg last:rounded-b-lg"
          :class="selectedLanguage === opt.value
            ? 'bg-blue-500/10 text-blue-400 font-medium'
            : 'text-mainText hover:bg-dark-700'"
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
