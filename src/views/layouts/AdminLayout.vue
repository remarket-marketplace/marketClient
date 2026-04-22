<script setup lang="ts">
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  ArrowUpFromLine,
  TicketPercent,
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
    id: 'payments',
    title: t('navigation.admin.payments'),
    icon: CreditCard,
    to: '/admin/payments',
  },
  {
    id: 'withdrawals',
    title: t('navigation.admin.withdrawals'),
    icon: ArrowUpFromLine,
    to: '/admin/withdrawals',
  },
  {
    id: 'promo-codes',
    title: t('pages.admin.steamTopupsPage.title'),
    icon: TicketPercent,
    to: '/admin/promo-codes',
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
      items: pickNavItems(items, ['users', 'products', 'deals', 'payments', 'withdrawals', 'promo-codes', 'categories']),
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
      <aside class="hidden lg:flex w-80 shrink-0 border-r border-[rgb(var(--palette-dark-700)/0.8)] bg-[rgb(var(--palette-dark-900)/0.4)]">
        <div class="h-full w-full flex flex-col p-4">
          <div class="rounded-xl border border-[rgb(var(--palette-dark-700)/0.8)] bg-[rgb(var(--palette-dark-800)/0.5)] p-3">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-[rgb(var(--palette-dark-700)/0.6)]"
              @click="router.push('/admin')"
            >
              <div class="flex items-center gap-2">
                <Shield class="h-5 w-5 text-[var(--text-link)]" />
                <div>
                  <p class="text-sm font-semibold text-[var(--text-title)]">remarket</p>
                  <p class="text-xs text-[var(--text-muted)]">Admin Panel</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.5)] px-3 py-2 text-xs text-[var(--text-body)] transition-colors hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700))]"
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
              <p class="px-2 text-[11px] uppercase tracking-wide text-[var(--text-meta)]">
                {{ group.title }}
              </p>

              <nav class="space-y-1">
                <router-link
                  v-for="item in group.items"
                  :key="item.id"
                  :to="item.to"
                  class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                  :class="isActiveRoute(item)
                    ? 'border-[rgb(var(--palette-blue-500)/0.7)] bg-[rgb(var(--palette-blue-900)/0.2)] text-[var(--text-title)]'
                    : 'border-[color:var(--transparent)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-600))] hover:bg-[rgb(var(--palette-dark-700)/0.45)] hover:text-[var(--text-title)]'"
                >
                  <component
                    :is="item.icon"
                    class="h-4.5 w-4.5 shrink-0"
                    :class="isActiveRoute(item) ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-body-strong)]'"
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
          class="fixed inset-0 z-40 bg-[rgb(var(--palette-black)/0.5)] lg:hidden"
          @click="closeMobileSidebar"
        />
      </Transition>

      <Transition name="slide-left">
        <aside
          v-if="mobileSidebarOpen"
          class="fixed left-0 top-0 z-50 h-full w-80 max-w-[86vw] border-r border-[rgb(var(--palette-dark-700)/0.8)] bg-[rgb(var(--palette-dark-900)/0.95)] p-4 lg:hidden"
        >
          <div class="h-full flex flex-col">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Shield class="h-5 w-5 text-[var(--text-link)]" />
                <p class="text-sm font-semibold text-[var(--text-title)]">Admin Menu</p>
              </div>
              <button
                type="button"
                class="rounded-md p-1.5 text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]"
                @click="closeMobileSidebar"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              class="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.5)] px-3 py-2 text-xs text-[var(--text-body)] transition-colors hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700))]"
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
                <p class="px-2 text-[11px] uppercase tracking-wide text-[var(--text-meta)]">
                  {{ group.title }}
                </p>
                <nav class="space-y-1">
                  <router-link
                    v-for="item in group.items"
                    :key="item.id"
                    :to="item.to"
                    class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                    :class="isActiveRoute(item)
                      ? 'border-[rgb(var(--palette-blue-500)/0.7)] bg-[rgb(var(--palette-blue-900)/0.2)] text-[var(--text-title)]'
                      : 'border-[color:var(--transparent)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-600))] hover:bg-[rgb(var(--palette-dark-700)/0.45)] hover:text-[var(--text-title)]'"
                    @click="closeMobileSidebar"
                  >
                    <component
                      :is="item.icon"
                      class="h-4.5 w-4.5 shrink-0"
                      :class="isActiveRoute(item) ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-body-strong)]'"
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
        <header class="h-14 shrink-0 border-b border-[rgb(var(--palette-dark-700)/0.7)] bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/65">
          <div class="h-full flex items-center justify-between px-3 lg:px-5">
            <div class="flex items-center gap-3 min-w-0">
              <button
                type="button"
                class="inline-flex lg:hidden items-center justify-center rounded-md border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.4)] p-2 text-[var(--text-body-strong)]"
                @click="toggleMobileSidebar"
              >
                <Menu class="h-4.5 w-4.5" />
              </button>
              <p class="truncate text-sm font-semibold text-[var(--text-title)]">
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
            class="h-full w-full px-1.5 lg:px-4 2xl:px-5"
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
