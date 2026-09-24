import { defineConfig, presetUno, presetIcons } from 'unocss'

const withAlpha = (token: string) => `rgb(var(--palette-${token}) / <alpha-value>)`

const paletteColors = {
  white: withAlpha('white'),
  black: withAlpha('black'),
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
  slate: {
    100: withAlpha('slate-100'),
    300: withAlpha('slate-300'),
    500: withAlpha('slate-500'),
    600: withAlpha('slate-600'),
    700: withAlpha('slate-700'),
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
    950: withAlpha('blue-950'),
  },
  sky: {
    50: withAlpha('sky-50'),
    100: withAlpha('sky-100'),
    200: withAlpha('sky-200'),
    300: withAlpha('sky-300'),
    400: withAlpha('sky-400'),
    500: withAlpha('sky-500'),
    900: withAlpha('sky-900'),
  },
  cyan: {
    200: withAlpha('cyan-200'),
    300: withAlpha('cyan-300'),
    400: withAlpha('cyan-400'),
    500: withAlpha('cyan-500'),
    900: withAlpha('cyan-900'),
  },
  indigo: {
    400: withAlpha('indigo-400'),
    500: withAlpha('indigo-500'),
    900: withAlpha('indigo-900'),
  },
  violet: {
    200: withAlpha('violet-200'),
    300: withAlpha('violet-300'),
    500: withAlpha('violet-500'),
    600: withAlpha('violet-600'),
    950: withAlpha('violet-950'),
  },
  fuchsia: {
    500: withAlpha('fuchsia-500'),
    900: withAlpha('fuchsia-900'),
  },
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
  rose: {
    100: withAlpha('rose-100'),
    200: withAlpha('rose-200'),
    300: withAlpha('rose-300'),
    400: withAlpha('rose-400'),
    500: withAlpha('rose-500'),
  },
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
    950: withAlpha('green-950'),
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
    950: withAlpha('red-950'),
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
