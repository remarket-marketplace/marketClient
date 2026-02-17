import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    vue(),
    vueDevTools(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true,
    port: 3333,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist/client',
    manifest: true,
    ssrManifest: true,
  },
  ssr: {
    noExternal: ['@hcaptcha/vue3-hcaptcha']
  }
})
