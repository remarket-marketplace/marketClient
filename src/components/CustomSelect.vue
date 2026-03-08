<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

interface Option {
  label: string
  value: string | number
  imageUrl?: string | null
}

const props = defineProps<{
  modelValue: string | number | null
  options: Option[]
  placeholder?: string
  label?: string
  disabled?: boolean
  required?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
}>()

const { t } = useI18n()

// Состояния
const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

const filteredOptions = computed(() => {
  if (!props.searchable) return props.options

  const normalizedQuery = searchQuery.value.trim().toLowerCase()
  if (!normalizedQuery) return props.options

  return props.options.filter(option => option.label.toLowerCase().includes(normalizedQuery))
})

const selectedOption = computed(() => (
  props.options.find(opt => opt.value === props.modelValue) ?? null
))

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

// Закрытие при клике вне
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function toggle() {
  if (props.disabled) return

  if (isOpen.value) {
    closeDropdown()
    return
  }

  isOpen.value = true
}

function selectOption(value: string | number) {
  emit('update:modelValue', value)
  closeDropdown()
}

watch(isOpen, async (opened) => {
  if (!opened || !props.searchable) return

  await nextTick()
  searchInputRef.value?.focus()
})
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
      <span class="min-w-0 flex-1 flex items-center gap-2 text-left">
        <template v-if="modelValue !== null && modelValue !== '' && selectedOption">
          <img
            v-if="selectedOption.imageUrl"
            :src="selectedOption.imageUrl"
            :alt="selectedOption.label"
            class="h-5 w-5 rounded object-cover border border-dark-700/80 shrink-0"
            loading="lazy"
          />
          <span class="truncate">{{ selectedOption.label }}</span>
        </template>
        <template v-else>
          <span class="text-gray-400 truncate">{{ placeholder ?? t('common.select') }}</span>
        </template>
      </span>

      <ChevronUp v-if="isOpen" class="h-3 w-3" />
      <ChevronDown v-else class="h-3 w-3" />
    </button>

    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute z-50 mt-2 max-h-56 w-full overflow-auto border border-dark-700 rounded-lg bg-dark-800 py-1 shadow-lg"
        role="listbox"
        tabindex="-1"
      >
        <li v-if="searchable" class="px-2 pb-1">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="w-full rounded-md border border-dark-700 bg-dark-700 px-3 py-2 text-sm text-mainText outline-none placeholder-gray-400"
            :placeholder="searchPlaceholder ?? t('common.search')"
            @click.stop
          />
        </li>

        <li
          v-if="!filteredOptions.length"
          class="select-none px-4 py-2 text-sm text-gray-400"
        >
          {{ $t('common.noOptions') }}
        </li>

        <li
          v-for="opt in filteredOptions"
          :key="opt.value"
          class="flex cursor-pointer items-center justify-between px-4 py-2 text-sm text-mainText hover:bg-dark-700"
          :class="{ 'bg-dark-700': modelValue === opt.value }"
          @click="selectOption(opt.value)"
        >
          <span class="min-w-0 flex-1 flex items-center gap-2">
            <img
              v-if="opt.imageUrl"
              :src="opt.imageUrl"
              :alt="opt.label"
              class="h-5 w-5 rounded object-cover border border-dark-700/80 shrink-0"
              loading="lazy"
            />
            <span class="truncate">{{ opt.label }}</span>
          </span>
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
