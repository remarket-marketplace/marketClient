<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { storeToRefs } from 'pinia'


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
  console.log('check')
  await store.fetchUser()
})

const navItems = computed(() => [
  { title: t('market.home'), icon: 'mdi:home-outline', to: '/' },
  { title: t('market.chats'), icon: 'mdi:chat-outline', to: '/chats' },
  {
    title: t('market.sell'),
    icon: 'mdi:plus-circle-outline',
    to: user && user.value?.username ? '/product/create' : '/signin', sell: true },
  {
    title: t('market.profile'),
    icon: 'mdi:account-circle-outline',
    to: user && user.value?.username ? `/profile/${user.value.username}` : '/signin',
  },
])
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-dark-900 text-white">
    <header class="flex-none border-b border-gray-700 bg-dark-900">
      <div class="mx-auto h-16 max-w-5xl w-full flex items-center justify-between px-4 lg:px-8">
        <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-white font-semibold" @click="router.push('/')">
          remarket
        </div>

        <nav class="hidden items-center gap-6 md:flex">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-1 text-white hover:text-gray-300"
          >
            <Icon :icon="item.icon" :class="item.sell ? 'text-2xl' : 'text-xl'" />
            <span>{{ item.title }}</span>
          </router-link>
        </nav>
      </div>
    </header>

    <main class="flex-1 overflow-hidden">
      <div
        class="mx-auto h-full max-w-5xl w-full px-4 py-6"
        :class="{ 'pb-20': !isDesktop }"
      >
        <RouterView v-slot="{ Component }">
          <Suspense>
            <component :is="Component" :key="$route.path" />
            
            <template #fallback>
              <div class="flex h-full items-center justify-center">
                <Icon icon="eos-icons:loading" class="h-8 w-8 animate-spin text-blue-500" />
                <span class="ml-3 text-lg text-gray-400">Загрузка...</span>
              </div>
            </template>
          </Suspense>
        </RouterView>
      </div>
    </main>

    <nav
      class="fixed bottom-0 left-0 right-0 z-30 h-20 border-t border-dark-700 rounded-t-2xl bg-dark-900/40 shadow-2xl backdrop-blur-lg md:hidden"
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
/* Ваши стили для иконок и лейблов */
.icon-box {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Убираем baseline-артефакты и делаем svg block */
.icon-box svg {
  display: block; /* убирает baseline смещение */
  width: 22px; /* точный размер */
  height: 22px;
  max-width: 22px;
  max-height: 22px;
  vertical-align: middle;
  margin: 0;
}

/* Для иконок со stroke — если нужно, можно чуть увеличить stroke */
.icon-box svg [stroke] {
  stroke-width: 1.5; /* аккуратно, влияет только если иконка использует stroke */
}

/* Текст — ровно под иконкой */
.menu-label {
  display: block;
  line-height: 1;
}
</style>