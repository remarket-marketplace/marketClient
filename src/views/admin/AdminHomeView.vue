<script setup lang="ts">
import {
  adminService,
  type DashboardData,
  type PlatformSettings,
} from '@/api/admin/AdminService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
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
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCurrencyAmount } from '@/utils/currency'

type Trend = { diff: number; percent: number; isUp: boolean; isFlat: boolean }

const { t } = useI18n()
const ApexChart = shallowRef<any>(null)
const apexReady = computed(() => !!ApexChart.value)

const dashboardData = ref<DashboardData | null>(null)
const isLoading = ref(true)
const isError = ref(false)
const selectedRange = ref(30)
const rangeOptions = [7, 30, 90, 180]
const platformSettings = ref<PlatformSettings | null>(null)
const isPlatformSettingsLoading = ref(true)
const isPlatformSettingsSaving = ref(false)
const platformSettingsError = ref('')
const platformSettingsSuccess = ref('')
const pendingPlatformToggle = ref<{
  key: 'registration_enabled' | 'product_creation_enabled' | 'telegram_integration_enabled'
  nextValue: boolean
} | null>(null)

const CHART_COLORS = {
  axisText: '#9ca3af',
  legendText: '#e5e7eb',
  gridBorder: '#334155',
  revenue: '#0ea5e9',
  users: '#a855f7',
  statusPending: '#f59e0b',
  statusConfirmed: '#22d3ee',
  statusCompleted: '#22c55e',
  statusDisputed: '#fb7185',
  statusCancelled: '#94a3b8',
  statusRefunded: '#f97316',
  statusDefault: '#60a5fa',
  topCategories: '#34d399',
} as const

function normalizeApexColor(value: string, fallback: string): string {
  const parse = (input: string): [number, number, number] | null => {
    const normalized = input.trim()
    if (!normalized || normalized.includes('var(')) return null

    const hex = normalized.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)
    if (hex) {
      const source = hex[1] ?? ''
      if (!source) return null
      if (source.length === 3) {
        return source.split('').map((part) => Number.parseInt(`${part}${part}`, 16)) as [number, number, number]
      }
      return [
        Number.parseInt(source.slice(0, 2), 16),
        Number.parseInt(source.slice(2, 4), 16),
        Number.parseInt(source.slice(4, 6), 16),
      ]
    }

    const rgbLike = normalized.match(/^rgba?\((.+)\)$/i)
    if (!rgbLike) return null

    const body = rgbLike[1] ?? ''
    if (!body) return null
    const numbers = body.match(/[\d.]+/g)
    if (!numbers || numbers.length < 3) return null

    const r = Math.max(0, Math.min(255, Math.round(Number(numbers[0]))))
    const g = Math.max(0, Math.min(255, Math.round(Number(numbers[1]))))
    const b = Math.max(0, Math.min(255, Math.round(Number(numbers[2]))))
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
    return [r, g, b]
  }

  const rgb = parse(value) ?? parse(fallback) ?? [96, 165, 250]
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

const cssVar = (token: string, fallback: string) => {
  if (typeof window === 'undefined') return normalizeApexColor('', fallback)
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return normalizeApexColor(value, fallback)
}

const formatCurrency = (value: number) =>
  formatCurrencyAmount(value || 0)

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

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toSafeString = (value: unknown, fallback: string) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return fallback
}

const revenueTrend = computed(() => calcTrend(dashboardData.value?.revenue_by_day))
const usersTrend = computed(() => calcTrend(dashboardData.value?.new_users_by_day))

const dealsStatus = computed(() => {
  const rows = dashboardData.value?.deals_by_status
  if (!Array.isArray(rows)) return []

  return rows.map((row) => ({
    status: toSafeString((row as any)?.status, 'unknown').toLowerCase(),
    count: Math.max(0, Math.round(toSafeNumber((row as any)?.count, 0))),
  }))
})

const topCategories = computed(() => {
  const rows = dashboardData.value?.top_categories
  if (!Array.isArray(rows)) return []

  return rows.map((row) => ({
    category_id: String((row as any)?.category_id ?? ''),
    category_name: toSafeString((row as any)?.category_name, t('common.notSpecified')),
    total_sales: Math.max(0, toSafeNumber((row as any)?.total_sales, 0)),
    total_deals: Math.max(0, Math.round(toSafeNumber((row as any)?.total_deals, 0))),
  }))
})

const avgCheck = computed(() => {
  if (!dashboardData.value || !dashboardData.value.count_of_deals) return 0
  return dashboardData.value.total_revenue / dashboardData.value.count_of_deals
})

const getStatusCount = (status: string) =>
  dealsStatus.value.find(item => item.status === status)?.count ?? 0

const revenueSeries = computed(() => {
  const revenue = Array.isArray(dashboardData.value?.revenue_by_day)
    ? dashboardData.value.revenue_by_day
    : []
  const users = Array.isArray(dashboardData.value?.new_users_by_day)
    ? dashboardData.value.new_users_by_day
    : []
  const toTimestamp = (rawDate: unknown) => {
    if (typeof rawDate !== 'string') return Date.now()
    const parsed = Date.parse(rawDate)
    return Number.isFinite(parsed) ? parsed : Date.now()
  }
  return [
    {
      name: t('pages.admin.mainPage.revenue'),
      type: 'area',
      data: revenue.map(point => [toTimestamp((point as any)?.date), toSafeNumber((point as any)?.value, 0)]),
    },
    {
      name: t('pages.admin.mainPage.newUsers'),
      type: 'line',
      data: users.map(point => [toTimestamp((point as any)?.date), toSafeNumber((point as any)?.value, 0)]),
    },
  ]
})

const revenueOptions = computed<ApexOptions>(() => {
  const axisText = cssVar('--chart-axis-text', CHART_COLORS.axisText)
  const legendText = cssVar('--chart-legend-text', CHART_COLORS.legendText)
  const gridBorder = cssVar('--chart-grid-border', CHART_COLORS.gridBorder)
  const revenueColor = cssVar('--chart-series-revenue', CHART_COLORS.revenue)
  const usersColor = cssVar('--chart-series-users', CHART_COLORS.users)

  return {
    chart: {
      type: 'line' as const,
      toolbar: { show: false },
      background: 'transparent',
      foreColor: axisText,
      fontFamily: 'Outfit, sans-serif',
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: [3, 2.4] },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: { size: 7 },
    },
    colors: [revenueColor, usersColor],
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
        style: { colors: axisText },
        datetimeUTC: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        labels: {
          style: { colors: axisText },
          formatter: (val: number) => formatShortNumber(val),
        },
        title: { text: t('pages.admin.mainPage.revenue'), style: { color: axisText } },
      },
      {
        opposite: true,
        labels: {
          style: { colors: axisText },
          formatter: (val: number) => formatNumber(val),
        },
        title: { text: t('pages.admin.mainPage.newUsers'), style: { color: axisText } },
      },
    ],
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: legendText },
    },
    grid: {
      borderColor: gridBorder,
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
  }
})

const statusOptions = computed<ApexOptions>(() => {
  const axisText = cssVar('--chart-axis-text', CHART_COLORS.axisText)
  const gridBorder = cssVar('--chart-grid-border', CHART_COLORS.gridBorder)
  const statuses = dealsStatus.value
  const categories = statuses.map((s) => {
    const translated = t(`common.dealStatuses.${s.status}`)
    const label = translated || s.status || t('common.notSpecified')
    return String(label)
  })
  const colorsMap: Record<string, string> = {
    pending: cssVar('--chart-status-pending', CHART_COLORS.statusPending),
    confirmed: cssVar('--chart-status-confirmed', CHART_COLORS.statusConfirmed),
    completed: cssVar('--chart-status-completed', CHART_COLORS.statusCompleted),
    disputed: cssVar('--chart-status-disputed', CHART_COLORS.statusDisputed),
    cancelled: cssVar('--chart-status-cancelled', CHART_COLORS.statusCancelled),
    refunded: cssVar('--chart-status-refunded', CHART_COLORS.statusRefunded),
  }
  const fallbackColor = cssVar('--chart-status-default', CHART_COLORS.statusDefault)
  const colors = statuses.map(s => colorsMap[s.status] || fallbackColor)
  return {
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      foreColor: axisText,
      fontFamily: 'Outfit, sans-serif',
    },
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
      labels: { style: { colors: axisText } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: axisText },
        formatter: (val: number) => formatNumber(val),
      },
    },
    grid: { borderColor: gridBorder, strokeDashArray: 4 },
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

const topCategoriesOptions = computed<ApexOptions>(() => {
  const axisText = cssVar('--chart-axis-text', CHART_COLORS.axisText)
  const legendText = cssVar('--chart-legend-text', CHART_COLORS.legendText)
  const gridBorder = cssVar('--chart-grid-border', CHART_COLORS.gridBorder)
  const seriesColor = cssVar('--chart-series-top-categories', CHART_COLORS.topCategories)

  return {
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      foreColor: axisText,
      fontFamily: 'Outfit, sans-serif',
    },
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
      style: { colors: [legendText] },
    },
    xaxis: {
      categories: topCategories.value.map(c => String(c.category_name || t('common.notSpecified'))),
      labels: { style: { colors: axisText } },
    },
    colors: [seriesColor],
    grid: { borderColor: gridBorder, strokeDashArray: 4 },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
      y: { formatter: (val: number) => formatCurrency(val) },
    },
  }
})

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

const loadPlatformSettings = async () => {
  isPlatformSettingsLoading.value = true
  platformSettingsError.value = ''
  const data = await adminService.getPlatformSettings()
  if (!data) {
    platformSettingsError.value = t('pages.admin.mainPage.platformSettingsLoadError')
  } else {
    platformSettings.value = data
  }
  isPlatformSettingsLoading.value = false
}

const updatePlatformSettings = async (payload: PlatformSettings) => {
  if (isPlatformSettingsSaving.value) return

  isPlatformSettingsSaving.value = true
  platformSettingsError.value = ''
  platformSettingsSuccess.value = ''

  const updated = await adminService.updatePlatformSettings(payload)
  if (!updated) {
    platformSettingsError.value = t('pages.admin.mainPage.platformSettingsSaveError')
  } else {
    platformSettings.value = updated
    platformSettingsSuccess.value = t('pages.admin.mainPage.platformSettingsSaved')
  }

  isPlatformSettingsSaving.value = false
}

const openRegistrationToggleConfirm = async () => {
  if (!platformSettings.value) return
  pendingPlatformToggle.value = {
    key: 'registration_enabled',
    nextValue: !platformSettings.value.registration_enabled,
  }
}

const openProductCreationToggleConfirm = async () => {
  if (!platformSettings.value) return
  pendingPlatformToggle.value = {
    key: 'product_creation_enabled',
    nextValue: !platformSettings.value.product_creation_enabled,
  }
}

const openTelegramIntegrationToggleConfirm = async () => {
  if (!platformSettings.value) return
  pendingPlatformToggle.value = {
    key: 'telegram_integration_enabled',
    nextValue: !platformSettings.value.telegram_integration_enabled,
  }
}

const closePlatformToggleConfirm = () => {
  if (isPlatformSettingsSaving.value) return
  pendingPlatformToggle.value = null
}

const platformToggleConfirmTitle = computed(() =>
  t('pages.admin.mainPage.confirmToggleTitle'),
)

const platformToggleConfirmMessage = computed(() => {
  if (!pendingPlatformToggle.value) return ''
  const { key, nextValue } = pendingPlatformToggle.value
  if (key === 'registration_enabled') {
    return nextValue
      ? t('pages.admin.mainPage.confirmRegistrationEnableMessage')
      : t('pages.admin.mainPage.confirmRegistrationDisableMessage')
  }
  if (key === 'product_creation_enabled') {
    return nextValue
      ? t('pages.admin.mainPage.confirmProductCreationEnableMessage')
      : t('pages.admin.mainPage.confirmProductCreationDisableMessage')
  }
  return nextValue
    ? t('pages.admin.mainPage.confirmTelegramIntegrationEnableMessage')
    : t('pages.admin.mainPage.confirmTelegramIntegrationDisableMessage')
})

const confirmPlatformToggle = async () => {
  if (!platformSettings.value || !pendingPlatformToggle.value) return

  const { key, nextValue } = pendingPlatformToggle.value
  await updatePlatformSettings({
    ...platformSettings.value,
    [key]: nextValue,
  })
  pendingPlatformToggle.value = null
}

onMounted(async () => {
  if (!ApexChart.value) {
    const mod = await import('vue3-apexcharts')
    ApexChart.value = mod.default
  }
  await Promise.all([loadDashboard(), loadPlatformSettings()])
})
watch(selectedRange, loadDashboard)
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 overflow-hidden pb-6 pt-3 md:pt-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400">
          {{ t('pages.admin.mainPage.title') }}
        </p>
        <h1 class="text-2xl font-semibold text-white">
          {{ t('pages.admin.mainPage.overview') }}
        </h1>
      </div>

      <div class="flex items-center gap-2 bg-dark-600 border border-dark-700 rounded-xl p-1">
        <button
          v-for="range in rangeOptions"
          :key="range"
          class="admin-btn-tab"
          :class="selectedRange === range ? 'admin-btn-tab-active' : ''"
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
      <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
        <div class="mb-3">
          <p class="text-sm font-semibold text-gray-200">
            {{ t('pages.admin.mainPage.platformSettingsTitle') }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('pages.admin.mainPage.platformSettingsHint') }}
          </p>
        </div>

        <div v-if="isPlatformSettingsLoading" class="py-6 flex items-center justify-center">
          <Loader />
        </div>

        <template v-else>
          <div
            v-if="platformSettingsError"
            class="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {{ platformSettingsError }}
          </div>

          <div
            v-if="platformSettingsSuccess"
            class="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          >
            {{ platformSettingsSuccess }}
          </div>

          <div v-if="platformSettings" class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-sm text-gray-200 font-medium">
                {{ t('pages.admin.mainPage.registrationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-gray-400">
                {{ t('pages.admin.mainPage.registrationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.registration_enabled
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25'"
                :disabled="isPlatformSettingsSaving"
                @click="openRegistrationToggleConfirm"
              >
                {{
                  platformSettings.registration_enabled
                    ? t('pages.admin.mainPage.enabled')
                    : t('pages.admin.mainPage.disabled')
                }}
              </button>
            </div>

            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-sm text-gray-200 font-medium">
                {{ t('pages.admin.mainPage.productCreationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-gray-400">
                {{ t('pages.admin.mainPage.productCreationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.product_creation_enabled
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25'"
                :disabled="isPlatformSettingsSaving"
                @click="openProductCreationToggleConfirm"
              >
                {{
                  platformSettings.product_creation_enabled
                    ? t('pages.admin.mainPage.enabled')
                    : t('pages.admin.mainPage.disabled')
                }}
              </button>
            </div>

            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-sm text-gray-200 font-medium">
                {{ t('pages.admin.mainPage.telegramIntegrationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-gray-400">
                {{ t('pages.admin.mainPage.telegramIntegrationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.telegram_integration_enabled
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25'"
                :disabled="isPlatformSettingsSaving"
                @click="openTelegramIntegrationToggleConfirm"
              >
                {{
                  platformSettings.telegram_integration_enabled
                    ? t('pages.admin.mainPage.enabled')
                    : t('pages.admin.mainPage.disabled')
                }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="card in summaryCards"
          :key="card.id"
          class="relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-600 p-4 transition-colors hover:border-dark-500"
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
        <div class="xl:col-span-2 rounded-2xl border border-dark-700 bg-dark-600 p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm text-gray-300 font-semibold">
                {{ t('pages.admin.mainPage.chartTitleRevenue') }}
              </p>
              <p class="text-xs text-gray-500">{{ t('pages.admin.mainPage.lastDays', { days: selectedRange }) }}</p>
            </div>
          </div>
          <component
            v-if="apexReady"
            :is="ApexChart"
            height="320"
            type="line"
            :options="revenueOptions"
            :series="revenueSeries"
          />
          <div v-else class="flex h-[320px] items-center justify-center text-gray-500 text-sm">
            {{ t('pages.admin.mainPage.chartsLoading') }}
          </div>
        </div>

        <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-300 font-semibold">
              {{ t('pages.admin.mainPage.dealsByStatus') }}
            </p>
          </div>
          <component
            v-if="apexReady"
            :is="ApexChart"
            height="320"
            type="bar"
            :options="statusOptions"
            :series="statusSeries"
          />
          <div v-else class="flex h-[320px] items-center justify-center text-gray-500 text-sm">
            {{ t('pages.admin.mainPage.chartsLoading') }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-300 font-semibold">
              {{ t('pages.admin.mainPage.topCategories') }}
            </p>
          </div>
          <div v-if="topCategories.length" class="min-h-[320px]">
            <component
              v-if="apexReady"
              :is="ApexChart"
              height="320"
              type="bar"
              :options="topCategoriesOptions"
              :series="topCategoriesSeries"
            />
            <div v-else class="flex h-[320px] items-center justify-center text-gray-500 text-sm">
              {{ t('pages.admin.mainPage.chartsLoading') }}
            </div>
          </div>
          <div v-else class="flex h-[320px] items-center justify-center text-gray-500 text-sm">
            {{ t('pages.admin.mainPage.noCategories') }}
          </div>
        </div>

        <div class="rounded-2xl border border-dark-700 bg-dark-600 p-4">
          <p class="text-sm text-gray-300 font-semibold mb-3">
            {{ t('pages.admin.mainPage.quickStats') }}
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.pending') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('pending')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.completed') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('completed')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.refunded') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('refunded')) }}</p>
            </div>
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('common.dealStatuses.disputed') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(getStatusCount('disputed')) }}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('pages.admin.mainPage.activeDisputes') }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(dashboardData?.active_disputes ?? 0) }}</p>
            </div>
            <div class="rounded-xl border border-dark-600 bg-dark-700 p-3">
              <p class="text-xs text-gray-400 mb-1">{{ t('pages.admin.mainPage.onModeration', { count: '' }) }}</p>
              <p class="text-xl font-semibold text-white">{{ formatNumber(dashboardData?.moderation_products ?? 0) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmWindow
      :is-open="pendingPlatformToggle !== null"
      :title="platformToggleConfirmTitle"
      :message="platformToggleConfirmMessage"
      :confirm-text="t('pages.admin.mainPage.confirmToggleConfirm')"
      :is-loading="isPlatformSettingsSaving"
      @cancel="closePlatformToggleConfirm"
      @confirm="confirmPlatformToggle"
    />
  </section>
</template>
