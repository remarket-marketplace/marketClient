<script setup lang="ts">
import { getErrorMessage } from '@/utils/errorsMap';
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  error?: any
  message?: string
}>()

const { t } = useI18n()

const errorText = computed(() => {
  if (props.message)
    return props.message
  if (props.error?.detail?.error_code) {
    return getErrorMessage(props.error.detail, t)
  }
  if (typeof props.error === 'string')
    return props.error
  return ''
})
</script>

<template>
  <transition name="fade">
    <div v-if="errorText" class="error-banner">
      <span class="icon">
        <!-- SVG-иконка ошибки -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="#F87171" />
          <path d="M12 7v5" stroke="white" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="16" r="1.2" fill="white" />
        </svg>
      </span>
      <span class="text">{{ errorText }}</span>
    </div>
  </transition>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  border-radius: 1rem;
  box-shadow: 0 4px 16px 0 rgba(239, 68, 68, 0.15);
  padding: 1rem 1.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin-bottom: 1rem;
  animation: pop-in 0.4s cubic-bezier(0.42, 0, 0.58, 1);
}
.error-banner .icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.error-banner .text {
  flex: 1;
  text-align: left;
  word-break: break-word;
}
@keyframes pop-in {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  80% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
