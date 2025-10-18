import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ru from './locales/ru'

// Импортируем TS файлы локализаций

export const i18n = createI18n({
  legacy: false, // для Composition API
  locale: 'en',  // язык по умолчанию
  fallbackLocale: 'en', // язык по умолчанию при отсутствии перевода
  messages: {
    en,
    ru,
  },
})
