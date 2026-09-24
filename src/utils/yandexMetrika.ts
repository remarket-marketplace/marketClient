const METRIKA_COUNTER_ID = Number(import.meta.env.VITE_YANDEX_METRIKA_ID ?? 106828907)
const METRIKA_SRC = 'https://mc.yandex.ru/metrika/tag.js'
const METRIKA_SCRIPT_ID = 'remarket-yandex-metrika'
const METRIKA_INIT_FLAG = '__remarketYmInitialized'

type YmFunction = (...args: unknown[]) => void

declare global {
  interface Window {
    ym?: YmFunction & { a?: unknown[]; l?: number }
    [METRIKA_INIT_FLAG]?: boolean
  }
}

function hasValidCounterId() {
  return Number.isFinite(METRIKA_COUNTER_ID) && METRIKA_COUNTER_ID > 0
}

function ensureQueueFunction() {
  if (typeof window === 'undefined') return
  if (typeof window.ym === 'function') return

  const queue: YmFunction & { a?: unknown[]; l?: number } = ((...args: unknown[]) => {
    queue.a = queue.a || []
    queue.a.push(args)
  }) as YmFunction & { a?: unknown[]; l?: number }
  queue.l = Date.now()
  window.ym = queue
}

function ensureMetrikaScript() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const existing = document.getElementById(METRIKA_SCRIPT_ID)
  if (existing) return

  const script = document.createElement('script')
  script.id = METRIKA_SCRIPT_ID
  script.async = true
  script.src = METRIKA_SRC
  document.head.appendChild(script)
}

function initMetrikaCounter() {
  if (typeof window === 'undefined' || !hasValidCounterId()) return

  ensureQueueFunction()
  ensureMetrikaScript()

  if (window[METRIKA_INIT_FLAG]) return
  window.ym?.(METRIKA_COUNTER_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  })
  window[METRIKA_INIT_FLAG] = true
}

function disableMetrikaBestEffort() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const script = document.getElementById(METRIKA_SCRIPT_ID)
  script?.remove()
}

export function syncMetrikaByAnalyticsConsent(analyticsEnabled: boolean) {
  if (analyticsEnabled) {
    initMetrikaCounter()
    return
  }
  disableMetrikaBestEffort()
}
