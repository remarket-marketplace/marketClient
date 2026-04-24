<script setup lang="ts">
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
import { promoCodeService } from '@/api/promoCode/promoCodeService'
import BackButton from '@/components/navigation/BackButton.vue'
import TheInput from '@/components/TheInput.vue'
import { useUserStore } from '@/stores/user'
import { convertCurrencyAmount, preferredCurrency } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import type { PromoCodeValidationResponse } from '@/validation/promoCode/promoCode'
import {
  findSteamTopUpServiceByCurrency,
  isValidSteamTopUpAccount,
  normalizeSteamTopUpAccount,
  type SteamTopUpCreatePaymentPayload,
  type SteamTopUpPrecheckResponse,
  type SteamTopUpService,
} from '@/validation/steamTopup/steamTopup'
import { Icon } from '@iconify/vue'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const HOME_STEAM_TOPUP_ENABLED = import.meta.env.VITE_STEAM_TOPUP_ENABLED !== 'false'
const QUICK_AMOUNTS_BY_CURRENCY: Record<string, readonly number[]> = {
  RUB: [100, 500, 1000, 2000, 5000],
  USD: [1, 5, 10, 25, 50],
  EUR: [1, 5, 10, 25, 50],
  KZT: [500, 2500, 5000, 10000, 25000],
  UAH: [50, 200, 500, 1000, 2000],
}
const ZERO_FRACTION_STEAM_CURRENCIES = new Set(['RUB', 'KZT', 'JPY'])

const steamAccount = ref('')
const steamQuantity = ref('')
const steamPromoCode = ref('')
const steamError = ref('')
const steamSuccess = ref('')
const steamCheckoutSubmitting = ref(false)
const steamServices = ref<SteamTopUpService[]>([])
const steamServicesLoading = ref(false)
const steamSelectedCurrency = ref('')
const steamPromoValidationLoading = ref(false)
const steamPromoValidationError = ref('')
const steamPromoValidationResult = ref<PromoCodeValidationResponse | null>(null)
const steamPrecheckLoading = ref(false)
const steamPrecheckError = ref('')
const steamPrecheckResult = ref<SteamTopUpPrecheckResponse | null>(null)
let steamPromoValidationTimer: ReturnType<typeof setTimeout> | null = null
let steamPrecheckTimer: ReturnType<typeof setTimeout> | null = null
let steamPromoValidationRequestId = 0
let steamPrecheckRequestId = 0

function getSteamCurrencySymbol(currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase()
  if (!normalizedCurrency) return ''

  try {
    const formattedParts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1)
    return formattedParts.find((part) => part.type === 'currency')?.value ?? normalizedCurrency
  } catch {
    return normalizedCurrency
  }
}

function getSteamCurrencyStep(currency: string): number {
  return ZERO_FRACTION_STEAM_CURRENCIES.has(currency.trim().toUpperCase()) ? 1 : 0.01
}

function toSteamPromoAmountRub(amount: number, currency: string): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null

  const normalizedCurrency = currency.trim().toUpperCase()
  if (normalizedCurrency === 'RUB') return Number(amount.toFixed(2))
  if (normalizedCurrency === 'USD') {
    return Number(convertCurrencyAmount(amount, 'USD', 'RUB').toFixed(2))
  }

  return null
}

const availableSteamCurrencies = computed<string[]>(() => {
  const uniqueCurrencies = new Set<string>()
  for (const service of steamServices.value) {
    const normalizedCurrency = (service.currency || '').trim().toUpperCase()
    if (normalizedCurrency) {
      uniqueCurrencies.add(normalizedCurrency)
    }
  }
  return Array.from(uniqueCurrencies.values())
})
const currencySymbol = computed(() => getSteamCurrencySymbol(steamSelectedCurrency.value))
const currencyInputStep = computed(() => getSteamCurrencyStep(steamSelectedCurrency.value))
const steamNormalizedAccount = computed(() => normalizeSteamTopUpAccount(steamAccount.value))
const steamIsAccountValid = computed(() => isValidSteamTopUpAccount(steamAccount.value))
const parsedSteamQuantity = computed(() => Number.parseFloat(steamQuantity.value))
const selectedSteamService = computed(() => findSteamTopUpServiceByCurrency(steamServices.value, steamSelectedCurrency.value))
const steamAmountRub = computed(() => toSteamPromoAmountRub(parsedSteamQuantity.value, steamSelectedCurrency.value))
const steamNormalizedPromoCode = computed(() => steamPromoCode.value.trim().toUpperCase())
const canRunSteamPrecheck = computed(() => (
  steamIsAccountValid.value
  && !!selectedSteamService.value
  && !!steamSelectedCurrency.value
))
const canValidateSteamPromo = computed(() => (
  steamNormalizedPromoCode.value.length >= 3
  && steamIsAccountValid.value
  && !!selectedSteamService.value
  && steamAmountRub.value !== null
  && steamAmountRub.value > 0
))
const quickAmounts = computed(() => [...(QUICK_AMOUNTS_BY_CURRENCY[steamSelectedCurrency.value] ?? [])])
const steamCanCreateOrder = computed(() => {
  if (!user.value) return false
  if (!selectedSteamService.value) return false
  if (!steamIsAccountValid.value) return false
  if (steamPrecheckLoading.value) return false
  if (!steamPrecheckResult.value?.is_match) return false
  return Number.isFinite(parsedSteamQuantity.value) && parsedSteamQuantity.value > 0
})

function resolveSteamErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseDetail = error.response?.data?.detail
    if (responseDetail) {
      return getErrorMessage(responseDetail, t)
    }
    if (error.response?.status === 503) {
      return t('errors.STEAM_TOPUP_DISABLED')
    }
    return getErrorMessage(error.message, t)
  }
  return getErrorMessage(error, t)
}

function clearSteamFeedback(): void {
  steamError.value = ''
  steamSuccess.value = ''
}

function formatRubAmount(amount: number): string {
  return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
}

function clearSteamPromoValidation(): void {
  steamPromoValidationLoading.value = false
  steamPromoValidationError.value = ''
  steamPromoValidationResult.value = null
}

function clearSteamPrecheck(): void {
  steamPrecheckLoading.value = false
  steamPrecheckError.value = ''
  steamPrecheckResult.value = null
}

async function loadSteamServices(): Promise<void> {
  if (!HOME_STEAM_TOPUP_ENABLED || !user.value) return

  steamServicesLoading.value = true
  clearSteamFeedback()
  try {
    const response = await steamTopupService.getServices()
    steamServices.value = response.services
    const currencies = availableSteamCurrencies.value
    const preferredSteamCurrency = preferredCurrency.value === 'USD' ? 'USD' : 'RUB'
    steamSelectedCurrency.value = currencies.includes(preferredSteamCurrency)
      ? preferredSteamCurrency
      : (currencies[0] ?? '')
  } catch (error) {
    steamServices.value = []
    steamSelectedCurrency.value = ''
    steamError.value = resolveSteamErrorMessage(error)
  } finally {
    steamServicesLoading.value = false
  }
}

async function runSteamPrecheck(): Promise<void> {
  if (!canRunSteamPrecheck.value) {
    clearSteamPrecheck()
    return
  }

  steamPrecheckLoading.value = true
  steamPrecheckError.value = ''
  steamPrecheckResult.value = null
  const requestId = ++steamPrecheckRequestId

  try {
    const result = await steamTopupService.precheck({
      account: steamNormalizedAccount.value,
      currency: steamSelectedCurrency.value,
    })
    if (requestId !== steamPrecheckRequestId) return
    steamPrecheckResult.value = result
  } catch (error) {
    if (requestId !== steamPrecheckRequestId) return
    steamPrecheckError.value = resolveSteamErrorMessage(error)
  } finally {
    if (requestId !== steamPrecheckRequestId) return
    steamPrecheckLoading.value = false
  }
}

async function validateSteamPromoCode(): Promise<void> {
  if (!canValidateSteamPromo.value) {
    clearSteamPromoValidation()
    return
  }

  steamPromoValidationLoading.value = true
  steamPromoValidationError.value = ''
  steamPromoValidationResult.value = null
  const requestId = ++steamPromoValidationRequestId

  try {
    const result = await promoCodeService.validate({
      code: steamNormalizedPromoCode.value,
      context_type: 'steam_topup',
      amount: steamAmountRub.value as number,
    })
    if (requestId !== steamPromoValidationRequestId) return
    steamPromoValidationResult.value = result
  } catch (error) {
    if (requestId !== steamPromoValidationRequestId) return
    steamPromoValidationError.value = resolveSteamErrorMessage(error)
  } finally {
    if (requestId !== steamPromoValidationRequestId) return
    steamPromoValidationLoading.value = false
  }
}

function scheduleSteamPrecheck(): void {
  if (steamPrecheckTimer) {
    clearTimeout(steamPrecheckTimer)
  }
  if (!canRunSteamPrecheck.value) {
    clearSteamPrecheck()
    return
  }
  steamPrecheckError.value = ''
  steamPrecheckResult.value = null
  steamPrecheckTimer = setTimeout(() => {
    void runSteamPrecheck()
  }, 350)
}

function scheduleSteamPromoValidation(): void {
  if (steamPromoValidationTimer) {
    clearTimeout(steamPromoValidationTimer)
  }
  if (!steamNormalizedPromoCode.value) {
    clearSteamPromoValidation()
    return
  }
  if (!canValidateSteamPromo.value) {
    steamPromoValidationLoading.value = false
    steamPromoValidationError.value = ''
    steamPromoValidationResult.value = null
    return
  }
  steamPromoValidationTimer = setTimeout(() => {
    void validateSteamPromoCode()
  }, 450)
}

function setQuickAmount(amount: number): void {
  steamQuantity.value = currencyInputStep.value === 1 ? String(amount) : amount.toFixed(2)
  clearSteamFeedback()
}

function isQuickAmountActive(amount: number): boolean {
  return parsedSteamQuantity.value === amount
}

function formatQuickAmount(amount: number): string {
  if (currencyInputStep.value !== 1) {
    return `${currencySymbol.value}${amount.toFixed(2)}`
  }
  return `${Math.round(amount)} ${currencySymbol.value}`
}

function buildSteamCreatePaymentPayload(): SteamTopUpCreatePaymentPayload | null {
  if (!steamIsAccountValid.value) return null
  if (!selectedSteamService.value || !steamSelectedCurrency.value) return null
  if (!Number.isFinite(parsedSteamQuantity.value) || parsedSteamQuantity.value <= 0) return null

  return {
    account: steamNormalizedAccount.value,
    amount: parsedSteamQuantity.value,
    currency: steamSelectedCurrency.value,
    ...(steamNormalizedPromoCode.value ? { promo_code: steamNormalizedPromoCode.value } : {}),
  }
}

async function submitSteamTopUpPayment() {
  if (steamCheckoutSubmitting.value) return

  const payload = buildSteamCreatePaymentPayload()
  if (!payload || !selectedSteamService.value) {
    steamError.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  steamCheckoutSubmitting.value = true
  clearSteamFeedback()
  steamSuccess.value = t('pages.index.steamTopUp.redirectToPayment')

  try {
    const response = await steamTopupService.createPayment(payload)
    window.location.href = response.payment_url
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
    steamSuccess.value = ''
  } finally {
    steamCheckoutSubmitting.value = false
  }
}

watch(steamSelectedCurrency, () => {
  steamQuantity.value = ''
  clearSteamFeedback()
  clearSteamPromoValidation()
  scheduleSteamPrecheck()
})

watch([steamPromoCode, steamQuantity, steamAccount, steamSelectedCurrency], () => {
  scheduleSteamPromoValidation()
})

watch([steamAccount, steamSelectedCurrency], () => {
  scheduleSteamPrecheck()
})

watch(
  () => user.value?.id,
  async (currentUserId) => {
    if (!currentUserId) {
      steamServices.value = []
      steamSelectedCurrency.value = ''
      clearSteamPromoValidation()
      clearSteamPrecheck()
      return
    }
    await loadSteamServices()
    scheduleSteamPromoValidation()
    scheduleSteamPrecheck()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (steamPromoValidationTimer) {
    clearTimeout(steamPromoValidationTimer)
  }
  if (steamPrecheckTimer) {
    clearTimeout(steamPrecheckTimer)
  }
})
</script>

<template>
  <section class="steam-topup-page -mt-14 relative min-h-[calc(100dvh-3.5rem)] overflow-hidden pt-14">
    <div class="steam-topup-page__glow pointer-events-none absolute inset-x-0 -top-24 h-[44vh] opacity-80 blur-2xl" />

    <div class="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-5xl flex-col px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <div class="mb-10 flex items-center justify-between">
        <BackButton />
        <div class="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-[var(--text-muted)] uppercase">
          <Icon icon="mdi:steam" class="h-4 w-4 text-[rgb(var(--text-title-rgb)/0.9)]" />
          Steam
        </div>
      </div>

      <div class="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center">
        <div class="mx-auto mb-8 max-w-lg text-center">
          <h1 class="text-balance text-3xl font-semibold tracking-tight text-[var(--text-title)] sm:text-[2.75rem]">
            {{ t('pages.index.steamTopUp.title') }}
          </h1>
          <p class="mt-3 text-sm text-[var(--text-muted)] sm:text-base">
            {{ t('pages.index.steamTopUp.subtitle') }}
          </p>
        </div>

        <div class="mx-auto w-full max-w-[680px]">
          <p
            v-if="!HOME_STEAM_TOPUP_ENABLED"
            class="mb-5 rounded-lg border border-[rgb(var(--palette-yellow-500)/0.3)] bg-[rgb(var(--palette-yellow-500)/0.1)] px-4 py-3 text-sm text-[var(--text-warning)]"
          >
            {{ t('errors.STEAM_TOPUP_DISABLED') }}
          </p>

          <template v-else>
            <p
              v-if="steamError"
              class="mb-5 rounded-lg border border-[rgb(var(--palette-red-500)/0.3)] bg-[rgb(var(--palette-red-500)/0.1)] px-4 py-3 text-sm text-[var(--text-danger-soft)]"
            >
              {{ steamError }}
            </p>
            <p
              v-if="steamSuccess"
              class="mb-5 rounded-lg border border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-4 py-3 text-sm text-[var(--text-success)]"
            >
              {{ steamSuccess }}
            </p>
            <p
              v-if="steamServicesLoading"
              class="mb-5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm text-[var(--text-body)]"
            >
              {{ t('pages.index.steamTopUp.refreshingOrder') }}
            </p>
            <p
              v-else-if="user && !selectedSteamService && !steamError"
              class="mb-5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm text-[var(--text-body)]"
            >
              {{ t('pages.index.steamTopUp.noServices') }}
            </p>

            <div class="space-y-5">
              <label class="block space-y-2">
                <span class="block text-sm font-medium text-[var(--text-body)]">
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

              <div class="block space-y-2">
                <span class="block text-sm font-medium text-[var(--text-body)]">
                  {{ t('pages.index.steamTopUp.currency') }}
                </span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="currency in availableSteamCurrencies"
                    :key="currency"
                    type="button"
                    class="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-all duration-200"
                    :class="steamSelectedCurrency === currency
                      ? 'border-[rgb(var(--palette-blue-500)/0.45)] bg-[rgb(var(--palette-blue-500)/0.15)] text-[var(--text-title)]'
                      : 'border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.6)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-600))] hover:text-[var(--text-title)]'"
                    @click="steamSelectedCurrency = currency"
                  >
                    {{ currency }}
                  </button>
                </div>
              </div>

              <div
                v-if="steamPrecheckLoading || steamPrecheckError || steamPrecheckResult"
                class="rounded-lg border px-4 py-3 text-sm"
                :class="steamPrecheckError
                  ? 'border-[rgb(var(--palette-red-500)/0.3)] bg-[rgb(var(--palette-red-500)/0.1)] text-[var(--text-danger-soft)]'
                  : steamPrecheckResult?.is_match
                    ? 'border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] text-[var(--text-success)]'
                    : 'border-[rgb(var(--palette-yellow-500)/0.3)] bg-[rgb(var(--palette-yellow-500)/0.1)] text-[var(--text-warning)]'"
              >
                <p v-if="steamPrecheckLoading">
                  {{ t('pages.index.steamTopUp.precheckLoading') }}
                </p>
                <p v-else-if="steamPrecheckError">
                  {{ steamPrecheckError }}
                </p>
                <template v-else-if="steamPrecheckResult">
                  <p>
                    {{
                      steamPrecheckResult.is_match
                        ? t('pages.index.steamTopUp.precheckMatch')
                        : (steamPrecheckResult.message || t('errors.STEAM_TOPUP_ACCOUNT_CURRENCY_MISMATCH'))
                    }}
                  </p>
                  <p
                    v-if="steamPrecheckResult.detected_region || steamPrecheckResult.detected_currency"
                    class="mt-1 text-[var(--text-body)]"
                  >
                    {{
                      t('pages.index.steamTopUp.precheckDetails', {
                        region: steamPrecheckResult.detected_region || '—',
                        currency: steamPrecheckResult.detected_currency || '—',
                      })
                    }}
                  </p>
                </template>
              </div>

              <label class="block space-y-2">
                <span class="block text-sm font-medium text-[var(--text-body)]">
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
                    <span class="text-sm font-medium text-[var(--text-muted)]">{{ currencySymbol }}</span>
                  </template>
                </TheInput>
              </label>

              <label class="block space-y-2">
                <span class="block text-sm font-medium text-[var(--text-body)]">
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

              <div
                v-if="steamNormalizedPromoCode"
                class="rounded-lg border border-[rgb(var(--palette-blue-400)/0.2)] bg-[rgb(var(--palette-blue-500)/0.05)] px-4 py-3 text-sm"
              >
                <p v-if="steamPromoValidationLoading" class="text-[var(--text-accent)]">
                  Проверяем промокод...
                </p>
                <p v-else-if="steamPromoValidationError" class="text-[var(--text-danger-soft)]">
                  {{ steamPromoValidationError }}
                </p>
                <template v-else-if="steamPromoValidationResult">
                  <p class="text-[var(--text-success)]">
                    Промокод применится: скидка {{ formatRubAmount(steamPromoValidationResult.discount_amount) }}.
                  </p>
                  <p class="mt-1 text-[var(--text-body)]">
                    К оплате: {{ formatRubAmount(steamPromoValidationResult.final_amount) }}.
                  </p>
                </template>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  v-for="amount in quickAmounts"
                  :key="amount"
                  type="button"
                  class="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-all duration-200"
                  :class="isQuickAmountActive(amount)
                    ? 'border-[rgb(var(--palette-blue-500)/0.45)] bg-[rgb(var(--palette-blue-500)/0.15)] text-[var(--text-title)]'
                    : 'border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.6)] text-[var(--text-body)] hover:border-[rgb(var(--palette-dark-500))] hover:bg-[rgb(var(--palette-dark-600))] hover:text-[var(--text-title)]'"
                  @click="setQuickAmount(amount)"
                >
                  {{ formatQuickAmount(amount) }}
                </button>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  class="market-primary-surface market-primary-hover inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-[var(--text-title)] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-[rgb(var(--palette-blue-600)/0.45)] disabled:text-[rgb(var(--text-title-rgb)/0.75)] sm:w-auto sm:min-w-[220px]"
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
  min-height: 3.5rem;
  border-color: var(--home-search-glass-border);
  border-radius: 0.75rem;
  background: var(--home-search-glass-bg);
  color: rgb(var(--palette-white) / 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--home-search-glass-shadow);
}

.steam-topup-field :deep(input:focus) {
  border-color: var(--home-search-glass-focus-border);
  background: rgb(var(--palette-white) / 0.04);
  box-shadow: var(--home-search-glass-focus-shadow);
}

.steam-topup-field :deep(input::placeholder) {
  color: rgb(var(--palette-gray-400) / 0.82);
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
