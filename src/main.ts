import './assets/main.css'
import 'uno.css'
import { createVueApp } from './app'
import { productService } from './api/product/ProductService'
import { setUsdRubRate } from './utils/currency'

if (typeof window !== 'undefined') {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  if (isLocalhost && window.location.protocol === 'https:') {
    window.location.replace(`http://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`)
  }
}

const { app, router } = createVueApp(false)

async function bootstrapCurrencyRate() {
  const currencyConfig = await productService.getCurrencyConfig()
  if (currencyConfig?.usd_rub_rate) {
    setUsdRubRate(currencyConfig.usd_rub_rate)
  }
}

bootstrapCurrencyRate().finally(() => {
  router.isReady().then(() => {
    app.mount('#app')
  })
})
