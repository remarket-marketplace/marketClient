<template>
  <div ref="container" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  verified: [token: string]
}>()

type TurnstileRenderOptions = {
  sitekey: string
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
let widgetId: string | null = null

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ??
  '0x4AAAAAACcme7gpeL7XYdtm'

const waitForTurnstile = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (window.turnstile) return
    await new Promise((resolve) => setTimeout(resolve, 100))
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

  try {
    await loadTurnstileScript()

    if (!window.turnstile) {
      emit('verified', '')
      return
    }

    widgetId = window.turnstile.render(container.value, {
      sitekey: SITE_KEY,
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('verified', ''),
      'error-callback': (errorCode?: string) => {
        console.error('[Turnstile] client-side error:', errorCode ?? '<no-code>')
        emit('verified', '')
      },
    })
  } catch {
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
