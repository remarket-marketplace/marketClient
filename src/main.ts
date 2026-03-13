import './assets/main.css'
import 'uno.css'
import { createVueApp } from './app'
import { productService } from './api/product/ProductService'
import { setUsdRubRate } from './utils/currency'

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
