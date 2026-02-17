import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,      // масштаб иконок
      warn: true,      // предупреждать о несуществующих иконках
    }),
  ],
  theme: {
    colors: {
      'dark-950': '#050b12',
      'dark-900': '#07131d',
      'dark-800': '#0c1d2b',
      'dark-700': '#12293a',
      'dark-600': '#18374b',
      'dark-500': '#245069',
      'dark-200': '#5f89a2',
      'light-100': '#f5f5f5',
      'light-200': '#e5e5e5',
      'brand': '#2aabee',
    },
  },
  shortcuts: {
    // удобно создавать собственные комбинации классов
    'btn': 'px-4 py-2 rounded-lg bg-brand text-mainText hover:bg-brand/80 transition-colors',
  },
})
