<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import router from '@/router'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isMobile = ref(false)
const dashboardData = ref<any>()

// Навигация к продукту
function goToProduct(id: string) {
  router.push({ path: `/product/${id}` })
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

async function getDashboardData() {
  dashboardData.value = await adminService.getDashboardData()
}

onMounted(async () => {
  try {
    checkMobile()
    window.addEventListener('resize', checkMobile)
    getDashboardData()
  }
  catch (error) {
    console.error('Ошибка при загрузке данных:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-6 overflow-hidden lg:flex-row">
    <div v-if="dashboardData" class="grid grid-cols-2 gap-2">
      <div class="flex border border-dark-300 rounded-lg p-5 gap-1">
        <p class="text-gray-400">{{ $t('pages.admin.mainPage.countOfUsers') }}</p>
        {{ dashboardData['count_of_users'] }}
      </div>
      <div class="flex border border-dark-300 rounded-lg p-5 gap-1">
        <p class="text-gray-400">{{ $t('pages.admin.mainPage.countOfProducts') }}</p>
        {{ dashboardData['count_of_products'] }}
      </div>
    </div>
  </section>
</template>