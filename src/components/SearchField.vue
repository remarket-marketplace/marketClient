<script setup lang="ts">
import { Search } from 'lucide-vue-next';

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
      <Search class="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2"/>

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
