<script setup lang="ts">
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
import BackButton from '@/components/navigation/BackButton.vue'
import TheInput from '@/components/TheInput.vue'
import { useUserStore } from '@/stores/user'
import { convertCurrencyAmount, getCurrencySymbol, preferredCurrency } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import {
  findSteamTopUpServiceByCurrency,
  isValidSteamTopUpAccount,
  normalizeSteamTopUpAccount,
  type SteamTopUpOrder,
  type SteamTopUpPayOrderPayload,
  type SteamTopUpService,
  type SteamTopUpServiceCurrency,
} from '@/validation/steamTopup/steamTopup'
import { Icon } from '@iconify/vue'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const HOME_STEAM_TOPUP_ENABLED = import.meta.env.VITE_STEAM_TOPUP_ENABLED !== 'false'
const QUICK_AMOUNTS_RUB = [100, 500, 1000, 2000, 5000] as const
const QUICK_AMOUNTS_USD = [1, 5, 10, 25, 50] as const

const steamAccount = ref('')
const steamQuantity = ref('')
const steamPromoCode = ref('')
const steamError = ref('')
const steamSuccess = ref('')
const steamCheckoutSubmitting = ref(false)
const steamServices = ref<SteamTopUpService[]>([])
const steamServicesLoading = ref(false)
const steamOrder = ref<SteamTopUpOrder | null>(null)

const selectedCurrency = computed<SteamTopUpServiceCurrency>(() => (
  preferredCurrency.value === 'USD' ? 'USD' : 'RUB'
))
const currencySymbol = computed(() => getCurrencySymbol(selectedCurrency.value))
const currencyInputStep = computed(() => (selectedCurrency.value === 'USD' ? 0.01 : 1))
const steamNormalizedAccount = computed(() => normalizeSteamTopUpAccount(steamAccount.value))
const steamIsAccountValid = computed(() => isValidSteamTopUpAccount(steamAccount.value))
const parsedSteamQuantity = computed(() => Number.parseFloat(steamQuantity.value))
const selectedSteamService = computed(() => findSteamTopUpServiceByCurrency(steamServices.value, selectedCurrency.value))
const quickAmounts = computed(() => {
  return selectedCurrency.value === 'USD'
    ? [...QUICK_AMOUNTS_USD]
    : [...QUICK_AMOUNTS_RUB]
})
const steamCanCreateOrder = computed(() => {
  if (!user.value) return false
  if (!selectedSteamService.value) return false
  if (!steamIsAccountValid.value) return false
  return Number.isFinite(parsedSteamQuantity.value) && parsedSteamQuantity.value > 0
})

function resolveSteamErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return getErrorMessage(error.response?.data?.detail ?? error.message, t)
  }
  return getErrorMessage(error, t)
}

function clearSteamFeedback(): void {
  steamError.value = ''
  steamSuccess.value = ''
}

async function loadSteamServices(): Promise<void> {
  if (!HOME_STEAM_TOPUP_ENABLED || !user.value) return

  steamServicesLoading.value = true
  clearSteamFeedback()
  try {
    const response = await steamTopupService.getServices()
    steamServices.value = response.services
  } catch (error) {
    steamServices.value = []
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamServicesLoading.value = false
  }
}

function setQuickAmount(amount: number): void {
  steamQuantity.value = selectedCurrency.value === 'USD' ? amount.toFixed(2) : String(amount)
  clearSteamFeedback()
  steamOrder.value = null
}

function isQuickAmountActive(amount: number): boolean {
  return parsedSteamQuantity.value === amount
}

function formatQuickAmount(amount: number): string {
  if (selectedCurrency.value === 'USD') {
    return `${currencySymbol.value}${amount.toFixed(2)}`
  }
  return `${Math.round(amount)} ${currencySymbol.value}`
}

function buildSteamPayOrderPayload(): SteamTopUpPayOrderPayload {
  const promoCode = steamPromoCode.value.trim()
  return {
    payment_method: 'lava',
    ...(promoCode ? { promo_code: promoCode } : {}),
  }
}

async function submitSteamTopUpPayment() {
  if (steamCheckoutSubmitting.value) return

  if (!steamIsAccountValid.value || !selectedSteamService.value) {
    steamError.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  const quantity = parsedSteamQuantity.value
  if (!Number.isFinite(quantity) || quantity <= 0) {
    steamError.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  steamCheckoutSubmitting.value = true
  clearSteamFeedback()
  steamSuccess.value = t('pages.index.steamTopUp.redirectToPayment')

  try {
    steamOrder.value = await steamTopupService.createOrder({
      service_id: selectedSteamService.value.id,
      account: steamNormalizedAccount.value,
      quantity,
    })
    const response = await steamTopupService.payOrder(
      steamOrder.value.id,
      buildSteamPayOrderPayload(),
    )
    steamOrder.value = response.order
    if (response.payment_url) {
      window.location.href = response.payment_url
      return
    }
    steamSuccess.value = t('pages.index.steamTopUp.orderPaid')
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
    steamSuccess.value = ''
  } finally {
    steamCheckoutSubmitting.value = false
  }
}

watch(selectedCurrency, (nextCurrency, prevCurrency) => {
  const currentInput = Number.parseFloat(steamQuantity.value)
  if (!Number.isFinite(currentInput) || currentInput <= 0) return

  const converted = convertCurrencyAmount(currentInput, prevCurrency, nextCurrency)
  steamQuantity.value = nextCurrency === 'USD' ? converted.toFixed(2) : Math.round(converted).toString()
  steamOrder.value = null
})

watch(
  () => user.value?.id,
  async (currentUserId) => {
    steamOrder.value = null
    if (!currentUserId) {
      steamServices.value = []
      return
    }
    await loadSteamServices()
  },
  { immediate: true },
)
</script>

<template>
  <section class="steam-topup-page -mt-14 relative min-h-[calc(100dvh-3.5rem)] overflow-hidden pt-14">
    <div class="steam-topup-page__glow pointer-events-none absolute inset-x-0 -top-24 h-[44vh] opacity-80 blur-2xl" />

    <div class="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-5xl flex-col px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div class="mb-10 flex items-center justify-between">
        <BackButton />
        <div class="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-gray-400 uppercase">
          <Icon icon="mdi:steam" class="h-4 w-4 text-white/90" />
          Steam
        </div>
      </div>

      <div class="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center">
        <div class="mx-auto mb-8 max-w-lg text-center">
          <h1 class="text-balance text-3xl font-semibold tracking-tight text-white sm:text-[2.75rem]">
            {{ t('pages.index.steamTopUp.title') }}
          </h1>
          <p class="mt-3 text-sm text-gray-400 sm:text-base">
            {{ t('pages.index.steamTopUp.subtitle') }}
          </p>
        </div>

        <div class="mx-auto w-full max-w-[680px]">
          <p
            v-if="!HOME_STEAM_TOPUP_ENABLED"
            class="mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100"
          >
            {{ t('errors.STEAM_TOPUP_DISABLED') }}
          </p>

          <template v-else>
            <p
              v-if="steamError"
              class="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {{ steamError }}
            </p>
            <p
              v-if="steamSuccess"
              class="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            >
              {{ steamSuccess }}
            </p>
            <p
              v-if="steamServicesLoading"
              class="mb-5 rounded-lg border border-dark-600 bg-dark-700/50 px-4 py-3 text-sm text-gray-300"
            >
              {{ t('pages.index.steamTopUp.refreshingOrder') }}
            </p>
            <p
              v-else-if="user && !selectedSteamService"
              class="mb-5 rounded-lg border border-dark-600 bg-dark-700/50 px-4 py-3 text-sm text-gray-300"
            >
              {{ t('pages.index.steamTopUp.noServices') }}
            </p>

            <div class="space-y-5">
              <label class="block space-y-2">
                <span class="block text-sm font-medium text-gray-300">
                  {{ t('pages.index.steamTopUp.account') }}
                </span>
                <TheInput
                  class="steam-topup-field"
                  v-model.trim="steamAccount"
                  type="text"
                  autocomplete="off"
                  :placeholder="t('pages.index.steamTopUp.accountPlaceholder')"
                />
              </label>

              <label class="block space-y-2">
                <span class="block text-sm font-medium text-gray-300">
                  {{ t('pages.index.steamTopUp.quantity') }}
                </span>
                <TheInput
                  class="steam-topup-field steam-topup-amount-input"
                  v-model.trim="steamQuantity"
                  type="number"
                  min="0.01"
                  :step="currencyInputStep"
                  inputmode="decimal"
                  :placeholder="t('pages.index.steamTopUp.quantityPlaceholder')"
                >
                  <template #append>
                    <span class="text-sm font-medium text-gray-400">{{ currencySymbol }}</span>
                  </template>
                </TheInput>
              </label>

              <label class="block space-y-2">
                <span class="block text-sm font-medium text-gray-300">
                  {{ t('pages.index.steamTopUp.promoCode') }}
                </span>
                <TheInput
                  class="steam-topup-field"
                  v-model.trim="steamPromoCode"
                  type="text"
                  autocomplete="off"
                  :placeholder="t('pages.index.steamTopUp.promoCodePlaceholder')"
                />
              </label>

              <div class="flex flex-wrap gap-2">
                <button
                  v-for="amount in quickAmounts"
                  :key="amount"
                  type="button"
                  class="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-all duration-200"
                  :class="isQuickAmountActive(amount)
                    ? 'border-blue-500/45 bg-blue-500/15 text-white'
                    : 'border-dark-700 bg-dark-600/60 text-gray-300 hover:border-dark-500 hover:bg-dark-600 hover:text-white'"
                  @click="setQuickAmount(amount)"
                >
                  {{ formatQuickAmount(amount) }}
                </button>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  class="market-primary-surface market-primary-hover inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-blue-600/45 disabled:text-white/75 sm:w-auto sm:min-w-[220px]"
                  :disabled="!steamCanCreateOrder || steamCheckoutSubmitting || steamServicesLoading"
                  @click="submitSteamTopUpPayment"
                >
                  <Loader2 v-if="steamCheckoutSubmitting" class="h-4 w-4 animate-spin" />
                  <span>
                    {{ steamCheckoutSubmitting ? t('pages.index.steamTopUp.payingOrder') : t('pages.index.steamTopUp.payNow') }}
                  </span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.steam-topup-page__glow {
  background: var(--page-hero-radial-blue-strong);
}

.steam-topup-field :deep(input) {
  background: var(--steam-topup-field-bg);
  border-color: var(--steam-topup-field-border);
}

.steam-topup-field :deep(input:focus) {
  border-color: var(--steam-topup-field-focus);
}

.steam-topup-field :deep(input::placeholder) {
  color: rgb(var(--palette-slate-500));
}

.steam-topup-amount-input :deep(input[type='number']) {
  appearance: textfield;
  -moz-appearance: textfield;
}

.steam-topup-amount-input :deep(input[type='number']::-webkit-outer-spin-button),
.steam-topup-amount-input :deep(input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
</style>
