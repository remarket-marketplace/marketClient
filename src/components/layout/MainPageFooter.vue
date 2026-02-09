<template>
  <footer
    class="relative w-full px-4 md:px-6 lg:px-8 pt-12 pb-22 lg:pb-16 overflow-hidden border-t border-dark-700"
  >
    <div class="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <div class="absolute inset-0 bg-grid opacity-20"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>

      <div class="absolute -left-20 bottom-10 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]"></div>
      <div class="absolute -right-20 top-10 w-[250px] h-[250px] bg-cyan-500/5 rounded-full blur-[60px]"></div>
    </div>

    <div class="relative z-10 max-w-7xl mx-auto">
      <div class="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
        <div class="flex-1 max-w-lg">
          <div class="flex items-center gap-3 mb-6">
            <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span class="text-white font-bold text-xl">RM</span>
            </div>
            <span class="text-2xl font-bold text-white">remarket</span>
          </div>
          <p class="text-gray-400 text-lg leading-relaxed font-light max-w-md">
            {{ $t('common.tagline') }}
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          <div>
            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.product', 'Продукт') }}</h4>
            <ul class="space-y-3">
              <li>
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('footer.features', 'Возможности') }}
                </a>
              </li>
              <li>
                <router-link
                  :to="{ path: '/chats', query: { support: '1' } }"
                  class="text-gray-400 hover:text-white transition-colors duration-300 font-light"
                >
                  {{ $t('footer.support', 'Поддержка') }}
                </router-link>
              </li>
              <li>
                <router-link to="/about" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('common.aboutUs', 'О нас') }}
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.support') }}</h4>
            <ul class="space-y-3">
              <li>
                <a href="mailto:support@re-market.net" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  support@re-market.net
                </a>
              </li>
              <li>
                <router-link to="/feedback" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('footer.feedback', 'Обратная связь') }}
                </router-link>
              </li>
              <li>
                <router-link to="/become-seller" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('footer.becomeSeller', 'Стать продавцом') }}
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.legal') }}</h4>
            <ul class="space-y-3">
              <li>
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('footer.privacyPolicy', 'Политика конфиденциальности') }}
                </a>
              </li>
              <li>
                <a href="#" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  {{ $t('footer.termsOfService', 'Условия использования') }}
                </a>
              </li>
              <li>
                <a href="mailto:legal@re-market.net" class="text-gray-400 hover:text-white transition-colors duration-300 font-light">
                  legal@re-market.net
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent my-8"></div>

      <div class="flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="text-gray-500 text-sm font-light">
          © {{ new Date().getFullYear() }} remarket. {{ $t('common.rightsReserved') }}
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.bg-grid {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='60' height='60' fill='none' stroke='rgb(255 255 255 / 0.03)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
}
</style>
