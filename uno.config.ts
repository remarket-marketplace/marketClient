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
      'dark-900': '#121212',
      'dark-800': '#1f1f1f',
      'dark-700': '#2a2a2a',
      'light-100': '#f5f5f5',
      'light-200': '#e5e5e5',
      'brand': '#1e40af',
    },
  },
  shortcuts: {
    // удобно создавать собственные комбинации классов
    'btn': 'px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/80 transition-colors',
  },
})
