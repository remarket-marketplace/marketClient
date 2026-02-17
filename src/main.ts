import './assets/main.css'
import 'uno.css'
import { createVueApp } from './app'

const { app, router } = createVueApp(false)

router.isReady().then(() => {
  app.mount('#app')
})
