function normalizeDateInput(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatAverageResponseTime(
  seconds: number | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!Number.isFinite(seconds) || seconds == null || seconds < 0) {
    return fallback
  }

  const normalizedSeconds = Math.round(seconds)

  if (normalizedSeconds < 60) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(normalizedSeconds)
  }

  if (normalizedSeconds < 3600) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(Math.max(1, Math.round(normalizedSeconds / 60)))
  }

  if (normalizedSeconds < 86400) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'hour',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(Math.max(1, Math.round(normalizedSeconds / 3600)))
  }

  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'day',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(Math.max(1, Math.round(normalizedSeconds / 86400)))
}

export function formatLastSeen(
  value: Date | string | null | undefined,
  isActive: boolean,
  locale: string,
  fallback: string,
  onlineLabel: string,
): string {
  if (isActive) {
    return onlineLabel
  }

  const parsedDate = normalizeDateInput(value)
  if (!parsedDate) {
    return fallback
  }

  const diffSeconds = Math.round((parsedDate.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const absoluteDiffSeconds = Math.abs(diffSeconds)

  if (absoluteDiffSeconds < 60) {
    return formatter.format(diffSeconds, 'second')
  }

  if (absoluteDiffSeconds < 3600) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute')
  }

  if (absoluteDiffSeconds < 86400) {
    return formatter.format(Math.round(diffSeconds / 3600), 'hour')
  }

  return formatter.format(Math.round(diffSeconds / 86400), 'day')
}
