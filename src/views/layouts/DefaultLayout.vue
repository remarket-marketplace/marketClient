<script setup lang="ts">
import {
  Home,
  MessageCircle,
  PlusCircle,
  User,
  Shield,
  BarChart3,
  Wallet,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'
import SelectCurrency from '@/components/SelectCurrency.vue'
import MainPageFooter from '@/components/layout/MainPageFooter.vue'
import { formatCompactCurrencyAmount, formatCurrencyAmount } from '@/utils/currency'
import NotificationsMenu from '@/components/layout/NotificationsMenu.vue'
import MobileHeaderSettingsMenu from '@/components/layout/MobileHeaderSettingsMenu.vue'
import type { FunctionalComponent } from 'vue'
import type { LucideProps } from 'lucide-vue-next'

interface NavItem {
  id: string;
  title: string;
  icon: FunctionalComponent<LucideProps, {}, any, {}>;
  to: string;
  sell?: boolean;
  admin?: boolean;
  partner?: boolean;
}

const store = useUserStore()
const chatStore = useChatStore()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isDesktop = ref(true)
const { user } = storeToRefs(store)
const { unreadTotal } = storeToRefs(chatStore)

function checkDesktop() {
  isDesktop.value = window.innerWidth >= 768
}

const isActiveRoute = (item: NavItem) => {
  const currentPath = route.path

  // If we are on the authorization page, do not highlight menu items
  if (currentPath === '/signin' || currentPath === '/signup') {
    return false
  }

  // For the home page - exact match
  if (item.to === '/') {
    return currentPath === '/'
  }

  // For chats - starts with /chats
  if (item.to === '/chats') {
    return currentPath.startsWith('/chats')
  }

  // For creating a product - exact match
  if (item.to === '/product/create') {
    return currentPath === '/product/create'
  }

  // For profile - starts with /user
  if (item.to.startsWith('/user')) {
    return currentPath.startsWith('/user')
  }

  // For product view - starts with /product (but not creation)
  if (item.to.startsWith('/product/') && item.to !== '/product/create') {
    return currentPath.startsWith('/product/') && currentPath !== '/product/create'
  }

  // For admin - starts with /admin
  if (item.to === '/admin') {
    return currentPath.startsWith('/admin')
  }

  if (item.to === '/partner/fortnite-stats') {
    return currentPath.startsWith('/partner/')
  }

  return currentPath === item.to
}

// For mobile version, use the same logic
const isActiveRouteMobile = (item: NavItem) => {
  return isActiveRoute(item)
}

const showFooter = computed(() => !route.path.startsWith('/chats'))

onMounted(() => {
  checkDesktop()
  window.addEventListener('resize', checkDesktop)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkDesktop)
})

const navItems = computed(() => {
  const items: NavItem[] = [
    {
      id: 'home',
      title: t('navigation.market.home'),
      icon: Home,
      to: '/'
    },
    {
      id: 'chats',
      title: t('navigation.market.chats'),
      icon: MessageCircle,
      to: user && user.value?.username ? '/chats' : '/signin',
    },
    {
      id: 'sell',
      title: t('navigation.market.sell'),
      icon: PlusCircle,
      to: user && user.value?.username ? '/product/create' : '/signin',
      sell: true
    },
    {
      id: 'profile',
      title: t('navigation.market.profile'),
      icon: User,
      to: user && user.value?.username ? `/user/${user.value.username}` : '/signin',
    },
  ]

  if (user.value?.role === 'admin') {
    items.push({
      id: 'admin',
      title: t('navigation.market.admin'),
      icon: Shield,
      to: '/admin',
      admin: true
    })
  }

  if (user.value?.role === 'partner') {
    items.push({
      id: 'partner-stats',
      title: t('common.partner'),
      icon: BarChart3,
      to: '/partner/fortnite-stats',
      partner: true
    })
  }

  return items
})

const roleNavItems = computed(() =>
  navItems.value.filter((item) => item.id === 'admin' || item.id === 'partner-stats'),
)

const primaryNavItems = computed(() =>
  navItems.value.filter((item) => item.id !== 'admin' && item.id !== 'partner-stats'),
)

const walletBalanceLabel = computed(() =>
  formatCurrencyAmount(Number(user.value?.balance ?? 0), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
)

const walletBalanceCompactLabel = computed(() =>
  formatCompactCurrencyAmount(Number(user.value?.balance ?? 0)),
)

const walletTitle = computed(() =>
  t('navigation.market.walletBalance', { balance: walletBalanceLabel.value }),
)

function goToWallet() {
  if (!user.value) {
    router.push('/signin')
    return
  }
  router.push('/wallet')
}

const mobileNavGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(1, navItems.value.length)}, minmax(0, 1fr))`,
}))
</script>

<template>
  <div
    class="w-screen bg-background text-mainText"
    :class="showFooter ? 'min-h-screen' : 'h-full-dvh overflow-hidden flex flex-col'"
  >
    <header
      class="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div class="mx-auto w-full 2xl:w-1/2">
        <div class="mx-auto h-14 w-full flex items-center justify-between gap-3 px-2 lg:px-4">
          <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-lg text-mainText font-semibold sm:text-xl"
            @click="router.push('/')">
            remarket
          </div>

          <div class="flex items-center gap-2 md:gap-3">
            <nav class="hidden items-center gap-6 md:flex">
              <router-link v-for="item in primaryNavItems" :key="item.id" :to="item.to"
                class="flex items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
                :class="{
                  'text-white': isActiveRoute(item),
                  'text-gray-400': !isActiveRoute(item)
                }">
                <div class="relative">
                  <component :is="item.icon" :class="[
                    item.sell ? 'text-2xl' : 'text-xl',
                    item.admin ? 'text-purple-400' : '',
                    item.partner ? 'text-cyan-300' : '',
                    isActiveRoute(item) ? 'text-white' : 'text-gray-400',
                    'transition-colors duration-300 group-hover:text-white'
                  ]" :size="item.sell ? 24 : 20" stroke-width="1.5" />
                  <span
                    v-if="item.id === 'chats' && unreadTotal > 0"
                    class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] text-white font-semibold flex items-center justify-center shadow-lg"
                  >
                    {{ unreadTotal > 99 ? '99+' : unreadTotal }}
                  </span>
                </div>
                <span class="ml-1 transition-colors duration-300 group-hover:text-white"
                  :class="{ 'text-purple-300': item.admin, 'text-cyan-200': item.partner }">
                  {{ item.title }}
                </span>
              </router-link>

              <button
                v-if="user && user.role !== 'admin'"
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md border border-dark-700 bg-dark-600 px-2.5 text-xs text-mainText transition hover:border-dark-500 focus:outline-none"
                :title="walletTitle"
                @click="goToWallet"
              >
                <Wallet class="h-3.5 w-3.5 text-blue-400" />
                <span class="font-medium">{{ walletBalanceLabel }}</span>
              </button>

              <router-link v-for="item in roleNavItems" :key="item.id" :to="item.to"
                class="flex items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
                :class="{
                  'text-white': isActiveRoute(item),
                  'text-gray-400': !isActiveRoute(item)
                }">
                <div class="relative">
                  <component :is="item.icon" :class="[
                    item.sell ? 'text-2xl' : 'text-xl',
                    item.admin ? 'text-purple-400' : '',
                    item.partner ? 'text-cyan-300' : '',
                    isActiveRoute(item) ? 'text-white' : 'text-gray-400',
                    'transition-colors duration-300 group-hover:text-white'
                  ]" :size="item.sell ? 24 : 20" stroke-width="1.5" />
                  <span
                    v-if="item.id === 'chats' && unreadTotal > 0"
                    class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] text-white font-semibold flex items-center justify-center shadow-lg"
                  >
                    {{ unreadTotal > 99 ? '99+' : unreadTotal }}
                  </span>
                </div>
                <span class="ml-1 transition-colors duration-300 group-hover:text-white"
                  :class="{ 'text-purple-300': item.admin, 'text-cyan-200': item.partner }">
                  {{ item.title }}
                </span>
              </router-link>

              <button
                v-if="user && user.role === 'admin'"
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md border border-dark-700 bg-dark-600 px-2.5 text-xs text-mainText transition hover:border-dark-500 focus:outline-none"
                :title="walletTitle"
                @click="goToWallet"
              >
                <Wallet class="h-3.5 w-3.5 text-blue-400" />
                <span class="font-medium">{{ walletBalanceLabel }}</span>
              </button>
            </nav>

            <div class="hidden md:block md:order-2">
              <SelectLanguage />
            </div>
            <button
              v-if="user"
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-md border border-dark-700 bg-dark-600 px-2 text-[10px] text-mainText transition hover:border-dark-500 focus:outline-none md:hidden"
              :title="walletTitle"
              @click="goToWallet"
            >
              <Wallet class="h-3.5 w-3.5 text-blue-400" />
              <span class="block max-w-[64px] truncate font-medium">{{ walletBalanceCompactLabel }}</span>
            </button>
            <div class="hidden md:block md:order-1">
              <SelectCurrency />
            </div>
            <MobileHeaderSettingsMenu />
            <NotificationsMenu v-if="user?.username" />
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-dark-700/25 via-dark-700/95 to-dark-700/25"
      />
    </header>

    <div
      class="mx-auto w-full 2xl:w-1/2 no-scrollbar pt-14"
      :class="showFooter ? 'min-h-screen' : 'flex flex-1 min-h-0 flex-col'"
    >
      <main :class="showFooter ? '' : 'flex-1 min-h-0 overflow-hidden'">
        <div class="mx-auto w-full lg:px-3" :class="[{ 'pb-16': !isDesktop }, showFooter ? '' : 'h-full']">
          <slot />
        </div>
      </main>
  
      <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-gray-700 md:hidden">
        <div class="mx-auto grid h-full w-full items-center" :style="mobileNavGridStyle">
          <router-link v-for="item in navItems" :key="item.id" :to="item.to"
            class="relative flex min-w-0 flex-col items-center justify-center px-0.5 transition-all duration-300 group" :class="{
              'opacity-100': isActiveRouteMobile(item),
              'opacity-70': !isActiveRouteMobile(item)
            }">
            <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white relative"
              :class="[
                isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                item.admin ? 'text-purple-400' : '',
                item.partner ? 'text-cyan-300' : ''
              ]">
              <component :is="item.icon" :size="22" stroke-width="1.5" />
              <span
                v-if="item.id === 'chats' && unreadTotal > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] text-white font-semibold flex items-center justify-center shadow-md"
              >
                {{ unreadTotal > 99 ? '99+' : unreadTotal }}
              </span>
            </div>
            <span
              class="menu-label mt-1 max-w-full truncate px-0.5 text-center text-[10px] font-light leading-none transition-colors duration-300 group-hover:text-white"
              :class="[
                isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                item.admin ? 'text-purple-300' : '',
                item.partner ? 'text-cyan-200' : ''
              ]">
              {{ item.title }}
            </span>
          </router-link>
        </div>
      </nav>
    </div>

    <MainPageFooter v-if="showFooter" />
  </div>
</template>

<style scoped>
.h-full-dvh {
  height: 100vh;
  height: 100dvh;
}

.mobile-nav-glass {
    background-color: var(--glass-bg-dark);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(30px);
    border-top-width: 1px;
    border-top-color: var(--overlay-white-15);
    box-shadow: 0 -8px 32px var(--shadow-black-40);
}

.icon-box {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-label {
  display: block;
  line-height: 1;
}

/* Smooth transitions for all interactive elements */
.router-link-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Improved hover effect */
.group:hover {
  transform: translateY(-1px);
}
</style>
