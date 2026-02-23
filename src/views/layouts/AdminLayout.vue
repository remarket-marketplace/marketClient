<script setup lang="ts">
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Folder,
  MessageCircle,
  MessageSquareText,
  History
} from 'lucide-vue-next'

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'

const store = useUserStore()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isDesktop = ref(true)
const { user } = storeToRefs(store)

function checkDesktop() {
  isDesktop.value = window.innerWidth >= 768
}

const isActiveRoute = (item: any) => {
  const currentPath = route.path

  if (item.to === '/admin') {
    return currentPath === '/admin'
  }

  return currentPath.startsWith(item.to)
}

const isActiveRouteMobile = (item: any) => {
  return isActiveRoute(item)
}

onMounted(async () => {
  checkDesktop()
  window.addEventListener('resize', checkDesktop)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkDesktop)
})

const navItems = computed(() => [
  {
    id: 'dashboard',
    title: t('navigation.admin.main'),
    icon: BarChart3,
    to: '/admin'
  },
  {
    id: 'users',
    title: t('navigation.admin.users'),
    icon: Users,
    to: '/admin/users'
  },
  {
    id: 'chats',
    title: t('navigation.admin.chats'),
    icon: MessageCircle,
    to: '/admin/support/chats',
  },
  {
    id: 'feedback',
    title: t('navigation.admin.feedback'),
    icon: MessageSquareText,
    to: '/admin/feedback',
  },
  {
    id: 'activity-logs',
    title: t('navigation.admin.activityLogs'),
    icon: History,
    to: '/admin/activity-logs',
  },
  {
    id: 'products',
    title: t('navigation.admin.products'),
    icon: Package,
    to: '/admin/products',
  },
  {
    id: 'deals',
    title: t('navigation.admin.deals'),
    icon: ShoppingCart,
    to: '/admin/deals'
  },
  {
    id: 'categories',
    title: t('navigation.admin.categories'),
    icon: Folder,
    to: '/admin/categories',
  },
])
</script>

<template>
  <div class="h-full-dvh w-screen flex flex-col bg-background text-mainText overflow-hidden">
    <header class="flex-none z-30 relative">
      <div class="mx-auto h-14 w-full flex items-center justify-between px-2 lg:px-4">
        <div class="flex items-center gap-4">
          <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-mainText font-semibold"
            @click="router.push('/admin')">
            <p>remarket</p>
            <p class="text-gray-300 font-light">Admin</p>
          </div>

          <div class="flex items-center">
            <div class="h-4 w-px bg-gray-700"></div>
            <router-link to="/"
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 px-2 md:px-3 py-1.5 rounded-lg transition-all duration-300 group">
              <svg class="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span class="hidden md:inline">{{ t('navigation.admin.backToSite') }}</span>
            </router-link>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
          <div class="hidden min-w-0 flex-1 md:block">
            <div class="w-full overflow-x-auto no-scrollbar">
              <nav class="ml-auto flex min-w-full w-max items-center justify-end gap-6 pr-1">
                <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                  class="flex shrink-0 items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
                  :class="{
                    'text-white': isActiveRoute(item),
                    'text-gray-400': !isActiveRoute(item)
                  }">
                  <component :is="item.icon" class="text-xl transition-colors duration-300 group-hover:text-white"
                    :class="isActiveRoute(item) ? 'text-white' : 'text-gray-400'" :size="20" stroke-width="1.5" />
                  <span class="ml-1 transition-colors duration-300 group-hover:text-white whitespace-nowrap">
                    {{ item.title }}
                  </span>
                </router-link>
              </nav>
            </div>
          </div>

          <div class="shrink-0">
            <SelectLanguage />
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 min-h-0 overflow-hidden">
      <div class="flex w-full 2xl:w-1/2 mx-auto h-full px-2" :class="{ 'pb-16': !isDesktop }">
        <slot />
      </div>
    </main>

    <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-gray-700 md:hidden">
      <div class="mobile-nav-scroll mx-auto h-full w-full overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x">
        <div class="h-full min-w-full w-max flex items-center justify-start gap-1 px-2">
        <router-link v-for="item in navItems" :key="item.id" :to="item.to"
          class="flex h-11 min-w-[74px] max-w-[92px] snap-start flex-col items-center justify-center rounded-lg px-2 transition-all duration-300 relative group flex-shrink-0"
          :class="isActiveRouteMobile(item)
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'">
          <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white"
            :class="isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400'">
            <component :is="item.icon" :size="22" stroke-width="1.5" />
          </div>
          <span
            class="menu-label max-w-full truncate text-center text-[10px] font-light leading-none mt-1 transition-colors duration-300 group-hover:text-white"
            :class="isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400'">
            {{ item.title }}
          </span>
        </router-link>
        </div>
      </div>
    </nav>
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
  backdrop-filter: blur(20px);
  border-top-width: 1px;
  border-top-color: var(--overlay-white-15);
  box-shadow: 0 -8px 32px var(--shadow-black-40);
}

.mobile-nav-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

.icon-box {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-box svg {
  display: block;
  width: 22px;
  height: 22px;
  max-width: 22px;
  max-height: 22px;
  vertical-align: middle;
  margin: 0;
}

.icon-box svg [stroke] {
  stroke-width: 1.5;
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
