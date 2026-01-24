<script setup lang="ts">
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Folder
} from 'lucide-vue-next'

import { computed, onMounted, ref } from 'vue'
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

  // For the main admin page - exact match
  if (item.to === '/admin') {
    return currentPath === '/admin'
  }

  // For other pages - starts with path
  return currentPath.startsWith(item.to)
}

// For mobile version, use the same logic
const isActiveRouteMobile = (item: any) => {
  return isActiveRoute(item)
}

onMounted(async () => {
  checkDesktop()
  window.addEventListener('resize', checkDesktop)
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
  <div class="h-full-dvh w-screen flex items-center flex-col overflow-hidden bg-background text-mainText">
    <div class="flex flex-col 2xl:w-1/2 w-full overflow-scroll ">
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
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 px-3 py-1.5 rounded-lg transition-all duration-300 group">
                <svg class="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none"
                  stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {{ t('navigation.admin.backToSite') }}
              </router-link>
            </div>
          </div>

          <div class="flex gap-6">
            <nav class="hidden items-center gap-6 md:flex">
              <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                class="flex items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
                :class="{
                  'text-white': isActiveRoute(item),
                  'text-gray-400': !isActiveRoute(item)
                }">
                <component :is="item.icon" class="text-xl transition-colors duration-300 group-hover:text-white"
                  :class="isActiveRoute(item) ? 'text-white' : 'text-gray-400'" :size="20" stroke-width="1.5" />
                <span class="ml-1 transition-colors duration-300 group-hover:text-white">
                  {{ item.title }}
                </span>
              </router-link>
            </nav>

            <SelectLanguage />
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-hidden h-screen">
        <div class="mx-auto h-full w-full px-2" :class="{ 'pb-16': !isDesktop }">
          <slot />
        </div>
      </main>

      <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-gray-700 md:hidden">
        <div class="mx-auto h-full w-full flex items-center justify-around">
          <router-link v-for="item in navItems" :key="item.id" :to="item.to"
            class="flex flex-col items-center justify-center px-1 transition-all duration-300 relative group" :class="{
              'opacity-100': isActiveRouteMobile(item),
              'opacity-70': !isActiveRouteMobile(item)
            }">
            <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white"
              :class="isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400'">
              <component :is="item.icon" :size="22" stroke-width="1.5" />
            </div>
            <span
              class="menu-label text-center text-xs font-light leading-none mt-1 transition-colors duration-300 group-hover:text-white"
              :class="isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400'">
              {{ item.title }}
            </span>
          </router-link>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.h-full-dvh {
  height: 100vh;
  /* Fallback for older browsers */
  height: 100dvh;
  /* Dynamic Viewport Height for proper iOS display */
}

/* Apple Design Style (Frosted Glass) */
.mobile-nav-glass {
  background-color: rgba(23, 23, 23, 0.2);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-top-width: 1px;
  border-top-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
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
