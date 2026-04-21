<script setup lang="ts">
import { requestCookieSettingsOpen } from '@/composables/useCookieConsent'

function openCookieSettings() {
  requestCookieSettingsOpen()
}
</script>

<template>
  <footer
    class="relative w-full px-4 md:px-6 lg:px-8 pt-12 pb-22 lg:pb-16 overflow-hidden border-t border-[rgb(var(--palette-dark-700))]"
  >
    <div class="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <div class="absolute inset-0 bg-grid opacity-20"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-[var(--transparent)]"></div>

      <div class="absolute -left-20 bottom-10 w-[300px] h-[300px] bg-[rgb(var(--palette-blue-600)/0.1)] rounded-full blur-[80px]"></div>
      <div class="absolute -right-20 top-10 w-[250px] h-[250px] bg-[rgb(var(--palette-cyan-500)/0.05)] rounded-full blur-[60px]"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto">
      <div class="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
        <div class="flex-1 max-w-lg">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-2xl font-bold text-[rgb(var(--palette-white))]">remarket</span>
          </div>
          <p class="text-[rgb(var(--palette-gray-400))] text-lg leading-relaxed font-light max-w-md">
            {{ $t('common.tagline') }}
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          <div>
            <h4 class="font-semibold text-[rgb(var(--palette-white))] text-lg mb-4">{{ $t('common.product', 'Продукт') }}</h4>
            <ul class="space-y-3">
              <li>
                <a href="#" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.features', 'Возможности') }}
                </a>
              </li>
              <li>
                <router-link
                  :to="{ path: '/chats', query: { support: '1' } }"
                  class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light"
                >
                  {{ $t('footer.support', 'Поддержка') }}
                </router-link>
              </li>
              <li>
                <router-link to="/about" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('common.aboutUs', 'О нас') }}
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-[rgb(var(--palette-white))] text-lg mb-4">{{ $t('common.support') }}</h4>
            <ul class="space-y-3">
              <li>
                <a href="mailto:support@re-market.net" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  support@re-market.net
                </a>
              </li>
              <li>
                <router-link to="/feedback" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.feedback', 'Обратная связь') }}
                </router-link>
              </li>
              <li>
                <router-link to="/become-seller" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.becomeSeller', 'Стать продавцом') }}
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-[rgb(var(--palette-white))] text-lg mb-4">{{ $t('common.legal') }}</h4>
            <ul class="space-y-3">
              <li>
                <router-link to="/privacy-policy" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.privacyPolicy', 'Политика конфиденциальности') }}
                </router-link>
              </li>
              <li>
                <router-link to="/terms" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.termsOfService', 'Условия использования') }}
                </router-link>
              </li>
              <li>
                <button
                  type="button"
                  class="bg-[var(--transparent)] p-0 text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light"
                  @click="openCookieSettings"
                >
                  {{ $t('common.cookies.manage') }}
                </button>
              </li>
              <li>
                <router-link to="/rules" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  {{ $t('footer.marketRules', 'Правила площадки') }}
                </router-link>
              </li>
              <li>
                <a href="mailto:legal@re-market.net" class="text-[rgb(var(--palette-gray-400))] hover:text-[rgb(var(--palette-white))] transition-colors duration-300 font-light">
                  legal@re-market.net
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="h-px w-full bg-gradient-to-r from-[var(--transparent)] via-[rgb(var(--palette-gray-800))] to-[var(--transparent)] my-8"></div>

      <div class="flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-[rgb(var(--palette-gray-500))] text-sm font-light">
          © {{ new Date().getFullYear() }} remarket. {{ $t('common.rightsReserved') }}
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.bg-grid {
  background-image: linear-gradient(to right, var(--grid-pattern-stroke-soft) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-pattern-stroke-soft) 1px, transparent 1px);
  background-size: 60px 60px;
}
</style>
