<script setup lang="ts">
import { adminService, type PartnerGame, type PartnerStats } from '@/api/admin/AdminService'
import Loader from '@/components/Loader.vue'
import { computed, onMounted, ref } from 'vue'
import { formatCurrencyAmount } from '@/utils/currency'

const gameOptions: Array<{ value: PartnerGame; label: string }> = [
  { value: 'fortnite', label: 'Fortnite' },
  { value: 'roblox', label: 'Roblox' },
  { value: 'valorant', label: 'Valorant' },
]

const selectedGame = ref<PartnerGame>('fortnite')
const isLoading = ref(true)
const isError = ref(false)
const stats = ref<PartnerStats | null>(null)
const requestCounter = ref(0)

const currentGameLabel = computed(
  () => gameOptions.find((game) => game.value === selectedGame.value)?.label ?? 'Fortnite'
)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(value || 0))

const formatCurrency = (value: number) =>
  formatCurrencyAmount(value || 0)

const statusLabels: Record<string, string> = {
  pending: 'В ожидании',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  disputed: 'Спор',
  cancelled: 'Отменено',
  refunded: 'Возврат',
}

const statusRows = computed(() =>
  (stats.value?.deals_by_status ?? []).map((item) => ({
    ...item,
    label: statusLabels[item.status] ?? item.status,
  }))
)

const metricCards = computed(() => {
  if (!stats.value) return []
  return [
    { key: 'total', label: 'Всего аккаунтов в категории', value: formatNumber(stats.value.total_accounts) },
    { key: 'active', label: 'Сейчас выставлено', value: formatNumber(stats.value.active_listings) },
    { key: 'sold', label: 'Продано аккаунтов', value: formatNumber(stats.value.sold_accounts) },
    { key: 'deals', label: 'Всего сделок', value: formatNumber(stats.value.total_deals) },
    { key: 'revenue', label: 'Общая выручка', value: formatCurrency(stats.value.total_revenue) },
    { key: 'share', label: 'Доля продаж от всех аккаунтов', value: `${stats.value.sold_share_percent.toFixed(2)}%` },
    { key: 'avg', label: 'Средний чек сделки', value: formatCurrency(stats.value.average_deal_amount) },
    { key: 'raika', label: 'Проверено через raika', value: formatNumber(stats.value.raika_verified_accounts) },
  ]
})

const loadStats = async (game: PartnerGame) => {
  const requestId = ++requestCounter.value
  isLoading.value = true
  isError.value = false
  stats.value = null
  const data = await adminService.getPartnerStats(game)
  if (requestId !== requestCounter.value) return
  if (!data) {
    isError.value = true
    stats.value = null
  } else {
    stats.value = data
  }
  isLoading.value = false
}

const selectGame = (game: PartnerGame) => {
  if (selectedGame.value === game && !isError.value) return
  selectedGame.value = game
  void loadStats(game)
}

onMounted(() => {
  void loadStats(selectedGame.value)
})
</script>

<template>
  <section class="w-full min-h-[calc(100vh-120px)] pb-10 pt-6">
    <div class="max-w-6xl mx-auto px-2 lg:px-0 flex flex-col gap-4">
      <div class="rounded-2xl border border-dark-700 bg-dark-600 p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Partner Dashboard</p>
        <h1 class="text-2xl font-semibold text-white mt-1">Raika checker x Market</h1>
        <p class="text-sm text-gray-400 mt-2">
          Прозрачная статистика продаж по категории
          <span class="text-white font-medium">{{ stats?.category_name ?? currentGameLabel }}</span>.
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="game in gameOptions"
            :key="game.value"
            type="button"
            class="rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
            :class="selectedGame === game.value
              ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100'
              : 'border-dark-600 bg-dark-700 text-gray-300 hover:border-dark-500'"
            @click="selectGame(game.value)"
          >
            {{ game.label }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="rounded-2xl border border-dark-700 bg-dark-600 p-10 flex justify-center">
        <Loader />
      </div>

      <div
        v-else-if="isError"
        class="rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm"
      >
        Не удалось загрузить статистику. Попробуйте обновить страницу.
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div
            v-for="card in metricCards"
            :key="card.key"
            class="rounded-2xl border border-dark-700 bg-dark-600 p-4 transition-colors hover:border-dark-500"
          >
            <p class="text-xs text-gray-400">{{ card.label }}</p>
            <p class="text-xl font-semibold text-white mt-2">{{ card.value }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
          <h2 class="text-lg font-semibold text-white mb-3">Сделки по статусам</h2>
          <div v-if="statusRows.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-400 border-b border-dark-600">
                  <th class="py-2 pr-3 font-medium">Статус</th>
                  <th class="py-2 font-medium">Количество</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in statusRows"
                  :key="item.status"
                  class="border-b border-dark-700 last:border-b-0"
                >
                  <td class="py-2 pr-3 text-gray-200">{{ item.label }}</td>
                  <td class="py-2 text-white font-medium">{{ formatNumber(item.count) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-gray-400">В этой категории пока нет сделок.</p>
        </div>
      </template>
    </div>
  </section>
</template>
