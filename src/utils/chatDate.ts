function normalizeChatDateString(rawValue: string): string {
  const value = rawValue.trim()
  if (!value) return value

  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    return value
  }

  return `${value.replace(' ', 'T')}Z`
}

export function parseChatDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null

  const parsed = dateInput instanceof Date
    ? new Date(dateInput.getTime())
    : new Date(normalizeChatDateString(dateInput))

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getChatTimestamp(dateInput: string | Date | null | undefined): number {
  return parseChatDate(dateInput)?.getTime() ?? 0
}

export function formatChatTime(dateInput: string | Date | null | undefined, locale: string): string {
  const parsed = parseChatDate(dateInput)
  if (!parsed) return ''

  const localeCode = locale.startsWith('ru') ? 'ru-RU' : 'en-US'
  return parsed.toLocaleString(localeCode, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
