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

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const optionRefs = ref<Array<HTMLElement | null>>([])

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
  highlightedIndex.value = -1
  optionRefs.value = []
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function setOptionRef(el: HTMLElement | null, index: number) {
  optionRefs.value[index] = el
}

function ensureHighlightedVisible() {
  const index = highlightedIndex.value
  if (index < 0) return
  optionRefs.value[index]?.scrollIntoView({ block: 'nearest' })
}

function moveHighlight(direction: 1 | -1) {
  const total = filteredOptions.value.length
  if (!total) {
    highlightedIndex.value = -1
    return
  }

  const current = highlightedIndex.value < 0 ? 0 : highlightedIndex.value
  highlightedIndex.value = (current + direction + total) % total
  nextTick(ensureHighlightedVisible)
}

function selectOption(value: string | number) {
  emit('update:modelValue', value)
  closeDropdown()
}

function selectHighlightedOption() {
  if (highlightedIndex.value < 0) return
  const option = filteredOptions.value[highlightedIndex.value]
  if (!option) return
  selectOption(option.value)
}

function toggle() {
  if (props.disabled) return

  if (isOpen.value) {
    closeDropdown()
    return
  }

  isOpen.value = true
  const selectedIndex = filteredOptions.value.findIndex(opt => opt.value === props.modelValue)
  highlightedIndex.value = selectedIndex >= 0 ? selectedIndex : (filteredOptions.value.length ? 0 : -1)
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  if (!isOpen.value) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    selectHighlightedOption()
  }
}

watch(isOpen, async (opened) => {
  if (!opened || !props.searchable) return

  await nextTick()
  searchInputRef.value?.focus()
})

watch(searchQuery, async () => {
  if (!isOpen.value) return
  const selectedIndex = filteredOptions.value.findIndex(opt => opt.value === props.modelValue)
  highlightedIndex.value = selectedIndex >= 0 ? selectedIndex : (filteredOptions.value.length ? 0 : -1)
  await nextTick()
  ensureHighlightedVisible()
})
</script>

<template>
  <div ref="wrapperRef" class="relative w-full" @keydown="handleKeydown">
    <label v-if="label" class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400/80">
      {{ label }}
    </label>

    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-dark-700/70 px-3 py-2 text-mainText shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-md transition duration-200 disabled:opacity-50 focus:outline-none focus:border-white/20"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="min-w-0 flex-1 flex items-center gap-2 text-left">
        <template v-if="selectedOption">
          <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-dark-800/80">
            <img
              v-if="selectedOption.imageUrl"
              :src="selectedOption.imageUrl"
              :alt="selectedOption.label"
              class="h-5 w-5 rounded object-cover"
              loading="lazy"
            />
            <span v-else class="h-2 w-2 rounded-full bg-emerald-300/80" />
          </span>
          <span class="truncate">{{ selectedOption.label }}</span>
        </template>
        <template v-else>
          <span class="truncate text-gray-400">{{ placeholder ?? t('common.select') }}</span>
        </template>
      </span>

      <ChevronUp v-if="isOpen" class="h-4 w-4 text-gray-300" />
      <ChevronDown v-else class="h-4 w-4 text-gray-300" />
    </button>

    <transition name="fade">
      <ul
        v-show="isOpen"
        class="absolute z-50 mt-2 max-h-[300px] w-full overflow-auto rounded-xl border border-white/10 bg-[rgba(20,20,30,0.72)] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.36)] backdrop-blur-xl"
        role="listbox"
        tabindex="-1"
      >
        <li v-if="searchable" class="px-1 pb-1.5">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="w-full rounded-lg border border-white/10 bg-dark-800/80 px-2.5 py-1.5 text-sm text-mainText outline-none placeholder-gray-400/80"
            :placeholder="searchPlaceholder ?? t('common.search')"
            @click.stop
          />
        </li>

        <li
          v-if="!filteredOptions.length"
          class="select-none px-3 py-2 text-sm text-gray-400"
        >
          {{ $t('common.noOptions') }}
        </li>

        <li
          v-for="(opt, index) in filteredOptions"
          :key="opt.value"
          :ref="(el) => setOptionRef(el as HTMLElement | null, index)"
          class="flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-sm text-mainText transition duration-200"
          :class="{
            'bg-emerald-400/15 text-white': modelValue === opt.value,
            'bg-white/10': highlightedIndex === index && modelValue !== opt.value,
            'hover:bg-white/8': modelValue !== opt.value,
          }"
          @mouseenter="highlightedIndex = index"
          @click="selectOption(opt.value)"
        >
          <span class="min-w-0 flex-1 flex items-center gap-2">
            <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-dark-800/70">
              <img
                v-if="opt.imageUrl"
                :src="opt.imageUrl"
                :alt="opt.label"
                class="h-5 w-5 rounded object-cover"
                loading="lazy"
              />
              <span v-else class="h-2 w-2 rounded-full bg-gray-300/80" />
            </span>
            <span class="truncate">{{ opt.label }}</span>
          </span>
          <span v-if="modelValue === opt.value" class="text-xs font-semibold text-emerald-300">✓</span>
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
