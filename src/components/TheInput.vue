<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minlength?: number
  inputmode?: 'text' | 'search' | 'email' | 'tel' | 'url' | 'none' | 'numeric' | 'decimal'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  minlength: undefined,
  inputmode: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:modelValue', target?.value ?? '')
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:modelValue', target?.value ?? '')
}

// Проксируем фокус для возможности фокусировки извне
defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<template>
  <div class="relative w-full">
    <!-- Основной инпут -->
    <input
      ref="inputRef"
      :value="props.modelValue"
      @input="onInput"
      @change="onChange"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :minlength="minlength"
      :inputmode="inputmode"
      class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-mainText transition-all duration-200 outline-none placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="{
        'pr-12': $slots.append
      }"
      v-bind="$attrs"
    >

    <!-- Слот для дополнительного контента справа (иконки, кнопки) -->
    <div v-if="$slots.append" class="absolute right-0 top-0 h-full flex items-center pr-3">
      <slot name="append" />
    </div>
  </div>
</template>
