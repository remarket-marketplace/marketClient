<script setup lang="ts">
import { Check } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle(event: KeyboardEvent | MouseEvent) {
  event.preventDefault()
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

const iconSizeClasses = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
}
</script>

<template>
  <div
    role="checkbox"
    :aria-checked="modelValue"
    :aria-disabled="disabled"
    tabindex="0"
    class="inline-flex items-center cursor-pointer select-none outline-none"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    @click="toggle"
    @keydown.space.prevent="toggle"
    @keydown.enter.prevent="toggle"
  >
    <span
      :class="[
        sizeClasses[size],
        'flex items-center justify-center rounded border transition-all duration-200',
        disabled
          ? 'bg-[rgb(var(--palette-dark-700))] border-[rgb(var(--palette-dark-600))]'
          : modelValue
            ? 'bg-[rgb(var(--palette-blue-600))] border-[rgb(var(--palette-blue-600))]'
            : 'bg-[rgb(var(--palette-dark-600))] border-[rgb(var(--palette-dark-700))] hover:border-[rgb(var(--palette-blue-500))]'
      ]"
    >
      <Check 
        v-if="modelValue" 
        :class="iconSizeClasses[size]" 
        class="text-[rgb(var(--palette-white))] stroke-[3]"
      />
    </span>
  </div>
</template>
