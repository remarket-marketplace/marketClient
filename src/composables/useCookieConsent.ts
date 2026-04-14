import { computed, ref } from 'vue'

export type CookieConsentStatus = 'accepted_all' | 'rejected_optional' | 'custom'

export type CookieConsentPreferences = {
  necessary: true
  analytics: boolean
  marketing: boolean
}

type CookieConsentRecord = {
  version: number
  status: CookieConsentStatus
  preferences: CookieConsentPreferences
  updated_at: string
}

const COOKIE_CONSENT_VERSION = 1
const COOKIE_CONSENT_STORAGE_KEY = 'remarket_cookie_consent_v1'
export const COOKIE_SETTINGS_OPEN_EVENT = 'remarket:cookie-settings-open'

const DEFAULT_PREFERENCES: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
}

const isHydrated = ref(false)
const consentRecord = ref<CookieConsentRecord | null>(null)

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStoredConsent(raw: unknown): CookieConsentRecord | null {
  if (!isObject(raw)) return null

  const version = raw.version
  const status = raw.status
  const preferences = raw.preferences
  const updatedAt = raw.updated_at

  if (typeof version !== 'number' || version !== COOKIE_CONSENT_VERSION) return null
  if (status !== 'accepted_all' && status !== 'rejected_optional' && status !== 'custom') return null
  if (!isObject(preferences)) return null
  if (typeof updatedAt !== 'string') return null

  return {
    version,
    status,
    updated_at: updatedAt,
    preferences: {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
    },
  }
}

function readConsentFromStorage(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue)
    return normalizeStoredConsent(parsed)
  } catch {
    return null
  }
}

function writeConsentToStorage(record: CookieConsentRecord) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record))
}

function persistConsent(status: CookieConsentStatus, preferences: CookieConsentPreferences) {
  const normalized: CookieConsentPreferences = {
    necessary: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
  }

  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    status,
    preferences: normalized,
    updated_at: new Date().toISOString(),
  }

  consentRecord.value = record
  writeConsentToStorage(record)
}

function resolveStatusByPreferences(preferences: CookieConsentPreferences): CookieConsentStatus {
  if (preferences.analytics && preferences.marketing) {
    return 'accepted_all'
  }
  if (!preferences.analytics && !preferences.marketing) {
    return 'rejected_optional'
  }
  return 'custom'
}

export function requestCookieSettingsOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_OPEN_EVENT))
}

export function useCookieConsent() {
  function hydrate() {
    if (isHydrated.value || typeof window === 'undefined') return
    consentRecord.value = readConsentFromStorage()
    isHydrated.value = true
  }

  function acceptAll() {
    persistConsent('accepted_all', {
      necessary: true,
      analytics: true,
      marketing: true,
    })
  }

  function rejectOptional() {
    persistConsent('rejected_optional', {
      necessary: true,
      analytics: false,
      marketing: false,
    })
  }

  function savePreferences(preferences: CookieConsentPreferences) {
    const normalized: CookieConsentPreferences = {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
    }
    persistConsent(resolveStatusByPreferences(normalized), normalized)
  }

  const hasDecision = computed(() => Boolean(consentRecord.value))
  const shouldShowBanner = computed(() => isHydrated.value && !hasDecision.value)
  const preferences = computed<CookieConsentPreferences>(() =>
    consentRecord.value?.preferences ?? DEFAULT_PREFERENCES
  )

  return {
    isHydrated: computed(() => isHydrated.value),
    hasDecision,
    shouldShowBanner,
    preferences,
    hydrate,
    acceptAll,
    rejectOptional,
    savePreferences,
  }
}
