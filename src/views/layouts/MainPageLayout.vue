<script setup lang="ts">
import {
    Home,
    MessageCircle,
    PlusCircle,
    User
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'
import { chatsService } from '@/api/chats/chatsService'


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

    // For profile - starts with /profile
    if (item.to.startsWith('/profile')) {
        return currentPath.startsWith('/profile')
    }

    // For product view - starts with /product (but not creation)
    if (item.to.startsWith('/product/') && item.to !== '/product/create') {
        return currentPath.startsWith('/product/') && currentPath !== '/product/create'
    }

    return currentPath === item.to
}

// For mobile version, use the same logic
const isActiveRouteMobile = (item: any) => {
    return isActiveRoute(item)
}

onMounted(async () => {
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    await chatsService.connectChatsWebsocket()
})

const navItems = computed(() => [
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
        to: user && user.value?.username ? `/profile/${user.value.username}` : '/signin',
    },
])
</script>

<template>
    <div class="h-full w-screen flex flex-col overflow-hidden bg-background text-mainText pb-14 lg:pb-0">
        <header class="flex-none z-30 relative">
            <div class="mx-auto h-14 max-w-5xl w-full flex items-center justify-between px-4">
                <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-mainText font-semibold"
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
                                isActiveRoute(item) ? 'text-white' : 'text-gray-400',
                                'transition-colors duration-300 group-hover:text-white'
                            ]" :size="item.sell ? 24 : 20" stroke-width="1.5" />
                            <span class="ml-1 transition-colors duration-300 group-hover:text-white">
                                {{ item.title }}
                            </span>
                        </router-link>
                    </nav>

                    <SelectLanguage />
                </div>
            </div>
        </header>

        <main class="flex-1 overflow-hidden h-[max-content]">
            <div class="mx-auto h-full max-w-5xl w-full px-4 pb-6" :class="{ 'pb-16': !isDesktop }">
                <slot />
            </div>
        </main>

        <div class="w-full flex flex-col justify-center items-center">
            <footer class="w-full max-w-5xl px-4 py-6 flex flex-col md:flex-row md:justify-between gap-4 text-sm text-gray-300">
                <div class="flex-1">
                    <h4 class="font-semibold text-white">Support</h4>
                    <p class="mt-1">support@re-market.net</p>
                </div>

                <div class="flex-1">
                    <h4 class="font-semibold text-white">Legal</h4>
                    <p class="mt-1">
                        Органам государственной власти, правоохранительным органам. Правообладателям. По юридическим вопросам.
                    </p>
                    <p class="mt-2">legal@re-market.net</p>
                </div>

                <div class="flex-1">
                    <h4 class="font-semibold text-white">Information</h4>
                    <ul class="mt-1 space-y-1">
                        <li>About Us</li>
                        <li>Privacy Policy</li>
                        <li>Terms of Service</li>
                    </ul>
                </div>
            </footer>

            <p class="font-black m-0 p-0 leading-none text-[18vw] select-none pointer-events-none">
                REMARKET
            </p>
        </div>


        <nav class="mobile-nav-glass fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-gray-700 md:hidden">
            <div class="mx-auto h-full max-w-5xl w-full flex items-center justify-around">
                <router-link v-for="item in navItems" :key="item.id" :to="item.to"
                    class="flex flex-col items-center justify-center px-1 transition-all duration-300 relative group"
                    :class="{
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
</template>

<style scoped>
.h-full-dvh {
    height: 100vh;
    height: 100dvh;
}

.mobile-nav-glass {
    background-color: rgba(23, 23, 23, 0.9);
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
