<script setup lang="ts">
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Folder,
  MessageCircle,
  MessageSquareText,
  History,
  Menu,
  X,
  ArrowLeft,
  Shield,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SelectLanguage from '@/components/SelectLanguage.vue'
import SelectCurrency from '@/components/SelectCurrency.vue'
import type { FunctionalComponent } from 'vue'
import type { LucideProps } from 'lucide-vue-next'

interface NavItem {
  id: string
  title: string
  to: string
  icon: FunctionalComponent<LucideProps, {}, any, {}>
  exact?: boolean
}

interface NavGroup {
  id: string
  title: string
  items: NavItem[]
}

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isDesktop = ref(false)
const mobileSidebarOpen = ref(false)

function checkDesktop() {
  isDesktop.value = window.innerWidth >= 1024
  if (isDesktop.value) {
    mobileSidebarOpen.value = false
  }
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

function pickNavItems(items: NavItem[], ids: string[]): NavItem[] {
  return ids
    .map(id => items.find(item => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
}

const navItems = computed<NavItem[]>(() => [
  {
    id: 'dashboard',
    title: t('navigation.admin.main'),
    icon: BarChart3,
    to: '/admin',
    exact: true,
  },
  {
    id: 'users',
    title: t('navigation.admin.users'),
    icon: Users,
    to: '/admin/users',
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
    to: '/admin/deals',
  },
  {
    id: 'categories',
    title: t('navigation.admin.categories'),
    icon: Folder,
    to: '/admin/categories',
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
])

const navGroups = computed<NavGroup[]>(() => {
  const items = navItems.value

  return [
    {
      id: 'overview',
      title: t('navigation.admin.sections.overview'),
      items: pickNavItems(items, ['dashboard']),
    },
    {
      id: 'management',
      title: t('navigation.admin.sections.management'),
      items: pickNavItems(items, ['users', 'products', 'deals', 'categories']),
    },
    {
      id: 'communication',
      title: t('navigation.admin.sections.communication'),
      items: pickNavItems(items, ['chats', 'feedback', 'activity-logs']),
    },
  ]
})

function isActiveRoute(item: NavItem): boolean {
  const currentPath = route.path

  if (item.exact) {
    return currentPath === item.to
  }

  return currentPath.startsWith(item.to)
}

const currentNavTitle = computed(() => {
  const active = navItems.value.find(item => isActiveRoute(item))
  return active?.title ?? t('navigation.admin.main')
})

watch(
  () => route.path,
  () => {
    if (!isDesktop.value) {
      closeMobileSidebar()
    }
  },
)

onMounted(() => {
  checkDesktop()
  window.addEventListener('resize', checkDesktop)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkDesktop)
})
</script>

<template>
  <div class="h-full-dvh w-screen bg-background text-mainText overflow-hidden">
    <div class="h-full flex">
      <aside class="hidden lg:flex w-80 shrink-0 border-r border-dark-700/80 bg-dark-900/40">
        <div class="h-full w-full flex flex-col p-4">
          <div class="rounded-xl border border-dark-700/80 bg-dark-800/50 p-3">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-dark-700/60"
              @click="router.push('/admin')"
            >
              <div class="flex items-center gap-2">
                <Shield class="h-5 w-5 text-blue-300" />
                <div>
                  <p class="text-sm font-semibold text-white">remarket</p>
                  <p class="text-xs text-gray-400">Admin Panel</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dark-700 bg-dark-700/50 px-3 py-2 text-xs text-gray-300 transition-colors hover:text-white hover:bg-dark-700"
              @click="router.push('/')"
            >
              <ArrowLeft class="h-4 w-4" />
              {{ t('navigation.admin.backToSite') }}
            </button>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 no-scrollbar space-y-5">
            <section
              v-for="group in navGroups"
              :key="group.id"
              class="space-y-2"
            >
              <p class="px-2 text-[11px] uppercase tracking-wide text-gray-500">
                {{ group.title }}
              </p>

              <nav class="space-y-1">
                <router-link
                  v-for="item in group.items"
                  :key="item.id"
                  :to="item.to"
                  class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                  :class="isActiveRoute(item)
                    ? 'border-blue-500/70 bg-blue-900/20 text-white'
                    : 'border-transparent text-gray-300 hover:border-dark-600 hover:bg-dark-700/45 hover:text-white'"
                >
                  <component
                    :is="item.icon"
                    class="h-4.5 w-4.5 shrink-0"
                    :class="isActiveRoute(item) ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-200'"
                  />
                  <span class="truncate">{{ item.title }}</span>
                </router-link>
              </nav>
            </section>
          </div>

        </div>
      </aside>

      <Transition name="fade">
        <div
          v-if="mobileSidebarOpen"
          class="fixed inset-0 z-40 bg-black/50 lg:hidden"
          @click="closeMobileSidebar"
        />
      </Transition>

      <Transition name="slide-left">
        <aside
          v-if="mobileSidebarOpen"
          class="fixed left-0 top-0 z-50 h-full w-80 max-w-[86vw] border-r border-dark-700/80 bg-dark-900/95 p-4 lg:hidden"
        >
          <div class="h-full flex flex-col">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Shield class="h-5 w-5 text-blue-300" />
                <p class="text-sm font-semibold text-white">Admin Menu</p>
              </div>
              <button
                type="button"
                class="rounded-md p-1.5 text-gray-300 hover:bg-dark-700/60 hover:text-white"
                @click="closeMobileSidebar"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              class="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-dark-700 bg-dark-700/50 px-3 py-2 text-xs text-gray-300 transition-colors hover:text-white hover:bg-dark-700"
              @click="router.push('/')"
            >
              <ArrowLeft class="h-4 w-4" />
              {{ t('navigation.admin.backToSite') }}
            </button>

            <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 no-scrollbar space-y-5">
              <section
                v-for="group in navGroups"
                :key="group.id"
                class="space-y-2"
              >
                <p class="px-2 text-[11px] uppercase tracking-wide text-gray-500">
                  {{ group.title }}
                </p>
                <nav class="space-y-1">
                  <router-link
                    v-for="item in group.items"
                    :key="item.id"
                    :to="item.to"
                    class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                    :class="isActiveRoute(item)
                      ? 'border-blue-500/70 bg-blue-900/20 text-white'
                      : 'border-transparent text-gray-300 hover:border-dark-600 hover:bg-dark-700/45 hover:text-white'"
                    @click="closeMobileSidebar"
                  >
                    <component
                      :is="item.icon"
                      class="h-4.5 w-4.5 shrink-0"
                      :class="isActiveRoute(item) ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-200'"
                    />
                    <span class="truncate">{{ item.title }}</span>
                  </router-link>
                </nav>
              </section>
            </div>

          </div>
        </aside>
      </Transition>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="h-14 shrink-0 border-b border-dark-700/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/65">
          <div class="h-full flex items-center justify-between px-3 lg:px-5">
            <div class="flex items-center gap-3 min-w-0">
              <button
                type="button"
                class="inline-flex lg:hidden items-center justify-center rounded-md border border-dark-700 bg-dark-700/40 p-2 text-gray-200"
                @click="toggleMobileSidebar"
              >
                <Menu class="h-4.5 w-4.5" />
              </button>
              <p class="truncate text-sm font-semibold text-white">
                {{ currentNavTitle }}
              </p>
            </div>

            <div class="hidden lg:flex items-center gap-2">
              <SelectCurrency />
              <SelectLanguage />
            </div>
          </div>
        </header>

        <main class="flex-1 min-h-0 overflow-hidden">
          <div
            class="h-full w-full 2xl:w-1/2 mx-auto px-1.5 lg:px-3"
          >
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.h-full-dvh {
  height: 100vh;
  height: 100dvh;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.22s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
