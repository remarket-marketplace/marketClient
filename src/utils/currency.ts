import { ref } from 'vue'

export type CurrencyCode = 'RUB' | 'USD'

export const CURRENCY_STORAGE_KEY = 'user-currency'
const LANGUAGE_STORAGE_KEY = 'user-language'
const DEFAULT_USD_RUB_RATE = 90

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

export function setPreferredCurrency(currency: CurrencyCode): void {
  preferredCurrency.value = currency
  if (typeof window === 'undefined') return
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
}

export function getUsdRubRate(): number {
  const raw = Number.parseFloat(import.meta.env.VITE_USD_RUB_RATE ?? '')
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_RUB_RATE
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
  const {
    currency = resolvePreferredCurrency(),
    fromCurrency = 'RUB',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options

  const converted = convertCurrencyAmount(amount, fromCurrency, currency)

  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(converted)
}
