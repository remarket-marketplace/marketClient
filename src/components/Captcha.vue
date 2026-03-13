<template>
  <div class="relative w-full min-h-[72px]">
    <div ref="container" class="w-full min-h-[72px]" />

    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-600/70 text-sm text-gray-300 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      <span>{{ t('common.captchaLoading') }}</span>
    </div>

    <div
      v-else-if="hasError"
      class="absolute inset-0 flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-center text-xs text-red-200"
      role="alert"
    >
      {{ t('common.captchaLoadFailed') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  verified: [token: string]
}>()
const { t } = useI18n()

type TurnstileRenderOptions = {
  sitekey: string
  size?: 'normal' | 'compact' | 'flexible'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': (errorCode?: string) => void
}

type TurnstileApi = {
  render: (element: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    __turnstileLoadPromise?: Promise<void>
  }
}

const container = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
let widgetId: string | null = null
const MIN_LOADING_INDICATOR_MS = 500

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ??
  '0x4AAAAAACcme7gpeL7XYdtm'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const ensureMinLoadingIndicator = async (startedAt: number) => {
  const elapsed = Date.now() - startedAt
  const remaining = MIN_LOADING_INDICATOR_MS - elapsed
  if (remaining > 0) {
    await sleep(remaining)
  }
}

const hasRenderedMarkup = (element: HTMLElement): boolean => {
  return (
    element.childElementCount > 0
    || !!element.querySelector('iframe')
    || !!element.querySelector('input[name="cf-turnstile-response"]')
  )
}

const waitForRenderedWidget = async () => {
  if (!container.value) return

  const target = container.value
  if (hasRenderedMarkup(target)) return

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (hasRenderedMarkup(target)) {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(target, { childList: true, subtree: true })

    window.setTimeout(() => {
      observer.disconnect()
      resolve()
    }, 5000)
  })
}

const waitForTurnstile = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (window.turnstile) return
    await sleep(100)
  }
  throw new Error('Turnstile API unavailable')
}

const loadTurnstileScript = async (): Promise<void> => {
  if (typeof window === 'undefined') return

  if (window.turnstile) return

  if (window.__turnstileLoadPromise) {
    await window.__turnstileLoadPromise
    return
  }

  window.__turnstileLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
    )

    if (existing) {
      if (window.turnstile) {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script load failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script load failed'))
    document.head.appendChild(script)
  })

  await window.__turnstileLoadPromise
  await waitForTurnstile()
}

const renderTurnstile = async () => {
  if (!container.value) return
  const loadingStartedAt = Date.now()
  isLoading.value = true
  hasError.value = false

  try {
    await loadTurnstileScript()

    if (!window.turnstile) {
      hasError.value = true
      await ensureMinLoadingIndicator(loadingStartedAt)
      isLoading.value = false
      emit('verified', '')
      return
    }

    widgetId = window.turnstile.render(container.value, {
      sitekey: SITE_KEY,
      size: 'flexible',
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('verified', ''),
      'error-callback': (errorCode?: string) => {
        console.error('[Turnstile] client-side error:', errorCode ?? '<no-code>')
        hasError.value = true
        isLoading.value = false
        emit('verified', '')
      },
    })

    await waitForRenderedWidget()
    await ensureMinLoadingIndicator(loadingStartedAt)
    isLoading.value = false
  } catch {
    hasError.value = true
    await ensureMinLoadingIndicator(loadingStartedAt)
    isLoading.value = false
    emit('verified', '')
  }
}

onMounted(() => {
  void renderTurnstile()
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId)
  }
})
</script>
