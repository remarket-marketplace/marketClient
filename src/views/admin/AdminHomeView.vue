<script setup lang="ts">
import { adminService, type DashboardData } from '@/api/admin/AdminService'
import Loader from '@/components/Loader.vue'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Package,
  Users,
} from 'lucide-vue-next'
import type { ApexOptions } from 'apexcharts'
import { computed, onMounted, ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useI18n } from 'vue-i18n'

type Trend = { diff: number; percent: number; isUp: boolean; isFlat: boolean }

const { t } = useI18n()
const ApexChart = VueApexCharts

const dashboardData = ref<DashboardData | null>(null)
const isLoading = ref(true)
const isError = ref(false)
const selectedRange = ref(30)
const rangeOptions = [7, 30, 90, 180]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(value || 0))

const formatShortNumber = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return formatNumber(value)
}

const calcTrend = (series?: { value: number }[]): Trend => {
  if (!series || series.length < 2) return { diff: 0, percent: 0, isUp: false, isFlat: true }
  const last = series[series.length - 1]?.value ?? 0
  const prev = series[series.length - 2]?.value ?? 0
  const diff = last - prev
  const percent = prev === 0 ? (last ? 100 : 0) : (diff / prev) * 100
  return { diff, percent, isUp: diff > 0, isFlat: diff === 0 }
}

const revenueTrend = computed(() => calcTrend(dashboardData.value?.revenue_by_day))
const usersTrend = computed(() => calcTrend(dashboardData.value?.new_users_by_day))

const dealsStatus = computed(() => dashboardData.value?.deals_by_status ?? [])
const topCategories = computed(() => dashboardData.value?.top_categories ?? [])

const avgCheck = computed(() => {
  if (!dashboardData.value || !dashboardData.value.count_of_deals) return 0
  return dashboardData.value.total_revenue / dashboardData.value.count_of_deals
})

const getStatusCount = (status: string) =>
  dealsStatus.value.find(item => item.status === status)?.count ?? 0

const revenueSeries = computed(() => {
  const revenue = dashboardData.value?.revenue_by_day ?? []
  const users = dashboardData.value?.new_users_by_day ?? []
  return [
    {
      name: t('pages.admin.mainPage.revenue'),
      type: 'area',
      data: revenue.map(point => [new Date(point.date).getTime(), Number(point.value || 0)]),
    },
    {
      name: t('pages.admin.mainPage.newUsers'),
      type: 'line',
      data: users.map(point => [new Date(point.date).getTime(), Number(point.value || 0)]),
    },
  ]
})

const revenueOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'line' as const,
    toolbar: { show: false },
    background: 'transparent',
    foreColor: '#9ca3af',
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: [3, 2.4] },
  markers: {
    size: 4,
    strokeWidth: 0,
    hover: { size: 7 },
  },
  colors: ['#38bdf8', '#a855f7'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
  },
  xaxis: {
    type: 'datetime',
    labels: {
      style: { colors: '#9ca3af' },
      datetimeUTC: false,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: [
    {
      labels: {
        style: { colors: '#9ca3af' },
        formatter: (val: number) => formatShortNumber(val),
      },
      title: { text: t('pages.admin.mainPage.revenue'), style: { color: '#9ca3af' } },
    },
    {
      opposite: true,
      labels: {
        style: { colors: '#9ca3af' },
        formatter: (val: number) => formatNumber(val),
      },
      title: { text: t('pages.admin.mainPage.newUsers'), style: { color: '#9ca3af' } },
    },
  ],
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    labels: { colors: '#e5e7eb' },
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.08)',
    strokeDashArray: 4,
  },
  tooltip: {
    shared: true,
    x: { format: 'dd MMM' },
    y: {
      formatter: (val: number, opts: any) =>
        opts.seriesIndex === 0
          ? formatCurrency(val)
          : `${formatNumber(val)} ${t('pages.admin.mainPage.usersShort')}`,
    },
    theme: 'dark',
    style: {
      fontSize: '12px',
      fontFamily: 'Outfit, sans-serif',
    },
    marker: { show: false },
    onDatasetHover: { highlightDataSeries: true },
  },
}))

const statusOptions = computed<ApexOptions>(() => {
  const statuses = dealsStatus.value
  const categories = statuses.map(s => t(`common.dealStatuses.${s.status}`) ?? s.status)
  const colorsMap: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#22d3ee',
    completed: '#22c55e',
    disputed: '#fb7185',
    cancelled: '#94a3b8',
    refunded: '#f97316',
  }
  const colors = statuses.map(s => colorsMap[s.status] || '#60a5fa')
  return {
    chart: { type: 'bar' as const, toolbar: { show: false }, foreColor: '#9ca3af' },
    plotOptions: {
      bar: {
        columnWidth: '50%',
        borderRadius: 8,
      },
    },
    dataLabels: { enabled: false },
    colors,
    xaxis: {
      categories,
      labels: { style: { colors: '#9ca3af' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af' },
        formatter: (val: number) => formatNumber(val),
      },
    },
  grid: { borderColor: 'rgba(255,255,255,0.08)', strokeDashArray: 4 },
  tooltip: {
    theme: 'dark',
    style: { fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
    y: { formatter: (val: number) => formatNumber(val) },
  },
}
})

const statusSeries = computed(() => [
  {
    name: t('pages.admin.mainPage.deals'),
    data: dealsStatus.value.map(s => s.count),
  },
])

const topCategoriesOptions = computed<ApexOptions>(() => ({
  chart: { type: 'bar' as const, toolbar: { show: false }, foreColor: '#9ca3af' },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '60%',
      borderRadius: 8,
    },
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => formatShortNumber(val),
    style: { colors: ['#e5e7eb'] },
  },
  xaxis: {
    categories: topCategories.value.map(c => c.category_name),
    labels: { style: { colors: '#9ca3af' } },
  },
  colors: ['#34d399'],
  grid: { borderColor: 'rgba(255,255,255,0.08)', strokeDashArray: 4 },
  tooltip: {
    y: { formatter: (val: number) => formatCurrency(val) },
  },
}))

const topCategoriesSeries = computed(() => [
  {
    name: t('pages.admin.mainPage.revenue'),
    data: topCategories.value.map(c => Number(c.total_sales || 0)),
  },
])

const summaryCards = computed(() => {
  const data = dashboardData.value
  if (!data) return []
  return [
    {
      id: 'revenue',
      label: t('pages.admin.mainPage.totalRevenue'),
      value: formatCurrency(data.total_revenue),
      trend: revenueTrend.value,
      sublabel: t('pages.admin.mainPage.lastDays', { days: selectedRange.value }),
      icon: DollarSign,
      gradient: 'from-cyan-500/80 to-blue-500/70',
    },
    {
      id: 'deals',
      label: t('pages.admin.mainPage.totalDeals'),
      value: formatNumber(data.count_of_deals),
      sublabel: t('pages.admin.mainPage.disputesActive', { count: formatNumber(data.active_disputes) }),
      icon: Activity,
      gradient: 'from-emerald-500/80 to-lime-500/70',
    },
    {
      id: 'users',
      label: t('pages.admin.mainPage.totalUsers'),
      value: formatNumber(data.count_of_users),
      trend: usersTrend.value,
      sublabel: t('pages.admin.mainPage.lastDays', { days: selectedRange.value }),
      icon: Users,
      gradient: 'from-violet-500/80 to-indigo-500/70',
    },
    {
      id: 'products',
      label: t('pages.admin.mainPage.totalProducts'),
      value: formatNumber(data.count_of_products),
      sublabel: t('pages.admin.mainPage.onModeration', { count: formatNumber(data.moderation_products) }),
      icon: Package,
      gradient: 'from-amber-500/80 to-orange-500/70',
    },
    {
      id: 'avg-check',
      label: t('pages.admin.mainPage.averageCheck'),
      value: formatCurrency(avgCheck.value),
      sublabel: t('pages.admin.mainPage.perDeal'),
      icon: AlertTriangle,
      gradient: 'from-sky-500/80 to-cyan-500/70',
    },
  ]
})

const loadDashboard = async () => {
  isLoading.value = true
  isError.value = false
  const data = await adminService.getDashboardData(selectedRange.value)
  if (!data) {
    isError.value = true
  } else {
    dashboardData.value = data
  }
  isLoading.value = false
}

onMounted(loadDashboard)
watch(selectedRange, loadDashboard)
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 overflow-hidden pb-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">
          {{ t('pages.admin.mainPage.title') }}
        </p>
        <h1 class="text-2xl font-semibold text-white">
          {{ t('pages.admin.mainPage.overview') }}
        </h1>
      </div>

      <div class="flex items-center gap-2 bg-dark-700/70 border border-dark-500/60 rounded-xl p-1">
        <button
          v-for="range in rangeOptions"
          :key="range"
          class="px-3 py-1.5 text-sm rounded-lg transition-all duration-200"
          :class="selectedRange === range ? 'bg-white/10 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'"
          @click="selectedRange = range"
        >
          {{ range }} {{ t('pages.admin.mainPage.days') }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center h-[320px]">
      <Loader />
    </div>

    <div
      v-else-if="isError"
      class="rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm"
    >
      {{ t('pages.admin.mainPage.loadError') }}
    </div>

    <div v-else class="flex flex-col gap-5 overflow-y-auto pb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="card in summaryCards"
          :key="card.id"
          class="relative overflow-hidden rounded-2xl border border-dark-500/50 bg-dark-700/70 p-4 shadow-lg shadow-black/20"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm text-gray-400">{{ card.label }}</p>
              <p class="text-2xl font-semibold text-white leading-tight">{{ card.value }}</p>
            </div>
            <div
              class="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-br"
              :class="card.gradient"
            >
              <component :is="card.icon" class="text-white" :size="22" />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <div
              v-if="card.trend"
              class="flex items-center gap-1 rounded-lg px-2 py-1"
              :class="card.trend.isFlat ? 'bg-white/5 text-gray-300' : card.trend.isUp ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'"
            >
              <component
                :is="card.trend.isFlat ? Activity : card.trend.isUp ? ArrowUpRight : ArrowDownRight"
                :size="14"
              />
              <span>{{ card.trend.percent.toFixed(1) }}% {{ t('pages.admin.mainPage.vsPrevDay') }}</span>
            </div>
            <span class="text-gray-400">{{ card.sublabel }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 rounded-2xl border border-dark-500/50 bg-dark-700/70 p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm text-gray-300 font-semibold">
                {{ t('pages.admin.mainPage.chartTitleRevenue') }}
              </p>
              <p class="text-xs text-gray-500">{{ t('pages.admin.mainPage.lastDays', { days: selectedRange }) }}</p>
            </div>
          </div>
          <ApexChart
            height="320"
            type="line"
            :options="revenueOptions"
            :series="revenueSeries"
          />
        </div>

        <div class="rounded-2xl border border-dark-500/50 bg-dark-700/70 p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-300 font-semibold">
              {{ t('pages.admin.mainPage.dealsByStatus') }}
            </p>
          </div>
          <ApexChart
            height="320"
            type="bar"
            :options="statusOptions"
            :series="statusSeries"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-dark-500/50 bg-dark-700/70 p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-300 font-semibold">
              {{ t('pages.admin.mainPage.topCategories') }}
            </p>
          </div>
          <div v-if="topCategories.length" class="min-h-[320px]">
            <ApexChart
              height="320"
              type="bar"
              :options="topCategoriesOptions"
              :series="topCategoriesSeries"
            />
          </div>
          <div v-else class="flex h-[320px] items-center justify-center text-gray-500 text-sm">
            {{ t('pages.admin.mainPage.noCategories') }}
          </div>
        </div>

        <div class="rounded-2xl border border-dark-500/50 bg-dark-700/70 p-4">
          <p class="text-sm text-gray-300 font-semibold mb-3">
            {{ t('pages.admin.mainPage.quickStats') }}
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.pending') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('pending')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.completed') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('completed')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.refunded') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('refunded')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.disputed') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('disputed')) }}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('pages.admin.mainPage.activeDisputes') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(dashboardData?.active_disputes ?? 0) }}</p>
            </div>
            <div class="rounded-xl border border-dark-500/60 bg-dark-800/60 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('pages.admin.mainPage.onModeration', { count: '' }) }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(dashboardData?.moderation_products ?? 0) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
