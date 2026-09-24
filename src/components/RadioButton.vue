<script setup lang="ts">
interface Props {
  modelValue: string
  value: string
  name: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onChange() {
  if (!props.disabled) {
    emit('update:modelValue', props.value)
  }
}
</script>

<template>
  <label
    class="inline-flex items-center cursor-pointer select-none gap-2"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
  >
    <!-- Настоящий radio -->
    <input
      type="radio"
      class="sr-only"
      :name="name"
      :value="value"
      :checked="modelValue === value"
      :disabled="disabled"
      @change="onChange"
    />

    <!-- Кастомный UI -->
    <span
      class="w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
             focus-within:ring-2 focus-within:ring-[rgb(var(--palette-blue-500))] focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--palette-dark-600))]"
      :class="[
        disabled
          ? 'bg-[rgb(var(--palette-dark-700))] border-[rgb(var(--palette-dark-600))]'
          : modelValue === value
            ? 'border-[rgb(var(--palette-blue-600))]'
            : 'bg-[rgb(var(--palette-dark-600))] border-[rgb(var(--palette-dark-700))] hover:border-[rgb(var(--palette-blue-500))]'
      ]"
    >
      <span
        v-if="modelValue === value"
        class="w-2.5 h-2.5 rounded-full bg-[rgb(var(--palette-blue-600))]"
      />
    </span>

    <!-- Текст -->
    <slot />
  </label>
</template>
