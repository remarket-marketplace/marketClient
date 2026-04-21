<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppModal from '@/components/AppModal.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { useUserStore } from '@/stores/user'
import { vpnService, type ScopeVpnOrder } from '@/api/vpn/VpnService'
import { formatCurrencyAmount } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import scopeVpnLogoSrc from '@/assets/images/scope_vpn_logo.png'
import { Icon } from '@iconify/vue'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  MonitorDown,
  ShoppingCart,
  Smartphone,
  Landmark,
  Youtube,
} from 'lucide-vue-next'

type VpnPeriodMonths = 1 | 3 | 6 | 12

interface VpnPeriodOption {
  months: VpnPeriodMonths
  duration: string
  caption: string
  price: number
  priceLabel: string
  monthlyLabel: string
  badge?: string
}

interface VpnFeature {
  icon: Component
  title: string
  text: string
}

interface VpnAppLink {
  label: string
  href: string
  icon: string
}

interface VpnApp {
  name: string
  text: string
  links: VpnAppLink[]
}

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const TRIAL_MIN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000
const TRIAL_MIN_BALANCE_RUB = 50
const VPN_PERIODS: VpnPeriodMonths[] = [1, 3, 6, 12]
const VPN_DEVICES = Array.from({ length: 10 }, (_, index) => index + 1)
const DEFAULT_VPN_PRICES: Record<VpnPeriodMonths, Record<number, number>> = {
  1: {
    1: 199,
    2: 249,
    3: 299,
    4: 349,
    5: 399,
    6: 449,
    7: 499,
    8: 549,
    9: 599,
    10: 649,
  },
  3: {
    1: 449,
    2: 629,
    3: 759,
    4: 889,
    5: 1019,
    6: 1149,
    7: 1279,
    8: 1409,
    9: 1539,
    10: 1699,
  },
  6: {
    1: 849,
    2: 1069,
    3: 1284,
    4: 1509,
    5: 1729,
    6: 1994,
    7: 2169,
    8: 2389,
    9: 2609,
    10: 2829,
  },
  12: {
    1: 1549,
    2: 1949,
    3: 2349,
    4: 2749,
    5: 3149,
    6: 3549,
    7: 3949,
    8: 4349,
    9: 4749,
    10: 5149,
  },
}

const selectedMonths = ref<VpnPeriodMonths>(1)
const selectedDevices = ref(1)
const isPlansLoading = ref(false)
const isPurchaseLoading = ref(false)
const isTrialLoading = ref(false)
const actionError = ref('')
const modalError = ref('')
const planPrices = ref(cloneVpnPrices(DEFAULT_VPN_PRICES))
const orderModalOpen = ref(false)
const orderModalMode = ref<'purchase' | 'trial'>('purchase')
const orderResult = ref<ScopeVpnOrder | null>(null)
const isSubscriptionCopied = ref(false)

// Модальное окно подтверждения покупки
const confirmModalOpen = ref(false)
const pendingSelection = ref<{ months: VpnPeriodMonths; devices: number } | null>(null)

function cloneVpnPrices(
  prices: Record<VpnPeriodMonths, Record<number, number>>,
): Record<VpnPeriodMonths, Record<number, number>> {
  return {
    1: { ...prices[1] },
    3: { ...prices[3] },
    6: { ...prices[6] },
    12: { ...prices[12] },
  }
}

function isVpnPeriodMonths(value: number): value is VpnPeriodMonths {
  return VPN_PERIODS.includes(value as VpnPeriodMonths)
}

function formatPlanPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return t('pages.vpn.pricePending')
  return formatCurrencyAmount(price)
}

function getPlanPrice(months: VpnPeriodMonths, devices: number): number {
  return Number(planPrices.value[months]?.[devices]) || 0
}

const periodOptions = computed<VpnPeriodOption[]>(() => [
  {
    months: 1,
    duration: t('pages.vpn.plans.month.duration'),
    caption: t('pages.vpn.plans.month.caption'),
    price: getPlanPrice(1, selectedDevices.value),
    priceLabel: formatPlanPrice(getPlanPrice(1, selectedDevices.value)),
    monthlyLabel: formatPlanPrice(getPlanPrice(1, selectedDevices.value)),
  },
  {
    months: 3,
    duration: t('pages.vpn.plans.quarter.duration'),
    caption: t('pages.vpn.plans.quarter.caption'),
    price: getPlanPrice(3, selectedDevices.value),
    priceLabel: formatPlanPrice(getPlanPrice(3, selectedDevices.value)),
    monthlyLabel: formatPlanPrice(getPlanPrice(3, selectedDevices.value) / 3),
    badge: t('pages.vpn.plans.quarter.badge'),
  },
  {
    months: 6,
    duration: t('pages.vpn.plans.halfyear.duration'),
    caption: t('pages.vpn.plans.halfyear.caption'),
    price: getPlanPrice(6, selectedDevices.value),
    priceLabel: formatPlanPrice(getPlanPrice(6, selectedDevices.value)),
    monthlyLabel: formatPlanPrice(getPlanPrice(6, selectedDevices.value) / 6),
    badge: t('pages.vpn.plans.halfyear.badge'),
  },
  {
    months: 12,
    duration: t('pages.vpn.plans.year.duration'),
    caption: t('pages.vpn.plans.year.caption'),
    price: getPlanPrice(12, selectedDevices.value),
    priceLabel: formatPlanPrice(getPlanPrice(12, selectedDevices.value)),
    monthlyLabel: formatPlanPrice(getPlanPrice(12, selectedDevices.value) / 12),
    badge: t('pages.vpn.plans.year.badge'),
  },
])

const featureItems = computed<VpnFeature[]>(() => [
  {
    icon: Youtube,
    title: t('pages.vpn.features.youtubeTitle'),
    text: t('pages.vpn.features.youtubeText'),
  },
  {
    icon: BrainCircuit,
    title: t('pages.vpn.features.aiTitle'),
    text: t('pages.vpn.features.aiText'),
  },
  {
    icon: Landmark,
    title: t('pages.vpn.features.banksTitle'),
    text: t('pages.vpn.features.banksText'),
  },
  {
    icon: Globe,
    title: t('pages.vpn.features.locationsTitle'),
    text: t('pages.vpn.features.locationsText'),
  },
])

const appItems = computed<VpnApp[]>(() => [
  {
    name: 'Happ',
    text: t('pages.vpn.apps.happText'),
    links: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215',
        icon: 'mdi:apple',
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.happproxy',
        icon: 'simple-icons:googleplay',
      },
      {
        label: t('pages.vpn.apps.desktop'),
        href: 'https://github.com/Happ-proxy/happ-desktop/releases/',
        icon: 'mdi:microsoft-windows',
      },
    ],
  },
  {
    name: 'Incy',
    text: t('pages.vpn.apps.incyText'),
    links: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/us/app/incy/id6756943388',
        icon: 'mdi:apple',
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=llc.itdev.incy',
        icon: 'simple-icons:googleplay',
      },
      {
        label: t('pages.vpn.apps.desktop'),
        href: 'https://github.com/INCY-DEV/incy-platforms',
        icon: 'mdi:microsoft-windows',
      },
    ],
  },
])

const selectedPeriod = computed<VpnPeriodOption>(() =>
  periodOptions.value.find((plan) => plan.months === selectedMonths.value) ?? periodOptions.value[0]!,
)

const selectedPlanPrice = computed(() => getPlanPrice(selectedMonths.value, selectedDevices.value))
const selectedPlanPriceLabel = computed(() => formatPlanPrice(selectedPlanPrice.value))
const selectedMonthlyPriceLabel = computed(() =>
  formatPlanPrice(selectedPlanPrice.value / selectedMonths.value),
)
const deviceSliderProgress = computed(() =>
  `${((selectedDevices.value - 1) / (VPN_DEVICES.length - 1)) * 100}%`,
)
const selectedDevicesLabel = computed(() =>
  t('pages.vpn.devicesLabel', { count: selectedDevices.value }),
)
const selectedDevicesFullLabel = computed(() =>
  t('pages.vpn.devicesFullLabel', { count: selectedDevices.value }),
)
const confirmMessage = computed(() =>
  t('pages.vpn.confirm.message', {
    duration: selectedPeriod.value.duration,
    devices: selectedDevicesFullLabel.value,
    price: selectedPlanPriceLabel.value,
  }),
)

const isTrialAvailable = computed(() => {
  if (!user.value) return false

  const createdAtTime = user.value.created_at.getTime()
  const isAccountOldEnough = Number.isFinite(createdAtTime)
    && Date.now() - createdAtTime > TRIAL_MIN_ACCOUNT_AGE_MS

  return isAccountOldEnough || user.value.balance > TRIAL_MIN_BALANCE_RUB
})

function selectPeriod(months: VpnPeriodMonths): void {
  selectedMonths.value = months
}

function selectDevices(devices: number): void {
  selectedDevices.value = devices
}

function scrollToPlans(): void {
  if (typeof document === 'undefined') return
  document.getElementById('vpn-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function resolveErrorMessage(error: unknown): string {
  const detail = (error as any)?.response?.data?.detail ?? (error as any)?.message
  return getErrorMessage(detail, t)
}

async function loadPlans(): Promise<void> {
  isPlansLoading.value = true
  try {
    const plans = await vpnService.getPlans()
    const nextPrices = cloneVpnPrices(DEFAULT_VPN_PRICES)
    for (const plan of plans) {
      const months = Number(plan.months)
      const devices = Number(plan.devices)
      if (isVpnPeriodMonths(months) && devices >= 1 && devices <= 10) {
        nextPrices[months][devices] = Number(plan.price) || 0
      }
    }
    planPrices.value = nextPrices
  } catch (error) {
    actionError.value = resolveErrorMessage(error)
  } finally {
    isPlansLoading.value = false
  }
}

function requireUser(): boolean {
  if (user.value) return true
  void router.push('/signin')
  return false
}

function openTrialModal(): void {
  if (!requireUser()) return
  orderModalMode.value = 'trial'
  orderResult.value = null
  actionError.value = ''
  modalError.value = ''
  isSubscriptionCopied.value = false
  orderModalOpen.value = true
}

function closeOrderModal(): void {
  if (isPurchaseLoading.value || isTrialLoading.value) return
  orderModalOpen.value = false
  modalError.value = ''
}

async function buySelectedPlan(): Promise<void> {
  if (!requireUser()) return
  actionError.value = ''
  pendingSelection.value = {
    months: selectedMonths.value,
    devices: selectedDevices.value,
  }
  confirmModalOpen.value = true
}

async function confirmPurchase(): Promise<void> {
  if (!pendingSelection.value) return
  actionError.value = ''
  modalError.value = ''
  isPurchaseLoading.value = true
  confirmModalOpen.value = false
  try {
    const order = await vpnService.purchase(pendingSelection.value)
    userStore.updateUserProfile({ balance: order.balance })
    orderResult.value = order
    orderModalMode.value = 'purchase'
    orderModalOpen.value = true
    isSubscriptionCopied.value = false
    pendingSelection.value = null
  } catch (error) {
    actionError.value = resolveErrorMessage(error)
    pendingSelection.value = null
  } finally {
    isPurchaseLoading.value = false
  }
}

function cancelPurchase(): void {
  confirmModalOpen.value = false
  pendingSelection.value = null
}

async function confirmTrial(): Promise<void> {
  if (!requireUser()) return
  modalError.value = ''
  isTrialLoading.value = true
  try {
    const order = await vpnService.createTrial()
    userStore.updateUserProfile({ balance: order.balance })
    orderResult.value = order
    isSubscriptionCopied.value = false
  } catch (error) {
    modalError.value = resolveErrorMessage(error)
  } finally {
    isTrialLoading.value = false
  }
}

async function copySubscriptionUrl(): Promise<void> {
  const url = orderResult.value?.subscription_url
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = url
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  isSubscriptionCopied.value = true
}

function openOrderChat(): void {
  if (!orderResult.value) return
  void router.push({
    path: '/chats',
    query: { chatId: orderResult.value.chat_room_id },
  })
}

onMounted(() => {
  void loadPlans()
})
</script>

<template>
  <section class="vpn-page relative left-1/2 right-1/2 -mt-14 ml-[-50vw] mr-[-50vw] min-h-[calc(100dvh-3.5rem)] w-screen overflow-hidden pt-14 text-white">
    <div class="vpn-page__grid pointer-events-none absolute inset-0"></div>

    <div class="vpn-page__inner relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div class="mb-6 flex items-center justify-between gap-4 md:mb-8">
        <BackButton />
      </div>

      <div class="vpn-hero-grid grid flex-1 items-center gap-x-10 gap-y-7">
        <div class="vpn-page__copy vpn-hero-text max-w-3xl">
          <h1 class="text-balance text-5xl font-semibold leading-none text-white sm:text-6xl lg:text-7xl">
            {{ t('pages.vpn.title') }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg">
            {{ t('pages.vpn.subtitle') }}
          </p>
        </div>

        <div class="vpn-hero-actions flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            class="market-primary-surface market-primary-hover inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-colors duration-200"
            @click="scrollToPlans"
          >
            <span>{{ t('pages.vpn.heroAction') }}</span>
            <ArrowRight class="h-4 w-4" stroke-width="1.7" />
          </button>
          <button
            v-if="isTrialAvailable"
            type="button"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-5 text-sm font-semibold text-gray-100 transition-colors duration-200 hover:bg-white/[0.08]"
            @click="openTrialModal"
          >
            <Clock class="h-4 w-4 text-blue-200" stroke-width="1.7" />
            <span>{{ t('pages.vpn.trialAction') }}</span>
          </button>
        </div>

        <div class="vpn-visual relative min-h-[430px]">
          <div class="vpn-visual__logo absolute left-1/2 top-1/2 flex h-80 w-80 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full sm:h-96 sm:w-96">
            <img
              :src="scopeVpnLogoSrc"
              alt="Scope VPN"
              class="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          <div class="vpn-node vpn-node--top">
            <BrainCircuit class="h-4 w-4 text-blue-200" />
            <span>{{ t('pages.vpn.visual.ai') }}</span>
          </div>
          <div class="vpn-node vpn-node--right">
            <Globe class="h-4 w-4 text-blue-200" />
            <span>{{ t('pages.vpn.visual.locations') }}</span>
          </div>
          <div class="vpn-node vpn-node--bottom">
            <Smartphone class="h-4 w-4 text-blue-200" />
            <span>{{ t('pages.vpn.visual.apps') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <section class="grid gap-6 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p class="text-sm font-medium text-blue-200">{{ t('pages.vpn.featuresEyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {{ t('pages.vpn.featuresTitle') }}
          </h2>
        </div>

        <div>
          <div
            v-for="feature in featureItems"
            :key="feature.title"
            class="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[44px_1fr]"
          >
            <div class="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
              <component :is="feature.icon" class="h-5 w-5 text-blue-200" stroke-width="1.7" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-white">{{ feature.title }}</h3>
              <p class="mt-1 text-sm leading-6 text-gray-400">{{ feature.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p class="text-sm font-medium text-blue-200">{{ t('pages.vpn.appsEyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {{ t('pages.vpn.appsTitle') }}
          </h2>
          <p class="mt-3 max-w-md text-sm leading-6 text-gray-400">
            {{ t('pages.vpn.appsSubtitle') }}
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="app in appItems"
            :key="app.name"
            class="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-white">{{ app.name }}</h3>
                <p class="mt-1 text-sm leading-6 text-gray-400">{{ app.text }}</p>
              </div>
              <MonitorDown class="mt-1 h-5 w-5 shrink-0 text-blue-200" stroke-width="1.7" />
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                v-for="link in app.links"
                :key="`${app.name}-${link.label}`"
                :href="link.href"
                target="_blank"
                rel="noreferrer"
                class="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-semibold text-gray-100 transition hover:bg-white/[0.08]"
              >
                <Icon :icon="link.icon" class="h-4 w-4 text-blue-100" />
                <span>{{ link.label }}</span>
                <ExternalLink class="h-3.5 w-3.5 text-gray-500" stroke-width="1.7" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="vpn-plans" class="scroll-mt-24 py-12">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-blue-200">{{ t('pages.vpn.plansEyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {{ t('pages.vpn.plansTitle') }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-gray-400">
            {{ t('pages.vpn.plansSubtitle') }}
          </p>
        </div>

        <div class="mt-7 grid gap-4">
          <div class="space-y-4">
            <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-blue-200">
                    {{ t('pages.vpn.periodStep') }}
                  </p>
                  <h3 class="mt-1 text-lg font-semibold text-white">
                    {{ t('pages.vpn.periodTitle') }}
                  </h3>
                </div>
                <p class="text-right text-sm font-semibold text-blue-100">
                  {{ selectedPeriod.duration }}
                </p>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  v-for="plan in periodOptions"
                  :key="plan.months"
                  type="button"
                  class="group rounded-xl border p-4 text-left transition duration-200"
                  :class="selectedMonths === plan.months
                    ? 'border-blue-300/60 bg-blue-500/[0.14] text-white'
                    : 'border-white/[0.08] bg-black/[0.12] text-gray-300 hover:border-white/[0.18] hover:bg-white/[0.05]'"
                  :aria-pressed="selectedMonths === plan.months"
                  @click="selectPeriod(plan.months)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-xl font-semibold leading-none text-white">{{ plan.duration }}</p>
                      <p class="mt-2 text-sm font-semibold text-blue-200">
                        {{ isPlansLoading ? t('common.loading') : plan.priceLabel }}
                      </p>
                    </div>
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded-full border transition"
                      :class="selectedMonths === plan.months
                        ? 'border-blue-200 bg-blue-500 text-white'
                        : 'border-white/[0.14] text-transparent group-hover:text-gray-500'"
                    >
                      <Check class="h-3.5 w-3.5" stroke-width="2" />
                    </span>
                  </div>
                  <p class="mt-3 text-xs leading-5 text-gray-400">
                    {{ plan.caption }}
                  </p>
                  <p
                    v-if="plan.months > 1"
                    class="mt-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-gray-200"
                  >
                    {{ t('pages.vpn.pricePerMonth', { price: plan.monthlyLabel }) }}
                  </p>
                  <p v-else class="mt-3 text-xs font-semibold text-gray-500">
                    {{ plan.badge || t('pages.vpn.plans.month.badge') }}
                  </p>
                </button>
              </div>
            </div>

            <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-blue-200">
                    {{ t('pages.vpn.devicesStep') }}
                  </p>
                  <h3 class="mt-1 text-lg font-semibold text-white">
                    {{ t('pages.vpn.devicesTitle') }}
                  </h3>
                  <p class="mt-1 text-sm text-gray-400">{{ t('pages.vpn.devicesHint') }}</p>
                </div>
                <p class="text-right text-sm font-semibold text-blue-100">
                  {{ selectedDevicesLabel }}
                </p>
              </div>

              <div class="mt-6 rounded-2xl border border-white/[0.07] bg-black/[0.12] px-4 py-5">
                <div class="flex items-end justify-between gap-4">
                  <div>
                    <p class="text-sm text-gray-400">{{ t('pages.vpn.devicesSelected') }}</p>
                    <p class="mt-1 text-3xl font-semibold leading-none text-white">
                      {{ selectedDevices }}
                    </p>
                  </div>
                  <p class="pb-1 text-right text-sm font-semibold text-blue-100">
                    {{ selectedPlanPriceLabel }}
                  </p>
                </div>

                <div
                  class="mt-6"
                  :style="{ '--vpn-device-progress': deviceSliderProgress }"
                >
                  <input
                    v-model.number="selectedDevices"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    class="vpn-device-slider w-full"
                    :aria-label="t('pages.vpn.devicesTitle')"
                  />

                  <div class="mt-4 grid grid-cols-10 gap-1">
                    <button
                      v-for="devices in VPN_DEVICES"
                      :key="devices"
                      type="button"
                      class="h-8 rounded-lg text-xs font-semibold transition"
                      :class="selectedDevices === devices
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'"
                      @click="selectDevices(devices)"
                    >
                      {{ devices }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-5">
            <div class="grid gap-4 lg:grid-cols-[240px_minmax(360px,1fr)_320px] lg:items-center">
              <div class="lg:pr-4">
                <p class="text-xs uppercase tracking-[0.18em] text-blue-200">
                  {{ t('pages.vpn.summaryEyebrow') }}
                </p>
                <p class="mt-2 text-[2rem] font-semibold leading-none text-white sm:text-4xl">
                  {{ isPlansLoading ? t('common.loading') : selectedPlanPriceLabel }}
                </p>
                <div class="mt-3 text-xs leading-5 text-gray-400 sm:hidden">
                  <p>{{ selectedPeriod.duration }}</p>
                  <p>{{ selectedDevicesFullLabel }}</p>
                </div>
              </div>

              <div class="grid gap-3 border-t border-white/[0.08] pt-3 sm:grid-cols-3 lg:min-h-16 lg:border-l lg:border-t-0 lg:px-4 lg:pt-0">
                <div class="flex justify-between gap-4 sm:flex-col sm:justify-center sm:gap-1">
                  <span class="text-sm text-gray-400">{{ t('pages.vpn.summaryPeriod') }}</span>
                  <p class="text-base font-semibold text-white">{{ selectedPeriod.duration }}</p>
                </div>
                <div class="flex justify-between gap-4 sm:flex-col sm:justify-center sm:gap-1">
                  <span class="text-sm text-gray-400">{{ t('pages.vpn.summaryDevices') }}</span>
                  <p class="text-base font-semibold text-white">{{ selectedDevices }}</p>
                </div>
                <div class="flex justify-between gap-4 sm:flex-col sm:justify-center sm:gap-1">
                  <span class="text-sm text-gray-400">{{ t('pages.vpn.summaryMonthly') }}</span>
                  <p class="text-base font-semibold text-white">{{ selectedMonthlyPriceLabel }}</p>
                </div>
              </div>

              <div class="border-t border-white/[0.08] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <button
                  type="button"
                  class="market-primary-surface market-primary-hover inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isPurchaseLoading || selectedPlanPrice <= 0"
                  @click="buySelectedPlan"
                >
                  <span>
                    {{
                      isPurchaseLoading
                        ? t('pages.vpn.processing')
                        : t('pages.vpn.buySelected', { price: selectedPlanPriceLabel })
                    }}
                  </span>
                  <ShoppingCart class="h-4 w-4" stroke-width="1.7" />
                </button>
              </div>
            </div>
            <p v-if="actionError" class="mt-3 text-sm text-red-300">{{ actionError }}</p>
          </aside>
        </div>
      </section>
    </div>

    <AppModal
      :is-open="orderModalOpen"
      :title="orderResult ? t('pages.vpn.modal.resultTitle') : t('pages.vpn.modal.trialTitle')"
      :description="orderResult ? t('pages.vpn.modal.resultDescription') : t('pages.vpn.modal.trialDescription')"
      size="md"
      :dismissible="!isTrialLoading && !isPurchaseLoading"
      @cancel="closeOrderModal"
    >
      <div v-if="orderResult" class="space-y-4">
        <div class="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
          <p class="text-xs uppercase tracking-[0.16em] text-gray-500">
            {{ t('pages.vpn.modal.subscriptionUrl') }}
          </p>
          <p class="mt-2 break-all text-sm leading-6 text-gray-100">
            {{ orderResult.subscription_url }}
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            @click="copySubscriptionUrl"
          >
            <Copy class="h-4 w-4" stroke-width="1.7" />
            <span>{{ isSubscriptionCopied ? t('common.copied') : t('common.copy') }}</span>
          </button>
          <button
            type="button"
            class="market-primary-surface market-primary-hover inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-colors duration-200"
            @click="openOrderChat"
          >
            {{ t('pages.vpn.modal.openChat') }}
          </button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
          <p class="text-sm font-semibold text-white">{{ t('pages.vpn.modal.trialSummaryTitle') }}</p>
          <p class="mt-2 text-sm leading-6 text-gray-400">
            {{ t('pages.vpn.modal.trialSummaryText') }}
          </p>
        </div>
        <p v-if="modalError" class="text-sm text-red-300">{{ modalError }}</p>
      </div>

      <template #footer>
        <div v-if="!orderResult" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.08]"
            :disabled="isTrialLoading"
            @click="closeOrderModal"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="market-primary-surface market-primary-hover inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-colors duration-200"
            :disabled="isTrialLoading"
            @click="confirmTrial"
          >
            {{ isTrialLoading ? t('pages.vpn.processing') : t('pages.vpn.modal.confirmTrial') }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Модальное окно подтверждения покупки VPN -->
    <ConfirmWindow
      :is-open="confirmModalOpen"
      :title="t('pages.vpn.confirm.title')"
      :message="confirmMessage"
      :confirm-text="t('pages.vpn.confirm.confirm')"
      :cancel-text="t('pages.vpn.confirm.cancel')"
      :is-loading="isPurchaseLoading"
      @confirm="confirmPurchase"
      @cancel="cancelPurchase"
    />
  </section>
</template>

<style scoped>
.vpn-page {
  background: var(--background-color);
}

.vpn-page__grid {
  background-image:
    linear-gradient(to right, rgb(var(--palette-white) / 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(var(--palette-white) / 0.045) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, rgb(var(--palette-black)) 0%, rgb(var(--palette-black)) 54%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgb(var(--palette-black)) 0%, rgb(var(--palette-black)) 54%, transparent 100%);
}

.vpn-page__copy {
  animation: vpn-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.vpn-hero-grid {
  align-content: center;
  grid-template-areas:
    "text visual"
    "actions visual";
  grid-template-columns: minmax(0, 1fr) 420px;
}

.vpn-hero-text {
  grid-area: text;
}

.vpn-hero-actions {
  grid-area: actions;
  margin-top: 0.25rem;
  animation: vpn-enter 0.7s 0.08s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.vpn-visual {
  grid-area: visual;
  align-self: center;
  animation: vpn-enter 0.78s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.vpn-node {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 8.5rem;
  border: 1px solid rgb(var(--palette-white) / 0.12);
  border-radius: 9999px;
  background: rgb(var(--palette-navy-850) / 0.44);
  padding: 0.625rem 0.75rem;
  color: rgb(var(--palette-gray-200));
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgb(var(--palette-white) / 0.08),
    0 14px 32px rgb(var(--palette-black) / 0.18);
  backdrop-filter: saturate(140%) blur(18px);
  -webkit-backdrop-filter: saturate(140%) blur(18px);
}

.vpn-node span {
  white-space: nowrap;
}

.vpn-node--top {
  left: 2rem;
  top: 4.5rem;
}

.vpn-node--right {
  right: 1.5rem;
  top: 47%;
}

.vpn-node--bottom {
  bottom: 4rem;
  left: 3rem;
}

.vpn-plan {
  box-shadow: inset 0 1px 0 rgb(var(--palette-white) / 0.04);
}

.vpn-device-slider {
  height: 1.5rem;
  cursor: pointer;
  appearance: none;
  background: transparent;
}

.vpn-device-slider::-webkit-slider-runnable-track {
  height: 0.5rem;
  border-radius: 9999px;
  background:
    linear-gradient(
      to right,
      rgb(59 130 246) 0%,
      rgb(103 232 249) var(--vpn-device-progress),
      rgb(var(--palette-white) / 0.1) var(--vpn-device-progress),
      rgb(var(--palette-white) / 0.1) 100%
    );
}

.vpn-device-slider::-moz-range-track {
  height: 0.5rem;
  border-radius: 9999px;
  background: rgb(var(--palette-white) / 0.1);
}

.vpn-device-slider::-moz-range-progress {
  height: 0.5rem;
  border-radius: 9999px;
  background: linear-gradient(to right, rgb(59 130 246), rgb(103 232 249));
}

.vpn-device-slider::-webkit-slider-thumb {
  width: 1.5rem;
  height: 1.5rem;
  margin-top: -0.5rem;
  appearance: none;
  border: 3px solid rgb(var(--palette-navy-925));
  border-radius: 9999px;
  background: rgb(255 255 255);
  box-shadow:
    0 0 0 1px rgb(96 165 250 / 0.9),
    0 10px 24px rgb(37 99 235 / 0.35);
}

.vpn-device-slider::-moz-range-thumb {
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid rgb(var(--palette-navy-925));
  border-radius: 9999px;
  background: rgb(255 255 255);
  box-shadow:
    0 0 0 1px rgb(96 165 250 / 0.9),
    0 10px 24px rgb(37 99 235 / 0.35);
}

.vpn-device-slider:focus-visible {
  outline: none;
}

.vpn-device-slider:focus-visible::-webkit-slider-thumb {
  box-shadow:
    0 0 0 1px rgb(96 165 250 / 0.9),
    0 0 0 5px rgb(59 130 246 / 0.2),
    0 10px 24px rgb(37 99 235 / 0.35);
}

.vpn-device-slider:focus-visible::-moz-range-thumb {
  box-shadow:
    0 0 0 1px rgb(96 165 250 / 0.9),
    0 0 0 5px rgb(59 130 246 / 0.2),
    0 10px 24px rgb(37 99 235 / 0.35);
}

@keyframes vpn-enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1023px) {
  .vpn-page__inner {
    min-height: auto;
    padding-bottom: 3rem;
  }

  .vpn-hero-grid {
    grid-template-columns: minmax(0, 1fr) clamp(13rem, 34vw, 18rem);
    gap: clamp(0.75rem, 3vw, 2rem);
    flex: initial;
  }

  .vpn-page__copy h1 {
    font-size: clamp(2.75rem, 10vw, 4.5rem);
  }

  .vpn-page__copy p {
    max-width: 32rem;
    font-size: clamp(0.875rem, 2.8vw, 1.125rem);
    line-height: 1.55;
  }

  .vpn-visual {
    min-height: clamp(17rem, 44vw, 26rem);
  }

  .vpn-visual__logo {
    height: clamp(11rem, 36vw, 20rem) !important;
    width: clamp(11rem, 36vw, 20rem) !important;
  }

  .vpn-node {
    min-width: max-content;
    padding: 0.5rem 0.625rem;
    font-size: 0.75rem;
  }

  .vpn-node--top {
    left: 0;
    top: 2.25rem;
  }

  .vpn-node--right {
    right: 0;
    top: 46%;
  }

  .vpn-node--bottom {
    bottom: 2.5rem;
    left: 0.25rem;
  }
}

@media (max-width: 640px) {
  .vpn-page__inner {
    padding-top: 1rem;
    padding-bottom: 2.25rem;
  }

  .vpn-hero-grid {
    grid-template-areas:
      "text visual"
      "actions actions";
    grid-template-columns: minmax(0, 1fr) clamp(10rem, 38vw, 12rem);
    align-items: center;
    column-gap: 0.75rem;
    row-gap: 1.25rem;
  }

  .vpn-page__copy h1 {
    font-size: clamp(2.6rem, 14vw, 4.25rem);
  }

  .vpn-page__copy p {
    margin-top: 0.875rem;
    max-width: 18rem;
    font-size: clamp(0.8125rem, 3.5vw, 0.95rem);
    line-height: 1.45;
  }

  .vpn-hero-actions {
    width: 100%;
  }

  .vpn-visual {
    min-height: clamp(13rem, 52vw, 16rem);
    overflow: visible;
  }

  .vpn-visual__logo {
    position: absolute !important;
    left: auto !important;
    right: -0.15rem;
    top: 50% !important;
    transform: translateY(-50%) !important;
    height: clamp(8rem, 34vw, 10rem) !important;
    width: clamp(8rem, 34vw, 10rem) !important;
  }

  .vpn-node {
    position: absolute;
    display: inline-flex;
    flex-direction: row;
    gap: 0.25rem;
    min-width: max-content;
    max-width: none;
    width: auto;
    align-items: center;
    justify-content: center;
    padding: 0.32rem 0.46rem;
    border-color: rgb(var(--palette-white) / 0.13);
    background: rgb(var(--palette-navy-850) / 0.34);
    font-size: 0.58rem;
    line-height: 1;
    text-align: left;
    box-shadow:
      inset 0 1px 0 rgb(var(--palette-white) / 0.07),
      0 10px 24px rgb(var(--palette-black) / 0.16);
    backdrop-filter: saturate(150%) blur(20px);
    -webkit-backdrop-filter: saturate(150%) blur(20px);
  }

  .vpn-node svg {
    height: 0.75rem;
    width: 0.75rem;
  }

  .vpn-node--top {
    left: 0.25rem;
    top: 0.75rem;
    transform: none !important;
    border-radius: 9999px;
  }

  .vpn-node--right {
    right: -1rem;
    top: 43%;
    transform: translateY(-50%) !important;
    border-inline-width: 1px;
    border-radius: 9999px;
  }

  .vpn-node--bottom {
    left: 0.25rem;
    bottom: 0.75rem;
    transform: none !important;
    border-radius: 9999px;
  }
}
</style>
