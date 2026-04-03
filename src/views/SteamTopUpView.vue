<script setup lang="ts">
import { steamTopupService } from '@/api/steamTopup/steamTopupService'
import { useUserStore } from '@/stores/user'
import { isValidSteamTopUpAccount, normalizeSteamTopUpAccount } from '@/validation/steamTopup/steamTopup'
import { getErrorMessage } from '@/utils/errorsMap'
import { Icon } from '@iconify/vue'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const HOME_STEAM_TOPUP_ENABLED = import.meta.env.VITE_STEAM_TOPUP_ENABLED !== 'false'

const steamAccount = ref('')
const steamQuantity = ref('')
const steamError = ref('')
const steamSuccess = ref('')
const steamCheckoutSubmitting = ref(false)

const steamNormalizedAccount = computed(() => normalizeSteamTopUpAccount(steamAccount.value))
const steamIsAccountValid = computed(() => isValidSteamTopUpAccount(steamAccount.value))
const steamCanCreateOrder = computed(() => {
  if (!user.value) return false
  if (!steamIsAccountValid.value) return false

  const quantity = Number.parseFloat(steamQuantity.value)
  return Number.isFinite(quantity) && quantity > 0
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

async function submitSteamTopUpPayment() {
  if (steamCheckoutSubmitting.value) return

  const amountRub = Number.parseFloat(steamQuantity.value)
  if (!steamIsAccountValid.value || !Number.isFinite(amountRub) || amountRub <= 0) {
    steamError.value = t('errors.FILL_REQUIRED_FIELDS')
    return
  }

  steamCheckoutSubmitting.value = true
  clearSteamFeedback()
  steamSuccess.value = t('pages.index.steamTopUp.redirectToPayment')

  try {
    const response = await steamTopupService.createPayment({
      account: steamNormalizedAccount.value,
      amount_rub: amountRub,
    })
    window.location.href = response.payment_url
  } catch (error) {
    steamError.value = resolveSteamErrorMessage(error)
    steamSuccess.value = ''
  } finally {
    steamCheckoutSubmitting.value = false
  }
}
</script>

<template>
  <section class="relative mx-auto w-full max-w-3xl px-2 pb-8 pt-20 sm:px-3">
    <div class="rounded-2xl border border-slate-700/90 bg-gradient-to-br from-[#1b2838] via-[#16202d] to-[#101822] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.38)] sm:p-5">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-500/40 bg-[#0f141b]/70 text-white shadow-inner">
            <Icon icon="mdi:steam" class="h-7 w-7" />
          </span>
          <h1 class="text-lg font-semibold text-white">{{ t('pages.index.steamTopUp.title') }}</h1>
        </div>
        <span class="inline-flex h-6 min-w-9 items-center justify-center rounded-md border border-blue-400/35 bg-blue-500/10 px-2 text-xs font-semibold leading-none text-blue-300">
          5%
        </span>
      </div>

      <p v-if="!HOME_STEAM_TOPUP_ENABLED" class="rounded-lg border border-yellow-500/35 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
        {{ t('errors.STEAM_TOPUP_DISABLED') }}
      </p>

      <template v-else>
        <p v-if="steamError" class="mb-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {{ steamError }}
        </p>
        <p v-if="steamSuccess" class="mb-3 rounded-lg border border-green-500/35 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          {{ steamSuccess }}
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <label class="block flex-1">
            <input
              v-model.trim="steamAccount"
              type="text"
              autocomplete="off"
              class="h-11 w-full rounded-xl border border-slate-600/75 bg-[#0f141b]/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#66c0f4]/50"
              :placeholder="t('pages.index.steamTopUp.account')"
            />
          </label>

          <label class="block sm:w-44">
            <input
              v-model.trim="steamQuantity"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              class="steam-topup-amount-input h-11 w-full rounded-xl border border-slate-600/75 bg-[#0f141b]/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#66c0f4]/50"
              :placeholder="t('pages.index.steamTopUp.quantity')"
            />
          </label>

          <button
            type="button"
            class="h-11 rounded-xl border border-slate-500/60 bg-[#1a2431] px-4 text-sm font-semibold text-slate-100 transition-colors duration-300 hover:border-blue-500 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-55 sm:min-w-[180px]"
            :disabled="!steamCanCreateOrder || steamCheckoutSubmitting"
            @click="submitSteamTopUpPayment"
          >
            {{ steamCheckoutSubmitting ? t('pages.index.steamTopUp.payingOrder') : t('pages.index.steamTopUp.payNow') }}
          </button>
        </div>

        <button
          type="button"
          class="mt-4 text-sm text-slate-300 transition hover:text-white"
          @click="router.push({ path: '/' })"
        >
          {{ t('common.back') }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.steam-topup-amount-input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.steam-topup-amount-input[type='number']::-webkit-outer-spin-button,
.steam-topup-amount-input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
