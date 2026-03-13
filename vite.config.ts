import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) {
            return 'vendor-charts'
          }

          if (
            id.includes('/vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/') ||
            id.includes('/vue-i18n/')
          ) {
            return 'vendor-vue'
          }

          if (id.includes('/socket.io-client/')) {
            return 'vendor-socket'
          }

          if (id.includes('/lucide-vue-next/')) {
            return 'vendor-icons'
          }

          return 'vendor-misc'
        },
      },
    },
  }
})
