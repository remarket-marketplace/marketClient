<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import SelectLanguage from '@/components/SelectLanguage.vue'

const store = useUserStore()
const { t } = useI18n()
const router = useRouter()

const isDesktop = ref(true)
const { user } = storeToRefs(store)

function checkDesktop() {
  isDesktop.value = window.innerWidth >= 768
}

onMounted(async () => {
  checkDesktop()
  window.addEventListener('resize', checkDesktop)
})

const navItems = computed(() => [
  { title: t('navigation.market.home'), icon: 'mdi:home-outline', to: '/' },
  { 
    title: t('navigation.market.chats'),
    icon: 'mdi:chat-outline',
    to: user && user.value?.username ? '/chats' : '/signin',
  },
  {
    title: t('navigation.market.sell'), 
    icon: 'mdi:plus-circle-outline',
    to: user && user.value?.username ? '/product/create' : '/signin', 
    sell: true 
  },
  {
    title: t('navigation.market.profile'),
    icon: 'mdi:account-circle-outline',
    to: user && user.value?.username ? `/profile/${user.value.username}` : '/signin',
  },
])
</script>

<template>
  <div class="h-full-dvh w-screen flex flex-col overflow-hidden bg-background text-mainText">
    <header class="flex-none border-b border-gray-700">
      <div class="mx-auto h-16 max-w-5xl w-full flex items-center justify-between px-4">
        <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-mainText font-semibold" @click="router.push('/')">
          remarket
        </div>

        <div class="flex gap-6">
          <nav class="hidden items-center gap-6 md:flex">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-1 text-mainText hover:text-gray-300"
            >
              <Icon :icon="item.icon" :class="item.sell ? 'text-2xl' : 'text-xl'" />
              <span>{{ item.title }}</span>
            </router-link>
          </nav>

          <SelectLanguage />
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-hidden h-screen">
      <div
        class="mx-auto h-full max-w-5xl w-full px-4 py-6"
        :class="{ 'pb-20': !isDesktop }"
      >
        <slot />
      </div>
    </main>

    <nav
      class="mobile-nav-glass absolute bottom-0 left-0 right-0 z-30 h-20 border-t border-gray-700 md:hidden"
    >
      <div class="mx-auto h-full max-w-5xl w-full flex items-center justify-around">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center px-1 transition-all duration-150"
        >
          <div class="icon-box flex items-center justify-center">
            <Icon :icon="item.icon" :width="22" :height="22" inline />
          </div>
          <span class="menu-label mt-[3px] text-center text-[11px] font-medium leading-none">
            {{ item.title }}
          </span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.h-full-dvh {
  height: 100vh; /* Fallback для старых браузеров */
  height: 100dvh; /* Используем Dynamic Viewport Height */
}

/* НОВЫЙ СТИЛЬ: Эффект стекла (Frosted Glass)
   - backdrop-filter: blur(10px) создает эффект размытия фона.
   - background-color: rgba(...) делает панель полупрозрачной. 
*/
.mobile-nav-glass {
  /* Предполагая, что у вас темная тема, используем полупрозрачный темный фон */
  background-color: rgba(23, 23, 23, 0.8); /* dark-900 / 80% прозрачности */
  -webkit-backdrop-filter: blur(10px); /* Для Safari */
  backdrop-filter: blur(10px);
  
  /* Убираем border-t border-dark-700 из Tailwind и делаем его более subtle */
  border-top-width: 1px;
  border-top-color: rgba(255, 255, 255, 0.1); /* Слегка видимая белая линия */
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2); /* Немного мягкой тени */
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
</style>