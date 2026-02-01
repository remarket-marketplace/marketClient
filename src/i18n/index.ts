import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ru from './locales/ru'

const isClient = typeof window !== 'undefined'
const savedLang = isClient ? (localStorage.getItem('user-language') as 'en' | 'ru' | null) : null

function getSystemLanguage(): 'en' | 'ru' {
  if (!isClient) return 'en'
  const lang = navigator.language || navigator.languages[0]
  if (lang && lang.startsWith('ru')) return 'ru'
  return 'en'
}

const defaultLang = savedLang || getSystemLanguage()

export const i18n = createI18n({
  legacy: false,
  locale: defaultLang,
  messages: {
    en,
    ru,
  },
})
