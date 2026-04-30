<script setup lang="ts">
import {
    Home,
    MessageCircle,
    PlusCircle,
    User,
    Shield,
    BarChart3,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import MainPageFooter from '@/components/layout/MainPageFooter.vue'
import NotificationsMenu from '@/components/layout/NotificationsMenu.vue'
import MobileHeaderSettingsMenu from '@/components/layout/MobileHeaderSettingsMenu.vue'
import HeaderSearch from '@/components/layout/HeaderSearch.vue'
import type { FunctionalComponent } from 'vue'
import type { LucideProps } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'
import { buildAuthRedirectQuery } from '@/utils/authRedirect'

interface NavItem {
    id: string;
    title: string;
    icon: FunctionalComponent<LucideProps, {}, any, {}>;
    to: RouteLocationRaw;
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
const { unreadDialogTotal } = storeToRefs(chatStore)
const signInFromCurrentLocation = computed(() => ({
    path: '/signin',
    query: buildAuthRedirectQuery(route.fullPath),
}))

const getPartnerType = () => {
    if (user.value?.partner_type) return user.value.partner_type
    return user.value?.username?.toLowerCase() === 'scopevpn' ? 'vpn' : 'raika'
}

function checkDesktop() {
    isDesktop.value = window.innerWidth >= 768
}

function getNavItemPath(item: NavItem): string {
    if (typeof item.to === 'string') {
        return item.to
    }

    return typeof item.to.path === 'string' ? item.to.path : ''
}

const isActiveRoute = (item: NavItem) => {
    const currentPath = route.path
    const itemPath = getNavItemPath(item)

    // If we are on the authorization page, do not highlight menu items
    if (currentPath === '/signin' || currentPath === '/signup') {
        return false
    }

    // For the home page - exact match
    if (itemPath === '/') {
        return currentPath === '/'
    }

    // For chats - starts with /chats
    if (itemPath === '/chats') {
        return currentPath.startsWith('/chats')
    }

    // For creating a product - exact match
    if (itemPath === '/product/create') {
        return currentPath === '/product/create'
    }

    // For profile - starts with /user
    if (itemPath.startsWith('/user')) {
        return currentPath.startsWith('/user')
    }

    // For product view - starts with /product (but not creation)
    if (itemPath.startsWith('/product/') && itemPath !== '/product/create') {
        return currentPath.startsWith('/product/') && currentPath !== '/product/create'
    }

    // For admin - starts with /admin
    if (itemPath === '/admin') {
        return currentPath.startsWith('/admin')
    }

    if (itemPath.startsWith('/partner/')) {
        return currentPath.startsWith('/partner/')
    }

    return currentPath === itemPath
}

// For mobile version, use the same logic
const isActiveRouteMobile = (item: NavItem) => {
    return isActiveRoute(item)
}

onMounted(async () => {
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
})

const navItems = computed(() => {
    const items: NavItem[] = [
        {
            id: 'sell',
            title: t('navigation.market.sell'),
            icon: PlusCircle,
            to: '/product/create',
            sell: true
        },
        {
            id: 'chats',
            title: t('navigation.market.chats'),
            icon: MessageCircle,
            to: '/chats',
        },
        {
            id: 'profile',
            title: user && user.value?.username ? t('navigation.market.profile') : t('navigation.market.login'),
            icon: User,
            to: user && user.value?.username ? `/user/${user.value.username}` : signInFromCurrentLocation.value,
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
            to: '/product/create',
            sell: true
        },
        {
            id: 'chats',
            title: t('navigation.market.chats'),
            icon: MessageCircle,
            to: '/chats',
        },
        {
            id: 'profile',
            title: user && user.value?.username ? t('navigation.market.profile') : t('navigation.market.login'),
            icon: User,
            to: user && user.value?.username ? `/user/${user.value.username}` : signInFromCurrentLocation.value,
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

const roleNavItems = computed(() =>
    navItems.value.filter((item) => item.id === 'admin' || item.id === 'partner-stats'),
)

const primaryNavItems = computed(() =>
    navItems.value.filter((item) => item.id !== 'admin' && item.id !== 'partner-stats'),
)

const mobileNavGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(1, mobileNavItems.value.length)}, minmax(0, 1fr))`,
}))
</script>

<template>
    <div class="min-h-screen w-screen flex flex-col bg-background text-mainText">
        <header
            class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div class="mx-auto flex h-16 w-full items-center justify-between gap-2 px-1.5 sm:gap-3 lg:px-5 min-[2000px]:w-1/2">
                <div class="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
                    <div class="flex cursor-pointer items-center gap-2 text-base text-mainText font-extrabold sm:text-xl title"
                        @click="router.push('/')">
                        remarket
                    </div>
                </div>
                <HeaderSearch class="mx-2 sm:mx-3" />
                <div class="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
                    <nav class="hidden items-center gap-1 md:flex">
                        <router-link v-for="item in primaryNavItems" :key="item.id" :to="item.to"
                            class="group relative flex min-w-[3.35rem] flex-col items-center justify-center gap-1 px-1 text-center text-[11px] leading-none text-mainText transition-all duration-300 hover:text-[var(--nav-link-hover)]"
                            :class="{
                                'text-[var(--nav-link-active)]': isActiveRoute(item),
                                'text-[var(--nav-link-muted)]': !isActiveRoute(item)
                            }">
                            <div class="relative">
                                <component :is="item.icon" :class="[
                                    item.sell ? 'text-2xl' : 'text-xl',
                                    item.admin ? 'text-[var(--nav-admin-text)]' : '',
                                    item.partner ? 'text-[var(--nav-partner-text)]' : '',
                                    isActiveRoute(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                                    'transition-colors duration-300 group-hover:text-[var(--nav-link-active)]'
                                ]" :size="item.sell ? 24 : 22" stroke-width="1.5" />
                                <span
                                    v-if="item.id === 'chats' && unreadDialogTotal > 0"
                                    class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--nav-notification-bg)] text-[10px] text-[var(--text-primary-strong)] font-semibold flex items-center justify-center shadow-lg"
                                >
                                    {{ unreadDialogTotal > 99 ? '99+' : unreadDialogTotal }}
                                </span>
                            </div>
                            <span class="menu-label whitespace-nowrap px-0.5 text-center text-[11px] font-medium leading-none transition-colors duration-300 group-hover:text-[var(--nav-link-active)]"
                                :class="{ 'text-[var(--nav-admin-text-soft)]': item.admin, 'text-[var(--nav-partner-text-soft)]': item.partner }">
                                {{ item.title }}
                            </span>
                        </router-link>

                        <router-link v-for="item in roleNavItems" :key="item.id" :to="item.to"
                            class="group relative flex min-w-[3.35rem] flex-col items-center justify-center gap-1 px-1 text-center text-[11px] leading-none text-mainText transition-all duration-300 hover:text-[var(--nav-link-hover)]"
                            :class="{
                                'text-[var(--nav-link-active)]': isActiveRoute(item),
                                'text-[var(--nav-link-muted)]': !isActiveRoute(item)
                            }">
                            <div class="relative">
                                <component :is="item.icon" :class="[
                                    item.sell ? 'text-2xl' : 'text-xl',
                                    item.admin ? 'text-[var(--nav-admin-text)]' : '',
                                    item.partner ? 'text-[var(--nav-partner-text)]' : '',
                                    isActiveRoute(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                                    'transition-colors duration-300 group-hover:text-[var(--nav-link-active)]'
                                ]" :size="item.sell ? 24 : 22" stroke-width="1.5" />
                                <span
                                    v-if="item.id === 'chats' && unreadDialogTotal > 0"
                                    class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--nav-notification-bg)] text-[10px] text-[var(--text-primary-strong)] font-semibold flex items-center justify-center shadow-lg"
                                >
                                    {{ unreadDialogTotal > 99 ? '99+' : unreadDialogTotal }}
                                </span>
                            </div>
                            <span class="menu-label whitespace-nowrap px-0.5 text-center text-[11px] font-medium leading-none transition-colors duration-300 group-hover:text-[var(--nav-link-active)]"
                                :class="{ 'text-[var(--nav-admin-text-soft)]': item.admin, 'text-[var(--nav-partner-text-soft)]': item.partner }">
                                {{ item.title }}
                            </span>
                        </router-link>

                    </nav>

                    <MobileHeaderSettingsMenu />
                    <NotificationsMenu v-if="user?.username" />
                </div>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto">
            <div class="mx-auto w-full min-[2000px]:w-1/2">
                <div class="px-1.5 lg:px-3" :class="{ 'pb-16': !isDesktop }">
                    <slot />
                </div>
            </div>
        </main>

        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-[var(--mobile-nav-border)] md:hidden">
            <div class="mx-auto grid h-full w-full max-w-6xl min-[2000px]:max-w-screen-xl items-center"
                :style="mobileNavGridStyle">
                <router-link v-for="item in mobileNavItems" :key="item.id" :to="item.to"
                    class="relative flex min-w-0 flex-col items-center justify-center px-0.5 transition-all duration-300 group"
                    :class="{
                        'opacity-100': isActiveRouteMobile(item),
                        'opacity-70': !isActiveRouteMobile(item)
                    }">
                    <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-[var(--nav-link-active)] relative"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                            item.admin ? 'text-[var(--nav-admin-text)]' : '',
                            item.partner ? 'text-[var(--nav-partner-text)]' : ''
                        ]">
                        <component :is="item.icon" :size="22" stroke-width="1.5" />
                        <span
                            v-if="item.id === 'chats' && unreadDialogTotal > 0"
                            class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--nav-notification-bg)] text-[10px] text-[var(--text-primary-strong)] font-semibold flex items-center justify-center shadow-md"
                        >
                            {{ unreadDialogTotal > 99 ? '99+' : unreadDialogTotal }}
                        </span>
                    </div>
                    <span
                        class="menu-label mt-1 max-w-full truncate px-0.5 text-center text-[10px] font-light leading-none transition-colors duration-300 group-hover:text-[var(--nav-link-active)]"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                            item.admin ? 'text-[var(--nav-admin-text-soft)]' : '',
                            item.partner ? 'text-[var(--nav-partner-text-soft)]' : ''
                        ]">
                        {{ item.title }}
                    </span>
                </router-link>
            </div>
        </nav>

        <MainPageFooter />

        <!-- mobile nav -->
        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-[var(--mobile-nav-border)] md:hidden">
            <div class="mx-auto grid h-full w-full max-w-6xl min-[2000px]:max-w-screen-xl items-center"
                :style="mobileNavGridStyle">
                <router-link v-for="item in mobileNavItems" :key="item.id" :to="item.to"
                    class="relative flex min-w-0 flex-col items-center justify-center px-0.5 transition-all duration-300 group"
                    :class="{
                        'opacity-100': isActiveRouteMobile(item),
                        'opacity-70': !isActiveRouteMobile(item)
                    }">
                    <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-[var(--nav-link-active)] relative"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                            item.admin ? 'text-[var(--nav-admin-text)]' : '',
                            item.partner ? 'text-[var(--nav-partner-text)]' : ''
                        ]">
                        <component :is="item.icon" :size="22" stroke-width="1.5" />
                        <span
                            v-if="item.id === 'chats' && unreadDialogTotal > 0"
                            class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--nav-notification-bg)] text-[10px] text-[var(--text-primary-strong)] font-semibold flex items-center justify-center shadow-md"
                        >
                            {{ unreadDialogTotal > 99 ? '99+' : unreadDialogTotal }}
                        </span>
                    </div>
                    <span
                        class="menu-label mt-1 max-w-full truncate px-0.5 text-center text-[10px] font-light leading-none transition-colors duration-300 group-hover:text-[var(--nav-link-active)]"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-[var(--nav-link-active)]' : 'text-[var(--nav-link-muted)]',
                            item.admin ? 'text-[var(--nav-admin-text-soft)]' : '',
                            item.partner ? 'text-[var(--nav-partner-text-soft)]' : ''
                        ]">
                        {{ item.title }}
                    </span>
                </router-link>
            </div>
        </nav>
    </div>
</template>

<style scoped>
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
