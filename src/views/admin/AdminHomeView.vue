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
const persistedPlatformSettings = ref<PlatformSettings | null>(null)
const isPlatformSettingsLoading = ref(true)
const isPlatformSettingsSaving = ref(false)
const platformSettingsError = ref('')
const platformSettingsSuccess = ref('')
const pendingPlatformToggle = ref<{
  key: 'registration_enabled' | 'product_creation_enabled' | 'telegram_integration_enabled'
  nextValue: boolean
} | null>(null)

const CHART_FALLBACK_TOKENS = {
  axisText: '--palette-gray-400',
  legendText: '--palette-gray-200',
  gridBorder: '--palette-slate-500',
  revenue: '--palette-sky-500',
  users: '--palette-purple-500',
  statusPending: '--palette-amber-500',
  statusConfirmed: '--palette-cyan-400',
  statusCompleted: '--palette-green-500',
  statusDisputed: '--palette-rose-400',
  statusCancelled: '--palette-slate-400',
  statusRefunded: '--palette-orange-500',
  statusDefault: '--palette-blue-400',
  topCategories: '--palette-emerald-400',
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
    const body = rgbLike?.[1] ?? normalized
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
  if (typeof window === 'undefined') return normalizeApexColor('', '')
  const styles = window.getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue(token).trim()
  const fallbackValue = styles.getPropertyValue(fallback).trim() || styles.getPropertyValue('--palette-blue-500').trim()
  return normalizeApexColor(value, fallbackValue)
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

const clonePlatformSettings = (value: PlatformSettings): PlatformSettings => ({
  ...value,
})

const isValidCommissionValue = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
}

const isValidPriceValue = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000
}

const commissionSettingsValid = computed(() => {
  if (!platformSettings.value) return false
  return (
    isValidCommissionValue(platformSettings.value.deal_commission_percent)
    && isValidCommissionValue(platformSettings.value.withdrawal_commission_percent)
    && isValidPriceValue(platformSettings.value.vpn_month_price)
    && isValidPriceValue(platformSettings.value.vpn_quarter_price)
    && isValidPriceValue(platformSettings.value.vpn_halfyear_price)
  )
})

const commissionSettingsDirty = computed(() => {
  if (!platformSettings.value || !persistedPlatformSettings.value) return false
  return (
    Number(platformSettings.value.deal_commission_percent)
      !== Number(persistedPlatformSettings.value.deal_commission_percent)
    || Number(platformSettings.value.withdrawal_commission_percent)
      !== Number(persistedPlatformSettings.value.withdrawal_commission_percent)
    || Number(platformSettings.value.vpn_month_price)
      !== Number(persistedPlatformSettings.value.vpn_month_price)
    || Number(platformSettings.value.vpn_quarter_price)
      !== Number(persistedPlatformSettings.value.vpn_quarter_price)
    || Number(platformSettings.value.vpn_halfyear_price)
      !== Number(persistedPlatformSettings.value.vpn_halfyear_price)
  )
})

const getEffectiveCommissionPayload = () => {
  const source = commissionSettingsValid.value
    ? platformSettings.value
    : persistedPlatformSettings.value

  if (!source) {
    return {
      deal_commission_percent: 0,
      withdrawal_commission_percent: 0,
      vpn_month_price: 0,
      vpn_quarter_price: 0,
      vpn_halfyear_price: 0,
    }
  }

  return {
    deal_commission_percent: Number(source.deal_commission_percent),
    withdrawal_commission_percent: Number(source.withdrawal_commission_percent),
    vpn_month_price: Number(source.vpn_month_price),
    vpn_quarter_price: Number(source.vpn_quarter_price),
    vpn_halfyear_price: Number(source.vpn_halfyear_price),
  }
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
    parent_category_name: typeof (row as any)?.parent_category_name === 'string'
      ? (row as any).parent_category_name.trim()
      : '',
    total_sales: Math.max(0, toSafeNumber((row as any)?.total_sales, 0)),
    total_deals: Math.max(0, Math.round(toSafeNumber((row as any)?.total_deals, 0))),
  }))
})

const formatCategoryPath = (categoryName: string, parentCategoryName?: string) => {
  const safeCategoryName = toSafeString(categoryName, t('common.notSpecified'))
  const safeParentCategoryName = toSafeString(parentCategoryName, '')
  return safeParentCategoryName
    ? `${safeParentCategoryName}/${safeCategoryName}`
    : safeCategoryName
}

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
  const axisText = cssVar('--chart-axis-text', CHART_FALLBACK_TOKENS.axisText)
  const legendText = cssVar('--chart-legend-text', CHART_FALLBACK_TOKENS.legendText)
  const gridBorder = cssVar('--chart-grid-border', CHART_FALLBACK_TOKENS.gridBorder)
  const revenueColor = cssVar('--chart-series-revenue', CHART_FALLBACK_TOKENS.revenue)
  const usersColor = cssVar('--chart-series-users', CHART_FALLBACK_TOKENS.users)

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
  const axisText = cssVar('--chart-axis-text', CHART_FALLBACK_TOKENS.axisText)
  const gridBorder = cssVar('--chart-grid-border', CHART_FALLBACK_TOKENS.gridBorder)
  const statuses = dealsStatus.value
  const categories = statuses.map((s) => {
    const translated = t(`common.dealStatuses.${s.status}`)
    const label = translated || s.status || t('common.notSpecified')
    return String(label)
  })
  const colorsMap: Record<string, string> = {
    pending: cssVar('--chart-status-pending', CHART_FALLBACK_TOKENS.statusPending),
    confirmed: cssVar('--chart-status-confirmed', CHART_FALLBACK_TOKENS.statusConfirmed),
    completed: cssVar('--chart-status-completed', CHART_FALLBACK_TOKENS.statusCompleted),
    disputed: cssVar('--chart-status-disputed', CHART_FALLBACK_TOKENS.statusDisputed),
    cancelled: cssVar('--chart-status-cancelled', CHART_FALLBACK_TOKENS.statusCancelled),
    refunded: cssVar('--chart-status-refunded', CHART_FALLBACK_TOKENS.statusRefunded),
  }
  const fallbackColor = cssVar('--chart-status-default', CHART_FALLBACK_TOKENS.statusDefault)
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
  const axisText = cssVar('--chart-axis-text', CHART_FALLBACK_TOKENS.axisText)
  const legendText = cssVar('--chart-legend-text', CHART_FALLBACK_TOKENS.legendText)
  const gridBorder = cssVar('--chart-grid-border', CHART_FALLBACK_TOKENS.gridBorder)
  const seriesColor = cssVar('--chart-series-top-categories', CHART_FALLBACK_TOKENS.topCategories)

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
      categories: topCategories.value.map(c => formatCategoryPath(c.category_name, c.parent_category_name)),
      labels: { style: { colors: axisText } },
    },
    colors: [seriesColor],
    grid: { borderColor: gridBorder, strokeDashArray: 4 },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'Outfit, sans-serif' },
      x: {
        formatter: (_value: string, opts: any) => {
          const index = Number(opts?.dataPointIndex ?? -1)
          const category = topCategories.value[index]
          if (!category) return t('common.notSpecified')
          return formatCategoryPath(category.category_name, category.parent_category_name)
        },
      },
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
      tone: 'text-[var(--text-link)]',
    },
    {
      id: 'deals',
      label: t('pages.admin.mainPage.totalDeals'),
      value: formatNumber(data.count_of_deals),
      sublabel: t('pages.admin.mainPage.disputesActive', { count: formatNumber(data.active_disputes) }),
      icon: Activity,
      tone: 'text-[var(--text-success)]',
    },
    {
      id: 'users',
      label: t('pages.admin.mainPage.totalUsers'),
      value: formatNumber(data.count_of_users),
      trend: usersTrend.value,
      sublabel: t('pages.admin.mainPage.lastDays', { days: selectedRange.value }),
      icon: Users,
      tone: 'text-[var(--text-accent)]',
    },
    {
      id: 'products',
      label: t('pages.admin.mainPage.totalProducts'),
      value: formatNumber(data.count_of_products),
      sublabel: t('pages.admin.mainPage.onModeration', { count: formatNumber(data.moderation_products) }),
      icon: Package,
      tone: 'text-[var(--text-warning-strong)]',
    },
    {
      id: 'avg-check',
      label: t('pages.admin.mainPage.averageCheck'),
      value: formatCurrency(avgCheck.value),
      sublabel: t('pages.admin.mainPage.perDeal'),
      icon: AlertTriangle,
      tone: 'text-[var(--text-link)]',
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
    platformSettings.value = clonePlatformSettings(data)
    persistedPlatformSettings.value = clonePlatformSettings(data)
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
    platformSettings.value = clonePlatformSettings(updated)
    persistedPlatformSettings.value = clonePlatformSettings(updated)
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
    ...getEffectiveCommissionPayload(),
  })
  pendingPlatformToggle.value = null
}

const saveCommissionSettings = async () => {
  if (!platformSettings.value || !commissionSettingsValid.value) return
  await updatePlatformSettings({
    ...platformSettings.value,
    ...getEffectiveCommissionPayload(),
  })
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
        <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {{ t('pages.admin.mainPage.title') }}
        </p>
        <h1 class="text-2xl font-semibold text-[var(--text-title)]">
          {{ t('pages.admin.mainPage.overview') }}
        </h1>
      </div>

      <div class="admin-surface-soft flex items-center gap-2 rounded-xl p-1">
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
      class="rounded-2xl border border-[rgb(var(--palette-red-500)/0.4)] bg-[rgb(var(--palette-red-500)/0.1)] text-[var(--text-danger-soft)] px-4 py-3 text-sm"
    >
      {{ t('pages.admin.mainPage.loadError') }}
    </div>

    <div v-else class="flex flex-col gap-5 overflow-y-auto pb-8">
      <div class="admin-surface-panel rounded-2xl p-4">
        <div class="mb-3">
          <p class="text-sm font-semibold text-[var(--text-body-strong)]">
            {{ t('pages.admin.mainPage.platformSettingsTitle') }}
          </p>
          <p class="mt-1 text-xs text-[var(--text-muted)]">
            {{ t('pages.admin.mainPage.platformSettingsHint') }}
          </p>
        </div>

        <div v-if="isPlatformSettingsLoading" class="py-6 flex items-center justify-center">
          <Loader />
        </div>

        <template v-else>
          <div
            v-if="platformSettingsError"
            class="mb-3 rounded-xl border border-[rgb(var(--palette-red-500)/0.4)] bg-[rgb(var(--palette-red-500)/0.1)] px-3 py-2 text-sm text-[var(--text-danger-soft)]"
          >
            {{ platformSettingsError }}
          </div>

          <div
            v-if="platformSettingsSuccess"
            class="mb-3 rounded-xl border border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-3 py-2 text-sm text-[var(--text-success)]"
          >
            {{ platformSettingsSuccess }}
          </div>

          <div v-if="platformSettings" class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-sm text-[var(--text-body-strong)] font-medium">
                {{ t('pages.admin.mainPage.registrationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-[var(--text-muted)]">
                {{ t('pages.admin.mainPage.registrationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.registration_enabled
                  ? 'border-[rgb(var(--palette-blue-500)/0.4)] bg-[rgb(var(--palette-blue-600)/0.8)] text-[var(--text-title)] hover:bg-[rgb(var(--palette-blue-500))]'
                  : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body-strong)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]'"
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

            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-sm text-[var(--text-body-strong)] font-medium">
                {{ t('pages.admin.mainPage.productCreationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-[var(--text-muted)]">
                {{ t('pages.admin.mainPage.productCreationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.product_creation_enabled
                  ? 'border-[rgb(var(--palette-blue-500)/0.4)] bg-[rgb(var(--palette-blue-600)/0.8)] text-[var(--text-title)] hover:bg-[rgb(var(--palette-blue-500))]'
                  : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body-strong)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]'"
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

            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-sm text-[var(--text-body-strong)] font-medium">
                {{ t('pages.admin.mainPage.telegramIntegrationToggleLabel') }}
              </p>
              <p class="mt-1 text-xs text-[var(--text-muted)]">
                {{ t('pages.admin.mainPage.telegramIntegrationToggleHint') }}
              </p>
              <button
                class="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="platformSettings.telegram_integration_enabled
                  ? 'border-[rgb(var(--palette-blue-500)/0.4)] bg-[rgb(var(--palette-blue-600)/0.8)] text-[var(--text-title)] hover:bg-[rgb(var(--palette-blue-500))]'
                  : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body-strong)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]'"
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

            <div class="admin-surface-soft rounded-xl p-4 md:col-span-2 2xl:col-span-3">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="max-w-2xl">
                  <p class="text-sm text-[var(--text-body-strong)] font-medium">
                    {{ t('pages.admin.mainPage.financeSettingsTitle') }}
                  </p>
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.financeSettingsHint') }}
                  </p>
                </div>

                <button
                  type="button"
                  class="admin-btn admin-btn-primary shrink-0"
                  :disabled="!commissionSettingsDirty || !commissionSettingsValid || isPlatformSettingsSaving"
                  @click="saveCommissionSettings"
                >
                  {{ t('pages.admin.mainPage.saveFinanceSettings') }}
                </button>
              </div>

              <div class="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
                <label class="admin-surface-panel rounded-xl p-3">
                  <span class="text-xs uppercase tracking-[0.18em] text-[var(--text-meta)]">
                    {{ t('pages.admin.mainPage.dealCommissionLabel') }}
                  </span>
                  <input
                    v-model.number="platformSettings.deal_commission_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="mt-3 w-full rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-lg font-semibold text-[var(--text-title)] outline-none transition focus:border-[rgb(var(--palette-sky-400)/0.45)] focus:bg-[rgb(var(--palette-sky-400)/0.05)]"
                  >
                  <p class="mt-2 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.dealCommissionHint') }}
                  </p>
                </label>

                <label class="admin-surface-panel rounded-xl p-3">
                  <span class="text-xs uppercase tracking-[0.18em] text-[var(--text-meta)]">
                    {{ t('pages.admin.mainPage.withdrawalCommissionLabel') }}
                  </span>
                  <input
                    v-model.number="platformSettings.withdrawal_commission_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="mt-3 w-full rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-lg font-semibold text-[var(--text-title)] outline-none transition focus:border-[rgb(var(--palette-sky-400)/0.45)] focus:bg-[rgb(var(--palette-sky-400)/0.05)]"
                  >
                  <p class="mt-2 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.withdrawalCommissionHint') }}
                  </p>
                </label>

                <label class="admin-surface-panel rounded-xl p-3">
                  <span class="text-xs uppercase tracking-[0.18em] text-[var(--text-meta)]">
                    {{ t('pages.admin.mainPage.vpnMonthPriceLabel') }}
                  </span>
                  <input
                    v-model.number="platformSettings.vpn_month_price"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    class="mt-3 w-full rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-lg font-semibold text-[var(--text-title)] outline-none transition focus:border-[rgb(var(--palette-sky-400)/0.45)] focus:bg-[rgb(var(--palette-sky-400)/0.05)]"
                  >
                  <p class="mt-2 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.vpnPriceHint') }}
                  </p>
                </label>

                <label class="admin-surface-panel rounded-xl p-3">
                  <span class="text-xs uppercase tracking-[0.18em] text-[var(--text-meta)]">
                    {{ t('pages.admin.mainPage.vpnQuarterPriceLabel') }}
                  </span>
                  <input
                    v-model.number="platformSettings.vpn_quarter_price"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    class="mt-3 w-full rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-lg font-semibold text-[var(--text-title)] outline-none transition focus:border-[rgb(var(--palette-sky-400)/0.45)] focus:bg-[rgb(var(--palette-sky-400)/0.05)]"
                  >
                  <p class="mt-2 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.vpnPriceHint') }}
                  </p>
                </label>

                <label class="admin-surface-panel rounded-xl p-3">
                  <span class="text-xs uppercase tracking-[0.18em] text-[var(--text-meta)]">
                    {{ t('pages.admin.mainPage.vpnHalfyearPriceLabel') }}
                  </span>
                  <input
                    v-model.number="platformSettings.vpn_halfyear_price"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    class="mt-3 w-full rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-lg font-semibold text-[var(--text-title)] outline-none transition focus:border-[rgb(var(--palette-sky-400)/0.45)] focus:bg-[rgb(var(--palette-sky-400)/0.05)]"
                  >
                  <p class="mt-2 text-xs text-[var(--text-muted)]">
                    {{ t('pages.admin.mainPage.vpnPriceHint') }}
                  </p>
                </label>
              </div>

              <p class="mt-3 text-xs text-[var(--text-meta)]">
                {{ t('pages.admin.mainPage.financeSettingsSnapshotHint') }}
              </p>
            </div>
          </div>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <div
          v-for="card in summaryCards"
          :key="card.id"
          class="admin-surface-card relative overflow-hidden rounded-2xl p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm text-[var(--text-muted)]">{{ card.label }}</p>
              <p class="text-2xl font-semibold text-[var(--text-title)] leading-tight">{{ card.value }}</p>
            </div>
            <div
              class="admin-surface-soft h-12 w-12 flex items-center justify-center rounded-xl"
            >
              <component :is="card.icon" :class="card.tone" :size="22" />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <div
              v-if="card.trend"
              class="flex items-center gap-1 rounded-lg px-2 py-1"
              :class="card.trend.isFlat ? 'bg-[rgb(var(--palette-white)/0.05)] text-[var(--text-body)]' : card.trend.isUp ? 'bg-[rgb(var(--palette-emerald-500)/0.1)] text-[var(--text-success)]' : 'bg-[rgb(var(--palette-red-500)/0.1)] text-[var(--text-danger)]'"
            >
              <component
                :is="card.trend.isFlat ? Activity : card.trend.isUp ? ArrowUpRight : ArrowDownRight"
                :size="14"
              />
              <span>{{ card.trend.percent.toFixed(1) }}% {{ t('pages.admin.mainPage.vsPrevDay') }}</span>
            </div>
            <span class="text-[var(--text-muted)]">{{ card.sublabel }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 2xl:grid-cols-12">
        <div class="admin-surface-panel rounded-2xl p-4 2xl:col-span-8">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm text-[var(--text-body)] font-semibold">
                {{ t('pages.admin.mainPage.chartTitleRevenue') }}
              </p>
              <p class="text-xs text-[var(--text-meta)]">{{ t('pages.admin.mainPage.lastDays', { days: selectedRange }) }}</p>
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
          <div v-else class="flex h-[320px] items-center justify-center text-[var(--text-meta)] text-sm">
            {{ t('pages.admin.mainPage.chartsLoading') }}
          </div>
        </div>

        <div class="admin-surface-panel rounded-2xl p-4 2xl:col-span-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-[var(--text-body)] font-semibold">
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
          <div v-else class="flex h-[320px] items-center justify-center text-[var(--text-meta)] text-sm">
            {{ t('pages.admin.mainPage.chartsLoading') }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 2xl:grid-cols-12">
        <div class="admin-surface-panel rounded-2xl p-4 2xl:col-span-7">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-[var(--text-body)] font-semibold">
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
            <div v-else class="flex h-[320px] items-center justify-center text-[var(--text-meta)] text-sm">
              {{ t('pages.admin.mainPage.chartsLoading') }}
            </div>
          </div>
          <div v-else class="flex h-[320px] items-center justify-center text-[var(--text-meta)] text-sm">
            {{ t('pages.admin.mainPage.noCategories') }}
          </div>
        </div>

        <div class="admin-surface-panel rounded-2xl p-4 2xl:col-span-5">
          <p class="text-sm text-[var(--text-body)] font-semibold mb-3">
            {{ t('pages.admin.mainPage.quickStats') }}
          </p>
          <div class="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('common.dealStatuses.pending') }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(getStatusCount('pending')) }}</p>
            </div>
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('common.dealStatuses.completed') }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(getStatusCount('completed')) }}</p>
            </div>
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('common.dealStatuses.refunded') }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(getStatusCount('refunded')) }}</p>
            </div>
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('common.dealStatuses.disputed') }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(getStatusCount('disputed')) }}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('pages.admin.mainPage.activeDisputes') }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(dashboardData?.active_disputes ?? 0) }}</p>
            </div>
            <div class="admin-surface-soft rounded-xl p-3">
              <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('pages.admin.mainPage.onModeration', { count: '' }) }}</p>
              <p class="text-xl font-semibold text-[var(--text-title)]">{{ formatNumber(dashboardData?.moderation_products ?? 0) }}</p>
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
