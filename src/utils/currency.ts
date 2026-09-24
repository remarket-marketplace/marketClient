import { ref } from 'vue'

export type CurrencyCode = 'RUB' | 'USD'

export const CURRENCY_STORAGE_KEY = 'user-currency'
const LANGUAGE_STORAGE_KEY = 'user-language'
const DEFAULT_USD_RUB_RATE = 90

function resolveUsdRubRateFromEnv(): number {
  const raw = Number.parseFloat(import.meta.env.VITE_USD_RUB_RATE ?? '')
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_RUB_RATE
}

function isCurrencyCode(value: string | null): value is CurrencyCode {
  return value === 'RUB' || value === 'USD'
}

export function getDefaultCurrencyByLanguage(language: string | null | undefined): CurrencyCode {
  return (language ?? '').toLowerCase().startsWith('ru') ? 'RUB' : 'USD'
}

export function getSavedCurrency(): CurrencyCode | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
  return isCurrencyCode(saved) ? saved : null
}

export function resolvePreferredCurrency(): CurrencyCode {
  return preferredCurrency.value
}

function resolvePreferredCurrencyFromStorage(): CurrencyCode {
  const saved = getSavedCurrency()
  if (saved) return saved

  if (typeof window === 'undefined') return 'USD'

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  const browserLanguage = navigator.language || navigator.languages?.[0] || 'en'
  return getDefaultCurrencyByLanguage(savedLanguage || browserLanguage)
}

export const preferredCurrency = ref<CurrencyCode>(resolvePreferredCurrencyFromStorage())
const usdRubRate = ref<number>(resolveUsdRubRateFromEnv())

export function setPreferredCurrency(currency: CurrencyCode): void {
  preferredCurrency.value = currency
  if (typeof window === 'undefined') return
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
}

export function getUsdRubRate(): number {
  return usdRubRate.value
}

export function setUsdRubRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) return
  usdRubRate.value = rate
}

export function getCurrencyLocale(currency: CurrencyCode): string {
  return currency === 'RUB' ? 'ru-RU' : 'en-US'
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  return currency === 'RUB' ? '₽' : '$'
}

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): number {
  if (!Number.isFinite(amount)) return 0
  if (fromCurrency === toCurrency) return amount

  const usdRubRate = getUsdRubRate()
  if (fromCurrency === 'RUB' && toCurrency === 'USD') return amount / usdRubRate
  if (fromCurrency === 'USD' && toCurrency === 'RUB') return amount * usdRubRate
  return amount
}

type FormatCurrencyOptions = {
  currency?: CurrencyCode
  fromCurrency?: CurrencyCode
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function formatCurrencyAmount(amount: number, options: FormatCurrencyOptions = {}): string {
  const currency = options.currency ?? resolvePreferredCurrency()
  const fromCurrency = options.fromCurrency ?? 'RUB'
  const defaultFractionDigits = currency === 'USD' ? 2 : 0
  const minimumFractionDigits = options.minimumFractionDigits ?? defaultFractionDigits
  const maximumFractionDigits = options.maximumFractionDigits ?? defaultFractionDigits

  const converted = convertCurrencyAmount(amount, fromCurrency, currency)

  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(converted)
}

export function formatCompactCurrencyAmount(amount: number, options: FormatCurrencyOptions = {}): string {
  const currency = options.currency ?? resolvePreferredCurrency()
  const fromCurrency = options.fromCurrency ?? 'RUB'
  const maximumFractionDigits = options.maximumFractionDigits ?? 1

  const converted = convertCurrencyAmount(amount, fromCurrency, currency)
  const absoluteValue = Math.abs(converted)
  const shouldUseCompact = absoluteValue >= 1000
  const standardFractionDigits = currency === 'USD' ? 2 : 0

  const numberLabel = new Intl.NumberFormat(getCurrencyLocale(currency), {
    notation: shouldUseCompact ? 'compact' : 'standard',
    compactDisplay: 'short',
    minimumFractionDigits: shouldUseCompact ? 0 : standardFractionDigits,
    maximumFractionDigits: shouldUseCompact ? maximumFractionDigits : standardFractionDigits,
  }).format(converted)

  return currency === 'USD'
    ? `${getCurrencySymbol(currency)}${numberLabel}`
    : `${numberLabel} ${getCurrencySymbol(currency)}`
}
