<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, ChevronUp, Coins } from 'lucide-vue-next'
import {
  type CurrencyCode,
  preferredCurrency,
  setPreferredCurrency,
} from '@/utils/currency'

interface CurrencyOption {
  label: string
  value: CurrencyCode
}

const currencyOptions: CurrencyOption[] = [
  { label: 'USD', value: 'USD' },
  { label: 'RUB', value: 'RUB' },
]
const fallbackCurrencyOption: CurrencyOption = { label: 'USD', value: 'USD' }

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const selectedCurrency = preferredCurrency

const currentOption = computed<CurrencyOption>(() => {
  return (
    currencyOptions.find((opt) => opt.value === selectedCurrency.value) ??
    fallbackCurrencyOption
  )
})

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    isOpen.value = false
  }
}

function toggle() {
  isOpen.value = !isOpen.value
}

function selectCurrency(value: CurrencyCode) {
  if (selectedCurrency.value === value) return
  setPreferredCurrency(value)
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="wrapperRef" class="relative shrink-0 flex items-center">
    <button
      type="button"
      class="h-8 min-w-[58px] flex items-center justify-between gap-1.5 rounded-md border border-dark-700 bg-dark-600 px-2 py-1 text-mainText transition hover:border-dark-500 focus:outline-none"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="flex items-center gap-1.5 truncate">
        <Coins class="h-3.5 w-3.5 text-mainText/70" />
        <span class="hidden md:block text-xs font-medium">{{ currentOption.label }}</span>
      </span>

      <ChevronUp v-if="isOpen" class="h-2.5 w-2.5" />
      <ChevronDown v-else class="h-2.5 w-2.5" />
    </button>

    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute top-full right-0 z-50 mt-1.5 min-w-[58px] rounded-md border border-dark-700 bg-dark-800 overflow-hidden"
        role="listbox"
      >
        <li
          v-for="opt in currencyOptions"
          :key="opt.value"
          class="cursor-pointer px-3 py-1.5 text-xs transition-colors first:rounded-t-md last:rounded-b-md"
          :class="selectedCurrency === opt.value
            ? 'bg-blue-500/10 text-blue-400 font-medium'
            : 'text-mainText hover:bg-dark-700'"
          @click="selectCurrency(opt.value)"
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
