<script setup lang="ts">
const _props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'searchChange': [value: string]
}>()

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('searchChange', value)
}
</script>

<template>
  <div class="w-full rounded-lg">
    <div class="relative">
      <svg
        class="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>

      <input
        :value="modelValue"
        type="text"
        class="w-full min-h-[44px] border border-dark-200 rounded-md bg-background py-2 pl-10 pr-3 text-sm text-mainText focus:outline-none placeholder-gray-400"
        :placeholder="placeholder"
        @input="onInput"
      >
    </div>
  </div>
</template>
