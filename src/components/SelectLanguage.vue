<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'

interface LanguageOption {
  label: string
  value: 'en' | 'ru'
  flag?: string
}

const languageOptions: LanguageOption[] = [
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'Русский', value: 'ru', flag: '🇷🇺' }
]

// Состояния
const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

const getInitialLanguage = (): 'en' | 'ru' => {
  const saved = localStorage.getItem('user-language') as 'en' | 'ru' | null
  return saved || 'en'
}

const selectedLanguage = ref(getInitialLanguage())

const currentOption = computed(() => 
  languageOptions.find(opt => opt.value === selectedLanguage.value) || languageOptions[0]
)

// Закрытие при клике вне
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function toggle() {
  isOpen.value = !isOpen.value
}

function selectLanguage(value: 'en' | 'ru') {
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
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 bg-dark-600 border border-dark-700 rounded-lg px-2 lg:px-4 py-2 text-mainText transition focus:outline-none hover:border-dark-500"
      :aria-expanded="isOpen"
    @click="toggle"
    >
      <span class="flex items-center gap-2 truncate text-left">
        <span v-if="currentOption?.flag" class="text-base">{{ currentOption.flag }}</span>
        <span class="hidden lg:block">{{ currentOption?.label ?? 'Select Language' }}</span>
      </span>

      <Icon
        :icon="isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'"
        class="h-5 w-5 text-gray-300"
      />
    </button>

    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute right-2 z-50 mt-2 w-[max-content] overflow-auto border border-dark-700 rounded-lg bg-dark-800 py-1 shadow-lg"
        role="listbox"
        tabindex="-1"
      >
        <li
          v-for="opt in languageOptions"
          :key="opt.value"
          class="flex cursor-pointer items-center justify-between px-4 py-2 text-sm text-mainText hover:bg-dark-700 transition-colors"
          :class="{ 'bg-dark-700': selectedLanguage === opt.value }"
          @click="selectLanguage(opt.value)"
        >
          <span class="flex items-center gap-2">
            <span v-if="opt.flag" class="text-base">{{ opt.flag }}</span>
            <span>{{ opt.label }}</span>
          </span>
          <span v-if="selectedLanguage === opt.value" class="text-xs text-blue-400 font-semibold pl-3">✓</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.12s ease;
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