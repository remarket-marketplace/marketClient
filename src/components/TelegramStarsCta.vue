<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import axios from 'axios'

import TheInput from '@/components/TheInput.vue'
import TheButton from '@/views/forms/TheButton.vue'
import { telegramStarsService } from '@/api/telegramStars/telegramStarsService'
import { useUserStore } from '@/stores/user'
import { buildAuthModalLocation } from '@/utils/authRedirect'
import { formatCurrencyAmount } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import { isValidTelegramStarsUsername, normalizeTelegramStarsUsername } from '@/validation/telegramStars/telegramStars'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const telegramUsername = ref('')
const telegramStarsAmount = ref('')
const pricingLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const pricePerStarRub = ref(0)
const pricingEnabled = ref(false)

const normalizedUsername = computed(() => normalizeTelegramStarsUsername(telegramUsername.value))
const normalizedStarsAmount = computed<number | null>(() => {
  const normalized = telegramStarsAmount.value.trim()
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
})
const isUsernameValid = computed(() => isValidTelegramStarsUsername(telegramUsername.value))
const isStarsAmountValid = computed(
  () => normalizedStarsAmount.value !== null && normalizedStarsAmount.value > 0,
)
const totalPriceRub = computed(() => {
  if (!pricingEnabled.value || !isStarsAmountValid.value) return 0
  return Number((normalizedStarsAmount.value * pricePerStarRub.value).toFixed(2))
})
const canSubmit = computed(() => (
  pricingEnabled.value
  && isUsernameValid.value
  && isStarsAmountValid.value
  && !pricingLoading.value
  && !isSubmitting.value
))
const priceLabel = computed(() => formatCurrencyAmount(pricePerStarRub.value, { fromCurrency: 'RUB' }))
const totalPriceLabel = computed(() => formatCurrencyAmount(totalPriceRub.value, { fromCurrency: 'RUB' }))
const buttonText = computed(() => (
  isSubmitting.value
    ? t('pages.index.telegramStars.submitting')
    : totalPriceRub.value > 0
      ? t('pages.index.telegramStars.payAction', { price: totalPriceLabel.value })
      : t('pages.index.telegramStars.buyAction')
))
const shouldShowStatus = computed(() => (
  pricingLoading.value
  || !pricingEnabled.value
  || !user.value
  || Boolean(errorMessage.value)
  || Boolean(successMessage.value)
))

function clearFeedback(): void {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadPricing(): Promise<void> {
  pricingLoading.value = true
  try {
    const pricing = await telegramStarsService.getPricing()
    pricePerStarRub.value = pricing.price_per_star_rub
    pricingEnabled.value = pricing.enabled
  } catch (error) {
    pricingEnabled.value = false
    pricePerStarRub.value = 0
    errorMessage.value = axios.isAxiosError(error)
      ? getErrorMessage(error.response?.data?.detail ?? error.message, t)
      : getErrorMessage(error, t)
  } finally {
    pricingLoading.value = false
  }
}

async function submitPurchase(): Promise<void> {
  clearFeedback()

  if (!user.value) {
    void router.push(buildAuthModalLocation(route))
    return
  }

  if (!canSubmit.value) {
    errorMessage.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  isSubmitting.value = true
  try {
    const response = await telegramStarsService.purchase({
      telegram_username: normalizedUsername.value,
      telegram_stars_amount: normalizedStarsAmount.value!,
    })
    userStore.updateUserProfile({ balance: response.user_balance_after_rub })
    successMessage.value = t('pages.index.telegramStars.success')
  } catch (error) {
    errorMessage.value = axios.isAxiosError(error)
      ? getErrorMessage(error.response?.data?.detail ?? error.message, t)
      : getErrorMessage(error, t)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void loadPricing()
})
</script>

<template>
  <section class="w-full">
    <div
      class="grid gap-2.5 overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(90deg,rgba(18,34,42,0.96)_0%,rgba(19,19,19,0.98)_23%,rgba(16,16,16,0.99)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.2)] lg:px-4 lg:py-2.5"
    >
      <form
        class="grid grid-cols-[minmax(0,1fr)_minmax(112px,0.72fr)] items-center gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(210px,0.68fr)_minmax(0,1.22fr)_minmax(0,0.76fr)_auto]"
        @submit.prevent="submitPurchase"
      >
        <div class="col-span-2 flex min-w-0 items-center gap-3 xl:col-span-1">
          <span class="shrink-0" aria-hidden="true">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-[radial-gradient(circle_at_35%_25%,rgba(45,156,219,0.2),transparent_42%),linear-gradient(180deg,rgb(20,28,37)_0%,rgb(10,15,21)_100%)]"
            >
              <Icon icon="mdi:telegram" class="h-4 w-4 text-[var(--text-title)]" />
            </span>
          </span>

          <div class="min-w-0">
            <p class="text-[1.5rem] font-bold leading-none tracking-[-0.04em] text-white lg:text-[1.65rem]">
              {{ t('pages.index.telegramStars.title') }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <span class="text-[0.88rem] font-bold leading-none text-[rgb(var(--palette-gray-100))]">
                {{ t('pages.index.telegramStars.rateLabel') }}
              </span>
              <span
                class="inline-flex min-h-6 items-center justify-center rounded-full bg-[linear-gradient(180deg,#18abff_0%,#0f9bf5_100%)] px-2.5 text-[0.8rem] font-bold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                {{ priceLabel }}
              </span>
            </div>
          </div>
        </div>

        <label class="grid min-w-0 gap-1.5 rounded-[1.2rem] border border-white/10 bg-black/90 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span class="text-left text-[0.8rem] font-medium leading-none text-[rgb(var(--palette-gray-200))]">
            {{ t('pages.index.telegramStars.usernameLabel') }}
          </span>
          <TheInput
            v-model="telegramUsername"
            class="telegram-stars-entry__input"
            type="text"
            autocomplete="off"
            :placeholder="t('pages.index.telegramStars.usernamePlaceholder')"
          />
        </label>

        <label class="grid min-w-0 gap-1.5 rounded-[1.2rem] border border-white/10 bg-black/90 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span class="text-left text-[0.8rem] font-medium leading-none text-[rgb(var(--palette-gray-200))]">
            {{ t('pages.index.telegramStars.amountLabel') }}
          </span>
          <TheInput
            v-model="telegramStarsAmount"
            class="telegram-stars-entry__input telegram-stars-entry__input--amount"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            :placeholder="t('pages.index.telegramStars.amountPlaceholder')"
          />
        </label>

        <div class="telegram-stars-entry__actions col-span-2 self-center md:col-span-2 md:w-full xl:col-auto xl:w-auto xl:justify-self-end">
          <TheButton
            :button-text="buttonText"
            :sended="isSubmitting"
            :disabled="!pricingEnabled || pricingLoading || !isUsernameValid || !isStarsAmountValid"
          />
        </div>
      </form>

      <div v-if="shouldShowStatus" class="grid gap-2">
        <div
          v-if="pricingLoading"
          class="text-[0.84rem] leading-[1.35] text-[rgb(var(--palette-gray-300))]"
        >
          {{ t('pages.index.telegramStars.loadingPricing') }}
        </div>
        <div
          v-else-if="!pricingEnabled"
          class="text-[0.84rem] leading-[1.35] text-[var(--text-warning)]"
        >
          {{ t('pages.index.telegramStars.disabled') }}
        </div>
        <div
          v-else-if="!user"
          class="text-[0.84rem] leading-[1.35] text-[rgb(var(--palette-gray-300))]"
        >
          {{ t('pages.index.telegramStars.authHint') }}
        </div>

        <div
          v-if="errorMessage"
          class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[0.82rem] leading-[1.35] text-[var(--text-danger-soft)]"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[0.82rem] leading-[1.35] text-[var(--text-success)]"
        >
          {{ successMessage }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.telegram-stars-entry__input :deep(input) {
  min-height: 1.6rem;
  border-color: transparent;
  background: transparent;
  color: var(--white-solid);
  padding: 0;
  text-align: left;
  font-size: 0.88rem;
  line-height: 1.1;
  font-weight: 700;
}

.telegram-stars-entry__input :deep(input:focus) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.telegram-stars-entry__input :deep(input::placeholder) {
  color: rgb(var(--palette-gray-100));
  opacity: 0.92;
}

.telegram-stars-entry__input--amount :deep(input) {
  letter-spacing: -0.02em;
}

.telegram-stars-entry__actions :deep(button) {
  min-height: 2.65rem;
  border-radius: 9999px;
  background: linear-gradient(180deg, #18abff 0%, #0f9bf5 100%);
  width: auto;
  min-width: 12rem;
  padding: 0.72rem 1.35rem;
  color: var(--white-solid);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  box-shadow:
    inset 0 1px 0 rgb(var(--palette-white) / 0.18),
    0 16px 40px rgb(24 171 255 / 0.22);
}
@media (min-width: 768px) and (max-width: 1279px) {
  .telegram-stars-entry__actions :deep(button) {
    min-height: 2.9rem;
    width: 100%;
  }
}

@media (max-width: 767px) {
  .telegram-stars-entry__input :deep(input) {
    min-height: 1.55rem;
    font-size: 0.86rem;
  }

  .telegram-stars-entry__actions :deep(button) {
    min-height: 2.8rem;
    width: 100%;
    min-width: 0;
    border-radius: 1rem;
  }
}
</style>
