<script setup lang="ts">
import { defineEmits, defineProps, onMounted, ref } from 'vue'

const _props = defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isModalOpen = ref(_props.isOpen)
const isClicked = ref<boolean>(false)

function handleConfirm() {
  isClicked.value = !isClicked.value
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && isModalOpen.value) {
    emit('cancel')
  }
}

onMounted(() => {
  isModalOpen.value = _props.isOpen
  document.body.classList.add('modal-open')
  document.addEventListener('keydown', handleEsc)

  return () => {
    document.removeEventListener('keydown', handleEsc)
    document.body.classList.remove('modal-open')
  }
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-dark-900 bg-opacity-50 transition-all duration-300 ease-out"
    :class="{ 'opacity-100': isOpen, 'opacity-0': !isOpen }"
  >
    <div class="mx-4 max-w-md w-full rounded-xl bg-dark-800 p-6 shadow-xl md:max-w-lg md:p-8 focus:outline-none">
      <h3 class="mb-4 flex items-center text-2xl text-mainText font-semibold">
        <svg class="mr-2 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v.01M12 21v0" />
        </svg>
        {{ title }}
      </h3>
      <p class="mb-6 text-base text-gray-300 leading-6">
        {{ message }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          class="rounded bg-gray-700 px-4 py-2 text-mainText transition duration-200 ease-in-out disabled:cursor-not-allowed active:bg-gray-500 hover:bg-gray-600 disabled:opacity-50"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          class="rounded bg-red-600 px-4 py-2 text-mainText transition duration-200 ease-in-out disabled:cursor-not-allowed active:bg-red-500 hover:bg-red-700 disabled:opacity-50"
          :disabled="isLoading"
          @click="handleConfirm"
        >
          <svg v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          </svg>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-open {
  overflow: hidden;
}
</style>
