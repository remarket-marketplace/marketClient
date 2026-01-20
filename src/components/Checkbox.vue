<script setup lang="ts">
import { Check } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <button
    type="button"
    :disabled="props.disabled"
    @click="toggle"
    class="w-5 h-5 flex items-center justify-center rounded border transition-all duration-200"
    :class="[
      props.disabled
        ? 'bg-dark-700 border-dark-600 cursor-not-allowed'
        : props.modelValue
          ? 'bg-blue-600 border-blue-600 hover:bg-blue-700 cursor-pointer'
          : 'bg-dark-600 border-dark-700 hover:border-blue-500 cursor-pointer'
    ]"
    :aria-checked="props.modelValue"
    role="checkbox"
  >
    <Check
      v-if="props.modelValue"
      class="w-3.5 h-3.5 text-white"
      :class="props.disabled ? 'opacity-50' : ''"
    />
  </button>
</template>