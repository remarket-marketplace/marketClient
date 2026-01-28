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
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'
import { chatsService } from '@/api/chats/chatsService'
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
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isDesktop = ref(true)
const { user } = storeToRefs(store)

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
    if (user.value)
        await chatsService.connectChatsWebsocket()
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
                            <component :is="item.icon" :class="[
                                item.sell ? 'text-2xl' : 'text-xl',
                                item.admin ? 'text-purple-400' : '',
                                isActiveRoute(item) ? 'text-white' : 'text-gray-400',
                                'transition-colors duration-300 group-hover:text-white'
                            ]" :size="item.sell ? 24 : 20" stroke-width="1.5" />
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

        <!-- footer - outside main to span full width -->
        <footer
            class="relative w-full px-4 md:px-6 lg:px-8 pt-12 pb-22 lg:pb-16 overflow-hidden border-t border-dark-700">
            <div class="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <div class="absolute inset-0 bg-grid opacity-20"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent">
                </div>

                <!-- Subtle gradient accents -->
                <div
                    class="absolute -left-20 bottom-10 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]">
                </div>
                <div
                    class="absolute -right-20 top-10 w-[250px] h-[250px] bg-cyan-500/5 rounded-full blur-[60px]">
                </div>
            </div>

            <div class="relative z-10 max-w-7xl mx-auto">
                <!-- Верхняя часть футера с логотипом и описанием -->
                <div class="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
                    <div class="flex-1 max-w-lg">
                        <div class="flex items-center gap-3 mb-6">
                            <div
                                class="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                <span class="text-white font-bold text-xl">RM</span>
                            </div>
                            <span class="text-2xl font-bold text-white">remarket</span>
                        </div>
                        <p class="text-gray-400 text-lg leading-relaxed font-light max-w-md">
                            {{ $t('common.tagline') }}
                        </p>
                    </div>

                    <!-- Ссылки на разделы -->
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
                        <div>
                            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.product', 'Продукт')
                            }}</h4>
                            <ul class="space-y-3">
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.features', 'Возможности') }}</a></li>
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.pricing', 'Тарифы') }}</a></li>
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('common.aboutUs', 'О нас') }}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.support') }}</h4>
                            <ul class="space-y-3">
                                <li><a href="mailto:support@re-market.net"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">support@re-market.net</a>
                                </li>
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.helpCenter', 'Центр помощи') }}</a></li>
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.community', 'Сообщество') }}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-semibold text-white text-lg mb-4">{{ $t('common.legal') }}</h4>
                            <ul class="space-y-3">
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.privacyPolicy', 'Политика конфиденциальности') }}</a></li>
                                <li><a href="#"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">{{
                                            $t('footer.termsOfService', 'Условия использования') }}</a></li>
                                <li><a href="mailto:legal@re-market.net"
                                        class="text-gray-400 hover:text-white transition-colors duration-300 font-light">legal@re-market.net</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Разделитель -->
                <div class="h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent my-8">
                </div>

                <!-- Нижняя часть футера с копирайтом и соцсетями -->
                <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="text-gray-500 text-sm font-light">
                        © {{ new Date().getFullYear() }} remarket. {{ $t('common.rightsReserved') }}
                    </div>
                </div>
            </div>
        </footer>

        <!-- mobile nav -->
        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-gray-700 md:hidden">
            <div class="mx-auto h-full w-full max-w-6xl 2xl:max-w-screen-xl flex items-center justify-around">
                <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                    class="flex flex-col items-center justify-center px-1 transition-all duration-300 relative group"
                    :class="{
                        'opacity-100': isActiveRouteMobile(item),
                        'opacity-70': !isActiveRouteMobile(item)
                    }">
                    <div class="icon-box flex items-center justify-center transition-colors duration-300 group-hover:text-white"
                        :class="[
                            isActiveRouteMobile(item) ? 'text-white' : 'text-gray-400',
                            item.admin ? 'text-purple-400' : ''
                        ]">
                        <component :is="item.icon" :size="22" stroke-width="1.5" />
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

.bg-grid {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='60' height='60' fill='none' stroke='rgb(255 255 255 / 0.03)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
}
</style>