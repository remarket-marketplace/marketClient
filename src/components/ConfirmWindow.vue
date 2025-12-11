<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

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

const isClicked = ref<boolean>(false)

function handleConfirm() {
  isClicked.value = !isClicked.value
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && _props.isOpen) {
    emit('cancel')
  }
}

watch(() => _props.isOpen, (newVal) => {
    if (newVal) {
        document.body.classList.add('modal-open')
    } else {
        document.body.classList.remove('modal-open')
    }
}, { immediate: true })

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => { 
    document.removeEventListener('keydown', handleEsc)
    document.body.classList.remove('modal-open') 
})
</script>

<template>
  <div
    v-if="_props.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-85 transition-all duration-300 ease-out"
    :class="{ 'opacity-100': _props.isOpen, 'opacity-0': !_props.isOpen }"
    @click.self="handleCancel" >
    <div class="mx-4 max-w-md w-full rounded-xl bg-dark-800 p-6 shadow-xl md:max-w-lg md:p-8 focus:outline-none">
      <p class="mb-6 text-base text-gray-300 leading-6">
        {{ message }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          class="rounded bg-gray-700 px-4 py-2 text-mainText transition duration-200 ease-in-out disabled:cursor-not-allowed active:bg-gray-500 hover:bg-gray-600 disabled:opacity-50"
          @click="handleCancel"
        >
          {{ _props.cancelText ?? t('common.cancel') }}
        </button>
        <button
          class="rounded bg-blue-600 px-4 py-2 text-mainText transition duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="_props.isLoading"
          @click="handleConfirm"
        >
          <svg v-if="_props.isLoading" class="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          </svg>
          <template v-if="_props.isLoading">
             {{ t('common.loading') }} 
          </template>
          <template v-else>
             {{ _props.confirmText ?? t('common.confirm') }}
          </template>
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