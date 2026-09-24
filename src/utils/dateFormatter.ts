/**
 * Форматирует дату в формат "15 мая 2026 года" на русском языке
 */
export function formatDateInRussian(date: Date = new Date()): string {
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day} ${month} ${year} года`
}

/**
 * Форматирует дату в формат "May 15, 2026" на английском языке
 */
export function formatDateInEnglish(date: Date = new Date()): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${month} ${day}, ${year}`
}
