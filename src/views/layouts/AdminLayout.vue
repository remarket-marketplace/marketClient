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
  { 
    title: t('navigation.admin.main'), 
    icon: 'mdi:chart-box-outline', 
    to: '/admin' 
  },
  { 
    title: t('navigation.admin.users'), 
    icon: 'mdi:account-supervisor-outline', 
    to: '/admin/users' 
  },
  { 
    title: t('navigation.admin.products'), 
    icon: 'mdi:cube-outline',
    to: '/admin/products',
  },
  { 
    title: t('navigation.admin.deals'), 
    icon: 'mdi:cart-check', 
    to: '/admin/deals' 
  },
  {
    title: t('navigation.admin.categories'),
    icon: 'mdi:folder-multiple-outline',
    to: '/admin/categories',
  },
])
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-background text-mainText">
    <header class="flex-none border-b border-gray-700">
      <div class="mx-auto h-16 max-w-5xl w-full flex items-center justify-between px-4">
        <div class="flex flex-shrink-0 cursor-pointer items-center gap-2 text-xl text-mainText font-semibold" @click="router.push('/admin')">
          <p>remarket</p>
          <p class="text-gray-300 font-light">Admin</p>
        </div>

        <div class="flex gap-6">
          <nav class="hidden items-center gap-6 md:flex">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-1 text-mainText hover:text-gray-300"
            >
              <Icon :icon="item.icon" class="text-xl" />
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
      class="absolute bottom-0 left-0 right-0 z-30 h-20 border-t border-dark-700 bg-transparent rounded-t-2xl shadow-2xl md:hidden"
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