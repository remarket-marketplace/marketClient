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
const dropdownRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const dropdownStyle = ref<Record<string, string>>({
  left: '-9999px',
  top: '-9999px',
})
const dropdownPlacement = ref<'top' | 'bottom'>('bottom')

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
  const clickedInsideWrapper = wrapperRef.value?.contains(target) ?? false
  const clickedInsideDropdown = dropdownRef.value?.contains(target) ?? false

  if (!clickedInsideWrapper && !clickedInsideDropdown) {
    closeDropdown()
  }
}

function updateDropdownPosition() {
  if (!isOpen.value || !wrapperRef.value) return

  const rect = wrapperRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const spacing = 8
  const estimatedHeight = props.searchable ? 280 : 232
  const spaceBelow = viewportHeight - rect.bottom - spacing
  const spaceAbove = rect.top - spacing
  const openAbove = spaceBelow < Math.min(estimatedHeight, 220) && spaceAbove > spaceBelow
  const availableHeight = Math.max(160, openAbove ? spaceAbove : spaceBelow)
  const width = Math.min(rect.width, viewportWidth - spacing * 2)
  const left = Math.min(Math.max(rect.left, spacing), viewportWidth - width - spacing)

  dropdownPlacement.value = openAbove ? 'top' : 'bottom'
  dropdownStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${Math.min(availableHeight, 320)}px`,
    top: openAbove ? 'auto' : `${rect.bottom + spacing}px`,
    bottom: openAbove ? `${viewportHeight - rect.top + spacing}px` : 'auto',
  }
}

function bindDropdownPositioning() {
  window.addEventListener('resize', updateDropdownPosition)
  document.addEventListener('scroll', updateDropdownPosition, true)
}

function unbindDropdownPositioning() {
  window.removeEventListener('resize', updateDropdownPosition)
  document.removeEventListener('scroll', updateDropdownPosition, true)
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  unbindDropdownPositioning()
})

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
  if (!opened) {
    unbindDropdownPositioning()
    return
  }

  await nextTick()
  updateDropdownPosition()
  bindDropdownPositioning()

  if (!props.searchable) return

  searchInputRef.value?.focus()
})
</script>

<template>
  <div ref="wrapperRef" class="relative w-full">
    <label v-if="label" class="mb-2 block text-sm text-[var(--text-body)]">{{ label }}</label>
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 bg-[rgb(var(--palette-dark-600))] border border-[rgb(var(--palette-dark-700))] rounded-lg px-4 py-2 text-mainText transition disabled:opacity-50 focus:outline-none"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="min-w-0 flex-1 flex items-center gap-2 text-left">
        <template v-if="selectedOption">
          <img
            v-if="selectedOption.imageUrl"
            :src="selectedOption.imageUrl"
            :alt="selectedOption.label"
            class="h-5 w-5 rounded object-cover border border-[rgb(var(--palette-dark-700)/0.8)] shrink-0"
            loading="lazy"
          />
          <span class="truncate">{{ selectedOption.label }}</span>
        </template>
        <template v-else>
          <span class="text-[var(--text-muted)] truncate">{{ placeholder ?? t('common.select') }}</span>
        </template>
      </span>

      <ChevronUp v-if="isOpen" class="h-3 w-3" />
      <ChevronDown v-else class="h-3 w-3" />
    </button>

    <Teleport to="body">
      <transition name="fade">
        <ul
          v-show="isOpen"
          ref="dropdownRef"
          class="custom-select-dropdown fixed z-[180] overflow-auto rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-800)/0.96)] py-1 backdrop-blur-xl"
          :class="dropdownPlacement === 'top' ? 'origin-bottom' : 'origin-top'"
          :style="dropdownStyle"
          role="listbox"
          tabindex="-1"
        >
          <li v-if="searchable" class="px-2 pb-1">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="w-full rounded-md border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700))] px-3 py-2 text-sm text-mainText outline-none placeholder-[var(--text-placeholder)]"
              :placeholder="searchPlaceholder ?? t('common.search')"
              @click.stop
            />
          </li>

          <li
            v-if="!filteredOptions.length"
            class="select-none px-4 py-2 text-sm text-[var(--text-muted)]"
          >
            {{ $t('common.noOptions') }}
          </li>

          <li
            v-for="opt in filteredOptions"
            :key="opt.value"
            class="flex cursor-pointer items-center justify-between px-4 py-2 text-sm text-mainText hover:bg-[rgb(var(--palette-dark-700))]"
            :class="{ 'bg-[rgb(var(--palette-dark-700))]': modelValue === opt.value }"
            @click="selectOption(opt.value)"
          >
            <span class="min-w-0 flex-1 flex items-center gap-2">
              <img
                v-if="opt.imageUrl"
                :src="opt.imageUrl"
                :alt="opt.label"
                class="h-5 w-5 rounded object-cover border border-[rgb(var(--palette-dark-700)/0.8)] shrink-0"
                loading="lazy"
              />
              <span class="truncate">{{ opt.label }}</span>
            </span>
            <span v-if="modelValue === opt.value" class="text-xs text-[var(--text-link)] font-semibold">✓</span>
          </li>
        </ul>
      </transition>
    </Teleport>
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

.custom-select-dropdown {
  box-shadow: 0 24px 80px rgb(var(--palette-black) / 0.58);
}
</style>
