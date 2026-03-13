import { defineConfig, presetUno, presetIcons } from 'unocss'

const withAlpha = (token: string) => `rgb(var(--palette-${token}) / <alpha-value>)`

const paletteColors = {
  dark: {
    200: withAlpha('dark-200'),
    400: withAlpha('dark-400'),
    500: withAlpha('dark-500'),
    600: withAlpha('dark-600'),
    700: withAlpha('dark-700'),
    800: withAlpha('dark-800'),
    900: withAlpha('dark-900'),
  },
  light: {
    100: withAlpha('light-100'),
    200: withAlpha('light-200'),
  },
  gray: {
    50: withAlpha('gray-50'),
    100: withAlpha('gray-100'),
    200: withAlpha('gray-200'),
    300: withAlpha('gray-300'),
    400: withAlpha('gray-400'),
    500: withAlpha('gray-500'),
    600: withAlpha('gray-600'),
    700: withAlpha('gray-700'),
    800: withAlpha('gray-800'),
    900: withAlpha('gray-900'),
  },
  zinc: {
    600: withAlpha('zinc-600'),
    700: withAlpha('zinc-700'),
    800: withAlpha('zinc-800'),
    900: withAlpha('zinc-900'),
  },
  blue: {
    100: withAlpha('blue-100'),
    200: withAlpha('blue-200'),
    300: withAlpha('blue-300'),
    400: withAlpha('blue-400'),
    500: withAlpha('blue-500'),
    600: withAlpha('blue-600'),
    700: withAlpha('blue-700'),
    800: withAlpha('blue-800'),
    900: withAlpha('blue-900'),
  },
  cyan: {
    200: withAlpha('cyan-200'),
    300: withAlpha('cyan-300'),
    400: withAlpha('cyan-400'),
    500: withAlpha('cyan-500'),
    900: withAlpha('cyan-900'),
  },
  sky: { 500: withAlpha('sky-500') },
  indigo: { 500: withAlpha('indigo-500') },
  violet: { 500: withAlpha('violet-500') },
  purple: {
    300: withAlpha('purple-300'),
    400: withAlpha('purple-400'),
    500: withAlpha('purple-500'),
    600: withAlpha('purple-600'),
  },
  pink: {
    400: withAlpha('pink-400'),
    500: withAlpha('pink-500'),
    900: withAlpha('pink-900'),
  },
  rose: { 400: withAlpha('rose-400') },
  emerald: {
    100: withAlpha('emerald-100'),
    200: withAlpha('emerald-200'),
    300: withAlpha('emerald-300'),
    400: withAlpha('emerald-400'),
    500: withAlpha('emerald-500'),
    600: withAlpha('emerald-600'),
    700: withAlpha('emerald-700'),
    900: withAlpha('emerald-900'),
  },
  green: {
    100: withAlpha('green-100'),
    300: withAlpha('green-300'),
    400: withAlpha('green-400'),
    500: withAlpha('green-500'),
    600: withAlpha('green-600'),
    700: withAlpha('green-700'),
  },
  lime: { 500: withAlpha('lime-500') },
  yellow: {
    200: withAlpha('yellow-200'),
    300: withAlpha('yellow-300'),
    400: withAlpha('yellow-400'),
    500: withAlpha('yellow-500'),
  },
  amber: {
    200: withAlpha('amber-200'),
    300: withAlpha('amber-300'),
    400: withAlpha('amber-400'),
    500: withAlpha('amber-500'),
    700: withAlpha('amber-700'),
    900: withAlpha('amber-900'),
  },
  orange: {
    300: withAlpha('orange-300'),
    400: withAlpha('orange-400'),
    500: withAlpha('orange-500'),
    600: withAlpha('orange-600'),
    700: withAlpha('orange-700'),
  },
  red: {
    100: withAlpha('red-100'),
    200: withAlpha('red-200'),
    300: withAlpha('red-300'),
    400: withAlpha('red-400'),
    500: withAlpha('red-500'),
    600: withAlpha('red-600'),
    700: withAlpha('red-700'),
    800: withAlpha('red-800'),
    900: withAlpha('red-900'),
  },
}

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
      brand: withAlpha('brand'),
      ...paletteColors,
    },
  },
  shortcuts: {
    // удобно создавать собственные комбинации классов
    'btn': 'px-4 py-2 rounded-lg bg-brand text-mainText hover:bg-brand/80 transition-colors',
  },
})
