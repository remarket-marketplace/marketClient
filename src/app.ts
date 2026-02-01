import App from './App.vue'
import { createSSRApp, createApp as createClientApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from './i18n'
import { createAppRouter } from './router'
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'

export function createVueApp(isSSR = false) {
  const app = (isSSR ? createSSRApp : createClientApp)(App)
  const pinia = createPinia()
  const router = createAppRouter(isSSR)

  app.use(pinia)
  app.use(router)
  app.use(i18n)
  app.component('VueHcaptcha', VueHcaptcha)

  return { app, router, pinia }
}
