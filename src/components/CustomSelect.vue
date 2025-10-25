<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Option {
  label: string
  value: string | number
}

const props = defineProps<{
  modelValue: string | number | null
  options: Option[]
  placeholder?: string
  label?: string
  disabled?: boolean
  required?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const { t } = useI18n()

// Состояния
const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

// Закрытие при клике вне
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function toggle() {
  if (!props.disabled)
    isOpen.value = !isOpen.value
}

function selectOption(value: string | number) {
  emit('update:modelValue', value)
  isOpen.value = false
}
</script>

<template>
  <div ref="wrapperRef" class="relative w-full">
    <label v-if="label" class="mb-2 block text-sm text-gray-300">{{ label }}</label>
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 bg-dark-600 border border-dark-700 rounded-lg px-4 py-2 text-mainText transition disabled:opacity-50 focus:outline-none"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="truncate text-left">
        <template v-if="modelValue">
          {{ options.find(opt => opt.value === modelValue)?.label }}
        </template>
        <template v-else>
          <span class="text-gray-400">{{ placeholder ?? t('common.select') }}</span>
        </template>
      </span>

      <Icon
        :icon="isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'"
        class="h-5 w-5 text-gray-300"
      />
    </button>

    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute z-50 mt-2 max-h-56 w-full overflow-auto border border-dark-700 rounded-lg bg-dark-800 py-1 shadow-lg"
        role="listbox"
        tabindex="-1"
      >
        <li
          v-if="!options.length"
          class="select-none px-4 py-2 text-sm text-gray-400"
        >
          {{ $t('common.noOptions') }}
        </li>

        <li
          v-for="opt in options"
          :key="opt.value"
          class="flex cursor-pointer items-center justify-between px-4 py-2 text-sm text-mainText hover:bg-dark-700"
          :class="{ 'bg-dark-700': modelValue === opt.value }"
          @click="selectOption(opt.value)"
        >
          <span class="truncate">{{ opt.label }}</span>
          <span v-if="modelValue === opt.value" class="text-xs text-blue-400 font-semibold">✓</span>
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