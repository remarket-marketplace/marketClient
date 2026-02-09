<script setup lang="ts">
import {
    Home,
    MessageCircle,
    PlusCircle,
    User,
    Shield
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'
import MainPageFooter from '@/components/layout/MainPageFooter.vue'
import type { FunctionalComponent } from 'vue'
import type { LucideProps } from 'lucide-vue-next'

interface NavItem {
    id: string;
    title: string;
    icon: FunctionalComponent<LucideProps, {}, any, {}>;
    to: string;
    sell?: boolean;
    admin?: boolean;
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

    return items
})
</script>

<template>
    <div class="min-h-screen w-screen flex flex-col bg-background text-mainText">
        <header
            class="fixed top-0 left-0 right-0 z-50 border-b border-dark-700 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div class="mx-auto h-14 w-full flex items-center justify-between px-2 lg:px-4 2xl:w-1/2">
                <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-mainText font-semibold title"
                    @click="router.push('/')">
                    remarket
                </div>
                <div class="flex gap-6">
                    <nav class="hidden items-center gap-6 md:flex">
                        <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                            class="flex items-center gap-1 text-sm text-mainText hover:text-gray-300 transition-all duration-300 relative group"
                            :class="{
                                'text-white': isActiveRoute(item),
                                'text-gray-400': !isActiveRoute(item)
                            }">
                            <div class="relative">
                                <component :is="item.icon" :class="[
                                    item.sell ? 'text-2xl' : 'text-xl',
                                    item.admin ? 'text-purple-400' : '',
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
                                :class="{ 'text-purple-300': item.admin }">
                                {{ item.title }}
                            </span>
                        </router-link>
                    </nav>
                    <SelectLanguage />
                </div>
            </div>
        </header>

        <main class="flex-1 pt-14 overflow-y-auto">
            <div class="mx-auto w-full 2xl:w-1/2">
                <div class="px-2 lg:px-4" :class="{ 'pb-16': !isDesktop }">
                    <slot />
                </div>
            </div>
        </main>

        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-gray-700 md:hidden">
            <div class="mx-auto h-full w-full max-w-6xl 2xl:max-w-screen-xl flex items-center justify-around">
                <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                    class="flex flex-col items-center justify-center px-1 transition-all duration-300 relative group"
                    :class="{
                        'opacity-100': isActiveRouteMobile(item),
                        'opacity-70': !isActiveRouteMobile(item)
                    }">
                    <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white relative"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                            item.admin ? 'text-purple-400' : ''
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
                        class="menu-label text-center text-xs font-light leading-none mt-1 transition-colors duration-300 group-hover:text-white"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                            item.admin ? 'text-purple-300' : ''
                        ]">
                        {{ item.title }}
                    </span>
                </router-link>
            </div>
        </nav>

        <MainPageFooter />

        <!-- mobile nav -->
        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-gray-700 md:hidden">
            <div class="mx-auto h-full w-full max-w-6xl 2xl:max-w-screen-xl flex items-center justify-around">
                <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                    class="flex flex-col items-center justify-center px-1 transition-all duration-300 relative group"
                    :class="{
                        'opacity-100': isActiveRouteMobile(item),
                        'opacity-70': !isActiveRouteMobile(item)
                    }">
                    <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white relative"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                            item.admin ? 'text-purple-400' : ''
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
                        class="menu-label text-center text-xs font-light leading-none mt-1 transition-colors duration-300 group-hover:text-white"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                            item.admin ? 'text-purple-300' : ''
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
    background-color: rgba(23, 23, 23, 0.2);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(30px);
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
