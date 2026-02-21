import App from './App.vue'
import { createSSRApp, createApp as createClientApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from './i18n'
import { createAppRouter } from './router'

export function createVueApp(isSSR = false) {
  const app = (isSSR ? createSSRApp : createClientApp)(App)
  const pinia = createPinia()
  const router = createAppRouter(isSSR)

  app.use(pinia)
  app.use(router)
  app.use(i18n)

  return { app, router, pinia }
}
