<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, ChevronUp, Languages, Check } from 'lucide-vue-next'

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

const getInitialLanguage = (): 'en' | 'ru' => {
  const saved = localStorage.getItem('user-language') as 'en' | 'ru' | null
  if (saved) return saved
  
  // Detect system language
  const lang = navigator.language || (navigator.languages && navigator.languages[0])
  if (lang && lang.startsWith('ru')) return 'ru'
  return 'en'
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
  localStorage.setItem('user-language', value)
  isOpen.value = false

  setTimeout(() => {
    location.reload()
  }, 100)
}
</script>

<template>
  <div ref="wrapperRef" class="relative w-full">
    <!-- Button -->
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 bg-dark-600 border border-dark-700 rounded-lg px-2 lg:px-4 py-2 text-mainText transition hover:border-dark-500 focus:outline-none"
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
        class="absolute right-2 z-50 mt-2 w-max rounded-lg border border-dark-700 bg-dark-800 py-1 shadow-lg"
        role="listbox"
      >
        <li
          v-for="opt in languageOptions"
          :key="opt.value"
          class="flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm text-mainText transition-colors hover:bg-dark-700"
          :class="{ 'bg-dark-700': selectedLanguage === opt.value }"
          @click="selectLanguage(opt.value)"
        >
          <span>{{ opt.label }}</span>

          <Check
            v-if="selectedLanguage === opt.value"
            class="h-4 w-4 text-blue-400"
          />
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
