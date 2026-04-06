<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const { t } = useI18n()

const _props = defineProps<{
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

const MODAL_OPEN_CLASS = 'modal-open'
let scrollLockCount = 0
let lockedScrollY = 0

function lockPageScroll() {
  if (typeof document === 'undefined') return
  if (scrollLockCount === 0) {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0
    document.documentElement.classList.add(MODAL_OPEN_CLASS)
    document.body.classList.add(MODAL_OPEN_CLASS)
    document.body.style.top = `-${lockedScrollY}px`
  }
  scrollLockCount += 1
}

function unlockPageScroll() {
  if (typeof document === 'undefined' || scrollLockCount === 0) return
  scrollLockCount -= 1
  if (scrollLockCount > 0) return

  const offsetTop = document.body.style.top
  document.documentElement.classList.remove(MODAL_OPEN_CLASS)
  document.body.classList.remove(MODAL_OPEN_CLASS)
  document.body.style.top = ''

  const restoredScrollY = Number.parseInt(offsetTop || '0', 10)
  window.scrollTo({
    top: Number.isFinite(restoredScrollY) ? Math.abs(restoredScrollY) : lockedScrollY,
    left: 0,
    behavior: 'auto',
  })
}

const isScrollLockedByThisModal = ref(false)

function handleConfirm() {
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

function lockIfNeeded() {
  if (isScrollLockedByThisModal.value) return
  lockPageScroll()
  isScrollLockedByThisModal.value = true
}

function unlockIfNeeded() {
  if (!isScrollLockedByThisModal.value) return
  unlockPageScroll()
  isScrollLockedByThisModal.value = false
}

watch(
  () => _props.isOpen,
  (isOpen) => {
    if (isOpen) {
      lockIfNeeded()
      return
    }
    unlockIfNeeded()
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => { 
  document.removeEventListener('keydown', handleEsc)
  unlockIfNeeded()
})
</script>

<template>
  <div
    v-if="_props.isOpen"
    class="confirm-window-overlay app-modal-overlay z-[100] transition-opacity duration-200"
    :class="{ 'opacity-100': _props.isOpen, 'opacity-0': !_props.isOpen }"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50"
      @click="handleCancel"
    />

    <div class="confirm-window-shell relative z-10 flex w-full justify-center">
      <div
        class="confirm-window app-modal-panel relative flex w-full max-w-md flex-col rounded-xl border border-dark-700 bg-dark-800 shadow-2xl"
        :class="_props.allowOverflowVisible ? 'overflow-visible' : 'overflow-hidden'"
      >
        <!-- Header -->
        <div class="shrink-0 border-b border-dark-700 px-6 py-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">
              {{ title }}
            </h3>
            <button
              @click="handleCancel"
              class="p-1 text-gray-400 hover:text-gray-300 rounded-full transition-colors duration-150"
              aria-label="Close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Message -->
        <div
          class="confirm-window__body flex-1 px-6 py-5 space-y-4"
          :class="_props.allowOverflowVisible ? 'overflow-visible' : 'app-modal-scroll'"
        >
          <p v-if="message" class="text-gray-300 leading-relaxed">
            {{ message }}
          </p>
          <slot name="body"></slot>
        </div>

        <!-- Actions -->
        <div class="shrink-0 bg-dark-900/50 px-6 py-4 flex justify-end gap-3">
          <button
            class="px-5 py-2.5 text-gray-400 font-medium rounded-lg hover:bg-dark-700 hover:text-gray-300 transition-colors duration-150 text-sm"
            @click="handleCancel"
            :disabled="_props.isLoading"
          >
            {{ _props.cancelText ?? t('common.cancel') }}
          </button>
          <button
            class="market-primary-surface market-primary-hover flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="_props.isLoading"
            @click="handleConfirm"
          >
            <svg
              v-if="_props.isLoading"
              class="w-4 h-4 animate-spin"
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
            <span>
              {{ _props.confirmText ?? t('common.confirm') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(html.modal-open),
:global(body.modal-open) {
  overflow: hidden;
  overscroll-behavior: none;
}

:global(body.modal-open) {
  position: fixed;
  left: 0;
  right: 0;
  width: 100%;
}

/* Smooth backdrop animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Modal enter animation */
.modal-enter-active {
  animation: modal-enter 0.2s ease-out;
}

.modal-leave-active {
  animation: modal-enter 0.2s ease-out reverse;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.confirm-window {
  max-height: min(42rem, 100%);
}
</style>
