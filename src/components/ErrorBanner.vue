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
          <circle cx="12" cy="12" r="12" fill="var(--error-banner-icon)" />
          <path d="M12 7v5" stroke="var(--white-solid)" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="16" r="1.2" fill="var(--white-solid)" />
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
  background: linear-gradient(90deg, var(--error-banner-start) 0%, var(--error-banner-end) 100%);
  color: var(--white-solid);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px 0 var(--error-banner-shadow);
  padding: 0.8rem 1.5rem;
  letter-spacing: 0.01em;
  margin-bottom: 1rem;
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
</style>
