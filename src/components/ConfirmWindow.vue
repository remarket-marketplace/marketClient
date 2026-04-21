<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/AppModal.vue'

const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  allowOverflowVisible?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  if (props.isLoading) return
  emit('confirm')
}

function handleCancel() {
  if (props.isLoading) return
  emit('cancel')
}
</script>

<template>
  <AppModal
    :is-open="props.isOpen"
    :title="props.title"
    :description="props.message"
    size="sm"
    :dismissible="!props.isLoading"
    :allow-overflow-visible="props.allowOverflowVisible"
    body-class="space-y-4"
    footer-class="pt-0"
    @cancel="handleCancel"
  >
    <slot name="body"></slot>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-5 py-3 text-sm font-medium text-[rgb(var(--palette-gray-200))] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[rgb(var(--palette-white))] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-6"
          :disabled="props.isLoading"
          @click="handleCancel"
        >
          {{ props.cancelText ?? t('common.cancel') }}
        </button>
        <button
          class="market-primary-surface market-primary-hover inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-semibold text-[rgb(var(--palette-white))] transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-6"
          :disabled="props.isLoading"
          @click="handleConfirm"
        >
          <svg
            v-if="props.isLoading"
            class="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ props.confirmText ?? t('common.confirm') }}</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>
