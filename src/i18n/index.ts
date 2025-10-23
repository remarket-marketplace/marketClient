import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ru from './locales/ru'

// восстанавление языка из localStorage
const savedLang = localStorage.getItem('user-language') as 'en' | 'ru' | null
const defaultLang = savedLang && (savedLang === 'en' || savedLang === 'ru') ? savedLang : 'en'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLang,
  fallbackLocale: 'en',
  messages: {
    en,
    ru,
  },
})