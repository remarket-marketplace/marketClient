<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppModal from '@/components/AppModal.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import { useUserStore } from '@/stores/user'
import { vpnService, type ScopeVpnOrder, type ScopeVpnPlanId } from '@/api/vpn/VpnService'
import { formatCurrencyAmount } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import scopeVpnLogoSrc from '@/assets/images/circle_logo_transparent.png'
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

type VpnPlanId = ScopeVpnPlanId

interface VpnPlan {
  id: VpnPlanId
  duration: string
  caption: string
  price: number
  priceLabel: string
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

const selectedPlanId = ref<VpnPlanId>('month')
const isPlansLoading = ref(false)
const isPurchaseLoading = ref(false)
const isTrialLoading = ref(false)
const actionError = ref('')
const modalError = ref('')
const planPrices = ref<Record<VpnPlanId, number>>({
  month: 0,
  quarter: 0,
  halfyear: 0,
})
const orderModalOpen = ref(false)
const orderModalMode = ref<'purchase' | 'trial'>('purchase')
const orderResult = ref<ScopeVpnOrder | null>(null)
const isSubscriptionCopied = ref(false)

// Модальное окно подтверждения покупки
const confirmModalOpen = ref(false)
const pendingPlanId = ref<VpnPlanId | null>(null)

function formatPlanPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return t('pages.vpn.pricePending')
  return formatCurrencyAmount(price)
}

const planOptions = computed<VpnPlan[]>(() => [
  {
    id: 'month',
    duration: t('pages.vpn.plans.month.duration'),
    caption: t('pages.vpn.plans.month.caption'),
    price: planPrices.value.month,
    priceLabel: formatPlanPrice(planPrices.value.month),
  },
  {
    id: 'quarter',
    duration: t('pages.vpn.plans.quarter.duration'),
    caption: t('pages.vpn.plans.quarter.caption'),
    price: planPrices.value.quarter,
    priceLabel: formatPlanPrice(planPrices.value.quarter),
  },
  {
    id: 'halfyear',
    duration: t('pages.vpn.plans.halfyear.duration'),
    caption: t('pages.vpn.plans.halfyear.caption'),
    price: planPrices.value.halfyear,
    priceLabel: formatPlanPrice(planPrices.value.halfyear),
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

const selectedPlan = computed<VpnPlan>(() =>
  planOptions.value.find((plan) => plan.id === selectedPlanId.value) ?? planOptions.value[0]!,
)

const selectedPlanPriceLabel = computed(() => selectedPlan.value.priceLabel)

const isTrialAvailable = computed(() => {
  if (!user.value) return false

  const createdAtTime = user.value.created_at.getTime()
  const isAccountOldEnough = Number.isFinite(createdAtTime)
    && Date.now() - createdAtTime > TRIAL_MIN_ACCOUNT_AGE_MS

  return isAccountOldEnough || user.value.balance > TRIAL_MIN_BALANCE_RUB
})

function selectPlan(planId: VpnPlanId): void {
  selectedPlanId.value = planId
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
    const nextPrices = { ...planPrices.value }
    for (const plan of plans) {
      if (plan.id in nextPrices) {
        nextPrices[plan.id] = Number(plan.price) || 0
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
  // Сохраняем выбранный план и показываем модаль подтверждения
  pendingPlanId.value = selectedPlanId.value
  confirmModalOpen.value = true
}

async function confirmPurchase(): Promise<void> {
  if (!pendingPlanId.value) return
  actionError.value = ''
  modalError.value = ''
  isPurchaseLoading.value = true
  confirmModalOpen.value = false
  try {
    const order = await vpnService.purchase(pendingPlanId.value)
    userStore.updateUserProfile({ balance: order.balance })
    orderResult.value = order
    orderModalMode.value = 'purchase'
    orderModalOpen.value = true
    isSubscriptionCopied.value = false
    pendingPlanId.value = null
  } catch (error) {
    actionError.value = resolveErrorMessage(error)
    pendingPlanId.value = null
  } finally {
    isPurchaseLoading.value = false
  }
}

function cancelPurchase(): void {
  confirmModalOpen.value = false
  pendingPlanId.value = null
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
      <section class="grid gap-6 border-y border-white/[0.08] py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p class="text-sm font-medium text-blue-200">{{ t('pages.vpn.featuresEyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {{ t('pages.vpn.featuresTitle') }}
          </h2>
        </div>

        <div class="divide-y divide-white/[0.08]">
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

      <section class="grid gap-6 border-b border-white/[0.08] py-10 lg:grid-cols-[0.85fr_1.15fr]">
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
        <div class="max-w-2xl">
          <p class="text-sm font-medium text-blue-200">{{ t('pages.vpn.plansEyebrow') }}</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {{ t('pages.vpn.plansTitle') }}
          </h2>
        </div>

        <div class="mt-7 grid gap-3 lg:grid-cols-3">
          <button
            v-for="plan in planOptions"
            :key="plan.id"
            type="button"
            class="vpn-plan group rounded-lg border p-5 text-left transition duration-200"
            :class="selectedPlanId === plan.id
              ? 'border-blue-400/45 bg-blue-500/[0.12]'
              : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.06]'"
            :aria-pressed="selectedPlanId === plan.id"
            @click="selectPlan(plan.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="mt-2 text-3xl font-semibold text-white">{{ plan.duration }}</h3>
                <p class="mt-2 text-sm font-semibold text-blue-200">
                  {{ isPlansLoading ? t('common.loading') : plan.priceLabel }}
                </p>
              </div>
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full border transition"
                :class="selectedPlanId === plan.id
                  ? 'border-blue-300 bg-blue-500 text-white'
                  : 'border-white/[0.14] text-transparent group-hover:text-gray-400'"
              >
                <Check class="h-4 w-4" stroke-width="2" />
              </span>
            </div>

            <p class="mt-4 min-h-12 text-sm leading-6 text-gray-300">{{ plan.caption }}</p>
          </button>
        </div>

        <div class="mt-5 flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-white">
              {{ t('pages.vpn.selectedPlan', { duration: selectedPlan.duration }) }}
            </p>
            <p class="mt-1 text-sm text-gray-400">
              {{ t('pages.vpn.selectedPlanHint', { price: selectedPlanPriceLabel }) }}
            </p>
            <p v-if="actionError" class="mt-2 text-sm text-red-300">{{ actionError }}</p>
          </div>
          <button
            type="button"
            class="market-primary-surface market-primary-hover inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-colors duration-200"
            :disabled="isPurchaseLoading"
            @click="buySelectedPlan"
          >
            <span>
              {{
                isPurchaseLoading
                  ? t('pages.vpn.processing')
                  : t('pages.vpn.buySelected', { duration: selectedPlan.duration })
              }}
            </span>
            <ShoppingCart class="h-4 w-4" stroke-width="1.7" />
          </button>
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
      :message="t('pages.vpn.confirm.message')"
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
  background: rgb(18 18 18);
}

.vpn-page__grid {
  background-image:
    linear-gradient(to right, rgb(var(--palette-white) / 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(var(--palette-white) / 0.045) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, black 0%, black 54%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 54%, transparent 100%);
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
  background: rgb(12 17 24 / 0.44);
  padding: 0.625rem 0.75rem;
  color: rgb(var(--palette-gray-200));
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgb(var(--palette-white) / 0.08),
    0 14px 32px rgb(0 0 0 / 0.18);
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
    background: rgb(12 17 24 / 0.34);
    font-size: 0.58rem;
    line-height: 1;
    text-align: left;
    box-shadow:
      inset 0 1px 0 rgb(var(--palette-white) / 0.07),
      0 10px 24px rgb(0 0 0 / 0.16);
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
    right: -0.25rem;
    top: 49%;
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
