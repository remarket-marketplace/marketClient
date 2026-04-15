<script setup lang="ts">
import { adminService, type ScopeVpnPartnerStats } from '@/api/admin/AdminService'
import Loader from '@/components/Loader.vue'
import { computed, onMounted, ref } from 'vue'
import { formatCurrencyAmount } from '@/utils/currency'

const isLoading = ref(true)
const isError = ref(false)
const stats = ref<ScopeVpnPartnerStats | null>(null)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(value || 0))

const formatCurrency = (value: number) =>
  formatCurrencyAmount(value || 0)

const planLabels: Record<string, string> = {
  trial: 'Пробный период',
  month: '1 месяц',
  quarter: '3 месяца',
  halfyear: '6 месяцев',
}

const statusLabels: Record<string, string> = {
  completed: 'Завершено',
  failed: 'Ошибка',
  pending: 'В ожидании',
}

const metricCards = computed(() => {
  if (!stats.value) return []
  return [
    { key: 'orders', label: 'Всего выдач', value: formatNumber(stats.value.total_orders) },
    { key: 'trials', label: 'Пробные периоды', value: formatNumber(stats.value.trial_count) },
    { key: 'purchases', label: 'Покупки', value: formatNumber(stats.value.purchase_count) },
    { key: 'revenue', label: 'Сумма покупок', value: formatCurrency(stats.value.total_purchase_amount) },
    { key: 'avg', label: 'Средний чек', value: formatCurrency(stats.value.average_purchase_amount) },
  ]
})

const planRows = computed(() =>
  (stats.value?.orders_by_plan ?? []).map((row) => ({
    ...row,
    label: planLabels[row.plan] ?? row.plan,
  })),
)

const statusRows = computed(() =>
  (stats.value?.orders_by_status ?? []).map((row) => ({
    ...row,
    label: statusLabels[row.status] ?? row.status,
  })),
)

async function loadStats() {
  isLoading.value = true
  isError.value = false
  const data = await adminService.getScopeVpnPartnerStats()
  if (!data) {
    isError.value = true
    stats.value = null
  } else {
    stats.value = data
  }
  isLoading.value = false
}

onMounted(() => {
  void loadStats()
})
</script>

<template>
  <section class="w-full min-h-[calc(100vh-120px)] pb-10 pt-6">
    <div class="max-w-6xl mx-auto px-2 lg:px-0 flex flex-col gap-4">
      <div class="rounded-2xl border border-dark-700 bg-dark-600 p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Partner Dashboard</p>
        <h1 class="mt-1 text-2xl font-semibold text-white">Scope VPN x Market</h1>
        <p class="mt-2 text-sm text-gray-400">
          Продажи, пробные периоды и выручка по интеграции Scope VPN.
        </p>
      </div>

      <div v-if="isLoading" class="rounded-2xl border border-dark-700 bg-dark-600 p-10 flex justify-center">
        <Loader />
      </div>

      <div
        v-else-if="isError"
        class="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      >
        Не удалось загрузить статистику. Попробуйте обновить страницу.
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div
            v-for="card in metricCards"
            :key="card.key"
            class="rounded-2xl border border-dark-700 bg-dark-600 p-4 transition-colors hover:border-dark-500"
          >
            <p class="text-xs text-gray-400">{{ card.label }}</p>
            <p class="mt-2 text-xl font-semibold text-white">{{ card.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
            <h2 class="mb-3 text-lg font-semibold text-white">Выдачи по периодам</h2>
            <div v-if="planRows.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-600 text-left text-gray-400">
                    <th class="py-2 pr-3 font-medium">Период</th>
                    <th class="py-2 pr-3 font-medium">Количество</th>
                    <th class="py-2 font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in planRows" :key="row.plan" class="border-b border-dark-700 last:border-b-0">
                    <td class="py-2 pr-3 text-gray-200">{{ row.label }}</td>
                    <td class="py-2 pr-3 font-medium text-white">{{ formatNumber(row.count) }}</td>
                    <td class="py-2 font-medium text-white">{{ formatCurrency(row.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-gray-400">Пока нет выдач.</p>
          </div>

          <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
            <h2 class="mb-3 text-lg font-semibold text-white">Статусы</h2>
            <div v-if="statusRows.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-600 text-left text-gray-400">
                    <th class="py-2 pr-3 font-medium">Статус</th>
                    <th class="py-2 font-medium">Количество</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in statusRows" :key="row.status" class="border-b border-dark-700 last:border-b-0">
                    <td class="py-2 pr-3 text-gray-200">{{ row.label }}</td>
                    <td class="py-2 font-medium text-white">{{ formatNumber(row.count) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-gray-400">Пока нет статусов.</p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
