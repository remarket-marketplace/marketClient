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
import { computed, onMounted, ref } from 'vue'
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import MainPageFooter from '@/components/layout/MainPageFooter.vue'
import { formatCompactCurrencyAmount, formatCurrencyAmount } from '@/utils/currency'
import NotificationsMenu from '@/components/layout/NotificationsMenu.vue'
import MobileHeaderSettingsMenu from '@/components/layout/MobileHeaderSettingsMenu.vue'
import SearchField from '@/components/SearchField.vue'
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
const HOME_STEAM_TOPUP_ENABLED = import.meta.env.VITE_STEAM_TOPUP_ENABLED !== 'false'

const isDesktop = ref(true)
const headerSearchQuery = ref('')
const { user } = storeToRefs(store)
const { unreadTotal } = storeToRefs(chatStore)
const isHomeRoute = computed(() => route.path === '/')
let headerSearchDebounce: ReturnType<typeof setTimeout> | null = null

const getPartnerType = () => {
    if (user.value?.partner_type) return user.value.partner_type
    return user.value?.username?.toLowerCase() === 'scopevpn' ? 'vpn' : 'raika'
}

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

    if (item.to.startsWith('/partner/')) {
        return currentPath.startsWith('/partner/')
    }

    return currentPath === item.to
}

// For mobile version, use the same logic
const isActiveRouteMobile = (item: NavItem) => {
    return isActiveRoute(item)
}

onMounted(async () => {
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', checkDesktop)
    if (headerSearchDebounce) {
        clearTimeout(headerSearchDebounce)
        headerSearchDebounce = null
    }
})

watch(
    () => [route.path, route.query.q],
    () => {
        if (!isHomeRoute.value) {
            headerSearchQuery.value = ''
            return
        }
        const routeSearch = typeof route.query.q === 'string' ? route.query.q : ''
        if (routeSearch !== headerSearchQuery.value) {
            headerSearchQuery.value = routeSearch
        }
    },
    { immediate: true },
)

const navItems = computed(() => {
    const items: NavItem[] = [
        {
            id: 'sell',
            title: t('navigation.market.sell'),
            icon: PlusCircle,
            to: user && user.value?.username ? '/product/create' : '/signin',
            sell: true
        },
        {
            id: 'chats',
            title: t('navigation.market.chats'),
            icon: MessageCircle,
            to: user && user.value?.username ? '/chats' : '/signin',
        },
        {
            id: 'profile',
            title: t('navigation.market.profile'),
            icon: User,
            to: user && user.value?.username ? `/user/${user.value.username}` : '/signin',
        },
    ]

    // add admin panel link if user is admin
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
        const partnerType = getPartnerType()
        const partnerRoute = partnerType === 'vpn' 
            ? '/partner/vpn-stats' 
            : '/partner/fortnite-stats'
        items.push({
            id: 'partner-stats',
            title: t('common.partner'),
            icon: BarChart3,
            to: partnerRoute,
            partner: true
        })
    }

    return items
})

const mobileNavItems = computed(() => {
    const items: NavItem[] = [
        {
            id: 'home',
            title: t('navigation.market.home'),
            icon: Home,
            to: '/'
        },
        {
            id: 'sell',
            title: t('navigation.market.sell'),
            icon: PlusCircle,
            to: user && user.value?.username ? '/product/create' : '/signin',
            sell: true
        },
        {
            id: 'chats',
            title: t('navigation.market.chats'),
            icon: MessageCircle,
            to: user && user.value?.username ? '/chats' : '/signin',
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
        const partnerType = getPartnerType()
        const partnerRoute = partnerType === 'vpn'
            ? '/partner/vpn-stats'
            : '/partner/fortnite-stats'
        items.push({
            id: 'partner-stats',
            title: t('common.partner'),
            icon: BarChart3,
            to: partnerRoute,
            partner: true
        })
    }

    return items
})

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

function goToSteamTopUp() {
    router.push('/steam-topup')
}

function onHeaderSearchChange(value: string) {
    if (!isHomeRoute.value) return
    if (headerSearchDebounce) clearTimeout(headerSearchDebounce)
    headerSearchDebounce = setTimeout(() => {
        const nextQuery = { ...route.query }
        const normalized = value.trim()
        if (normalized) {
            nextQuery.q = normalized
        } else {
            delete nextQuery.q
        }
        void router.replace({ path: '/', query: nextQuery })
    }, 170)
}

const mobileNavGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(1, mobileNavItems.value.length)}, minmax(0, 1fr))`,
}))
</script>

<template>
    <div class="min-h-screen w-screen flex flex-col bg-background text-mainText">
        <header
            class="layout-header fixed top-0 left-0 right-0 z-50">
            <div class="mx-auto w-full min-[2000px]:w-1/2">
                <div class="layout-header__inner mx-1.5 mt-2 flex h-16 items-center justify-between gap-2 rounded-2xl px-3 md:gap-3 md:px-4 lg:mx-3 lg:px-5">
                    <div class="flex min-w-0 items-center gap-2.5 md:gap-3">
                    <div class="layout-logo flex cursor-pointer items-center gap-2 text-xl text-mainText font-semibold sm:text-2xl"
                        @click="router.push('/')">
                        remarket
                    </div>
                    <button
                        v-if="HOME_STEAM_TOPUP_ENABLED"
                        type="button"
                        class="inline-flex h-9 min-w-0 max-w-[7.75rem] shrink items-center gap-1 rounded-full border border-gray-700/70 bg-dark-800/70 pl-2 pr-2 text-gray-200 transition-colors duration-200 hover:border-blue-400/35 hover:text-white md:hidden"
                        :title="t('pages.index.steamTopUp.title')"
                        @click="goToSteamTopUp"
                    >
                        <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-700 text-gray-300">
                            <Icon icon="mdi:steam" class="h-3.5 w-3.5" />
                        </span>
                        <span class="min-w-0 flex-1 truncate text-left text-[10px] font-medium leading-none sm:text-[11px]">
                            {{ t('pages.index.steamTopUp.title') }}
                        </span>
                    </button>
                    <button
                        v-if="HOME_STEAM_TOPUP_ENABLED"
                        type="button"
                        class="hidden h-9 min-w-0 max-w-[9.5rem] shrink items-center gap-1.5 rounded-full border border-gray-700/70 bg-dark-800/70 px-2.5 text-gray-200 transition-colors duration-200 hover:border-blue-400/35 hover:text-white lg:max-w-[8.75rem] xl:max-w-[10rem] min-[2000px]:max-w-none min-[2000px]:px-3 md:inline-flex"
                        :title="t('pages.index.steamTopUp.title')"
                        @click="goToSteamTopUp"
                    >
                        <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-colors duration-200 lg:h-5 lg:w-5 xl:h-6 xl:w-6">
                            <Icon icon="mdi:steam" class="h-4 w-4" />
                        </span>
                        <span class="min-w-0 truncate text-xs font-medium leading-none lg:text-[13px] xl:text-sm">
                            {{ t('pages.index.steamTopUp.title') }}
                        </span>
                    </button>
                </div>

                <div
                    v-if="isHomeRoute"
                    class="layout-header-search hidden min-w-[260px] max-w-[420px] flex-1 lg:block"
                >
                    <SearchField
                        v-model="headerSearchQuery"
                        :placeholder="t('pages.index.searchPlaceholder')"
                        class="layout-header-search-input"
                        @search-change="onHeaderSearchChange"
                    />
                </div>

                <div class="flex min-w-0 items-center gap-2 md:gap-3">
                    <nav class="hidden items-center gap-1 md:flex">
                        <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                            class="layout-main-nav__item flex items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
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
                            v-if="user"
                            type="button"
                            class="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-700/80 bg-dark-800/65 px-2.5 text-xs text-gray-200 transition-colors duration-200 hover:border-blue-400/35 hover:text-white focus:outline-none"
                            :title="walletTitle"
                            @click="goToWallet"
                        >
                            <Wallet class="h-3.5 w-3.5 text-blue-400" />
                            <span class="font-medium">{{ walletBalanceLabel }}</span>
                        </button>
                    </nav>

                    <button
                        v-if="user"
                        type="button"
                        class="inline-flex h-9 items-center gap-1 rounded-full border border-gray-700/70 bg-dark-800/70 px-2 text-[10px] text-gray-200 transition-colors duration-200 hover:border-blue-400/35 hover:text-white focus:outline-none md:hidden"
                        :title="walletTitle"
                        @click="goToWallet"
                    >
                        <Wallet class="h-3.5 w-3.5 text-blue-400" />
                        <span class="block max-w-[64px] truncate font-medium">{{ walletBalanceCompactLabel }}</span>
                    </button>
                    <MobileHeaderSettingsMenu />
                    <NotificationsMenu v-if="user?.username" />
                </div>
            </div>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto">
            <div class="mx-auto w-full min-[2000px]:w-1/2">
                <div class="px-1.5 lg:px-3" :class="{ 'pb-16': !isDesktop, 'pt-20': true }">
                    <slot />
                </div>
            </div>
        </main>

        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-gray-700 md:hidden">
            <div class="mx-auto grid h-full w-full max-w-6xl min-[2000px]:max-w-screen-xl items-center"
                :style="mobileNavGridStyle">
                <router-link v-for="item in mobileNavItems" :key="item.id" :to="item.to"
                    class="relative flex min-w-0 flex-col items-center justify-center px-0.5 transition-all duration-300 group"
                    :class="{
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

        <MainPageFooter />
    </div>
</template>

<style scoped>
.layout-header {
    background:
      radial-gradient(120% 160% at 10% -120%, rgb(var(--palette-blue-500) / 0.2) 0%, transparent 45%),
      radial-gradient(90% 120% at 100% -80%, rgb(var(--palette-purple-500) / 0.16) 0%, transparent 42%);
}

.layout-header__inner {
    border: 1px solid rgb(var(--palette-white) / 0.1);
    background: linear-gradient(140deg, rgb(var(--palette-gray-900) / 0.82), rgb(var(--palette-dark-800) / 0.82));
    box-shadow:
      inset 0 1px 0 rgb(var(--palette-white) / 0.06),
      0 14px 44px rgb(var(--palette-black) / 0.38);
    backdrop-filter: blur(18px) saturate(120%);
    -webkit-backdrop-filter: blur(18px) saturate(120%);
}

.layout-logo {
    letter-spacing: 0.02em;
    color: rgb(var(--palette-sky-50));
    text-shadow:
      0 0 18px rgb(var(--palette-blue-500) / 0.32),
      0 0 34px rgb(var(--palette-cyan-400) / 0.16);
}

.layout-header-search-input :deep(input) {
    min-height: 38px;
    border-radius: 9999px;
    border: 1px solid rgb(var(--palette-white) / 0.16);
    background: rgb(var(--palette-dark-700) / 0.5);
    box-shadow: inset 0 1px 0 rgb(var(--palette-white) / 0.06);
    font-size: 0.83rem;
}

.layout-header-search-input :deep(svg) {
    height: 1rem;
    width: 1rem;
    color: rgb(var(--palette-gray-400));
}

.layout-main-nav__item {
    border-radius: 0.7rem;
    padding: 0.42rem 0.72rem;
    border: 1px solid transparent;
}

.layout-main-nav__item:hover {
    border-color: rgb(var(--palette-white) / 0.08);
    background: rgb(var(--palette-white) / 0.03);
    box-shadow: 0 0 18px rgb(var(--palette-blue-500) / 0.2);
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

.icon-box svg {
    display: block;
    width: 22px;
    height: 22px;
    max-width: 22px;
    max-height: 22px;
    vertical-align: middle;
    margin: 0;
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
