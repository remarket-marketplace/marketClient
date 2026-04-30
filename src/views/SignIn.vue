<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import TheButton from './forms/TheButton.vue'
import { useUserStore } from '@/stores/user'
import Captcha from '@/components/Captcha.vue'
import Title from '@/components/Title.vue'
import { buildAuthRedirectQuery, getAuthRedirectFromRoute } from '@/utils/authRedirect'
import { queueAuthWelcomeToast } from '@/utils/authWelcomeToast'

const sended = ref(false)
const email = ref('')
const captchaToken = ref('')
const captchaRenderKey = ref(0)
const welcomeUsername = ref('')
const errorMessage = ref('')
const emailError = ref('')

const authStage = ref<'email' | 'code'>('email')
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const resendSecondsLeft = ref(0)
const isResendingLoginCode = ref(false)
let resendTimer: ReturnType<typeof window.setInterval> | null = null

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const afterAuthRedirect = computed(() => getAuthRedirectFromRoute(route))
const signUpLocation = computed(() => ({
  path: '/signup',
  query: buildAuthRedirectQuery(afterAuthRedirect.value),
}))

const welcomeTitle = computed(() => {
  const safeUsername = welcomeUsername.value.trim() || t('common.user')
  return t('pages.auth.signIn.welcomeTitle', { username: safeUsername })
})


function resolveWelcomeUsername(): string {
  const usernameFromStore = userStore.user?.username?.trim()
  if (usernameFromStore) {
    return usernameFromStore
  }

  const usernameFromEmail = email.value.trim().split('@')[0]?.trim()
  if (usernameFromEmail) {
    return usernameFromEmail
  }

  return t('common.user')
}

function refreshCaptcha() {
  captchaToken.value = ''
  captchaRenderKey.value += 1
}

function validateEmail() {
  emailError.value = ''
  const normalizedEmail = email.value.trim()
  email.value = normalizedEmail

  if (normalizedEmail.length > 64) {
    emailError.value = t('pages.auth.signUp.emailLengthError')
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalizedEmail)) {
    emailError.value = t('pages.auth.signUp.invalidEmail')
    return false
  }

  return true
}

function clearEmailError() {
  emailError.value = ''
}

function clearResendTimer() {
  if (!resendTimer) return
  window.clearInterval(resendTimer)
  resendTimer = null
}

function startResendCooldown(seconds = 30) {
  clearResendTimer()
  resendSecondsLeft.value = seconds
  resendTimer = window.setInterval(() => {
    if (resendSecondsLeft.value <= 1) {
      clearResendTimer()
      resendSecondsLeft.value = 0
      return
    }
    resendSecondsLeft.value -= 1
  }, 1000)
}

function resetLoginCodeState() {
  authStage.value = 'email'
  codeDigits.value = ['', '', '', '', '', '']
  clearResendTimer()
  resendSecondsLeft.value = 0
  isResendingLoginCode.value = false
  errorMessage.value = ''
  refreshCaptcha()
}

function showWelcome() {
  welcomeUsername.value = resolveWelcomeUsername()
  queueAuthWelcomeToast({
    title: welcomeTitle.value,
  })
  void router.push(afterAuthRedirect.value)
}

async function signIn() {
  if (sended.value || authStage.value !== 'email') return

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signIn.completeCaptcha')
    return
  }

  sended.value = true
  errorMessage.value = ''

  try {
    if (!email.value.trim()) {
      errorMessage.value = t('errors.FILL_ALL_INPUTS')
      return
    }

    if (!validateEmail()) {
      return
    }

    await authService.sendLoginCode(email.value, captchaToken.value)
    codeDigits.value = ['', '', '', '', '', '']
    authStage.value = 'code'
    refreshCaptcha()
    startResendCooldown()
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (e: any) {
    const detail = e?.response?.data?.detail
    const errorCode = detail?.error_code

    if (errorCode === 'USER_IS_BANNED' || errorCode === 'USER IS BANNED') {
      const reasonCode = typeof detail?.ban_reason_code === 'string' ? detail.ban_reason_code : undefined
      const reasonText = typeof detail?.ban_reason_text === 'string' ? detail.ban_reason_text : undefined
      router.push({
        name: 'banned',
        query: {
          reasonCode,
          reasonText,
        },
      })
      return
    }

    if (errorCode) {
      errorMessage.value = getErrorMessage(detail, t)
    } else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
    refreshCaptcha()
  } finally {
    sended.value = false
  }
}

async function resendTwoFactorCode() {
  if (
    sended.value
    || isResendingLoginCode.value
    || authStage.value !== 'code'
    || resendSecondsLeft.value > 0
  ) {
    return
  }

  if (!email.value.trim() || !captchaToken.value) {
    errorMessage.value = t('pages.auth.signIn.completeCaptcha')
    return
  }

  isResendingLoginCode.value = true
  errorMessage.value = ''
  try {
    await authService.sendLoginCode(email.value, captchaToken.value)
    codeDigits.value = ['', '', '', '', '', '']
    refreshCaptcha()
    startResendCooldown()
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (e: any) {
    const detail = e?.response?.data?.detail
    const errorCode = detail?.error_code
    if (errorCode) {
      errorMessage.value = getErrorMessage(detail, t)
    } else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
    refreshCaptcha()
  } finally {
    isResendingLoginCode.value = false
  }
}

async function confirmTwoFactorSignIn() {
  if (sended.value || authStage.value !== 'code') return

  const code = codeDigits.value.join('')
  if (code.length !== 6) {
    errorMessage.value = t('pages.auth.signIn.twoFactor.invalidCode')
    return
  }

  sended.value = true
  errorMessage.value = ''
  try {
    await authService.confirmLoginCode(email.value, code)
    showWelcome()
  } catch (e: any) {
    const detail = e?.response?.data?.detail
    const errorCode = detail?.error_code
    if (errorCode) {
      errorMessage.value = getErrorMessage(detail, t)
    } else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
  } finally {
    sended.value = false
  }
}

function handleCodeInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '')

  const digit = value[0] ?? ''
  codeDigits.value[index] = digit
  target.value = digit

  if (digit && index < 5) {
    nextTick(() => {
      codeInputs.value[index + 1]?.focus()
    })
  }
}

function handleCodeKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    event.preventDefault()
    nextTick(() => {
      codeInputs.value[index - 1]?.focus()
    })
  }
}

function handleCodePaste(event: ClipboardEvent) {
  event.preventDefault()
  const paste = event.clipboardData?.getData('text') ?? ''
  const digits = paste.replace(/\D/g, '').slice(0, 6).split('')

  digits.forEach((digit, i) => {
    codeDigits.value[i] = digit
  })

  nextTick(() => {
    const nextIndex = digits.length < 6 ? digits.length : 5
    codeInputs.value[nextIndex]?.focus()
  })
}

onUnmounted(() => {
  clearResendTimer()
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-10">
    <div
      class="max-w-sm w-full border border-[rgb(var(--palette-dark-700))] rounded-2xl bg-background p-8 backdrop-blur-md space-y-6 my-auto"
    >
      <Title :text="t('pages.auth.signIn.title')" class="text-center text-4xl" />

      <form v-if="authStage === 'email'" class="space-y-4" novalidate @submit.prevent="signIn">
          <div>
            <label for="email" class="mb-1 block text-sm text-[var(--text-secondary)]">
              {{ $t('common.email') }}
            </label>
            <TheInput
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('common.email')"
              required
              :maxlength="64"
              autocomplete="email"
              @blur="validateEmail"
              @input="clearEmailError"
            />
            <p v-if="emailError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ emailError }}</p>
          </div>

          <div>
            <Captcha :key="captchaRenderKey" @verified="(token: string) => captchaToken = token" />
          </div>

          <TheButton
            @click="signIn"
            :button-text="!sended ? $t('pages.auth.signIn.login') : $t('common.sending')"
            :sended="sended"
          />

          <ErrorBanner :message="errorMessage" />
      </form>

      <form v-else class="space-y-4" @submit.prevent="confirmTwoFactorSignIn">
          <div class="space-y-2">
            <label class="block text-sm text-text-secondary">{{ $t('pages.auth.signIn.twoFactor.title') }}</label>
            <p class="text-xs text-[var(--text-muted)]">{{ $t('pages.auth.signIn.twoFactor.hint') }}</p>
            <div class="grid grid-cols-6 gap-2">
              <input
                v-for="(_, index) in 6"
                :key="index"
                :ref="el => codeInputs[index] = el as HTMLInputElement"
                v-model="codeDigits[index]"
                type="text"
                maxlength="1"
                inputmode="numeric"
                pattern="[0-9]*"
                class="flex-1 aspect-square min-w-0 border border-1 border-[rgb(var(--palette-dark-700))] rounded-lg bg-[rgb(var(--palette-dark-600))] text-center text-lg text-mainText font-bold transition-all focus:border-[var(--accent-surface)] focus:outline-none"
                @input="handleCodeInput($event, index)"
                @keydown="handleCodeKeyDown($event, index)"
                @paste="handleCodePaste"
              >
            </div>
          </div>

          <ErrorBanner :message="errorMessage" />

          <div>
            <Captcha :key="captchaRenderKey" @verified="(token: string) => captchaToken = token" />
          </div>

          <button
            type="button"
            class="w-full text-center text-sm text-text-link hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
            :disabled="sended || isResendingLoginCode || resendSecondsLeft > 0 || !captchaToken"
            @click="resendTwoFactorCode"
          >
            {{
              resendSecondsLeft > 0
                ? $t('pages.auth.signIn.twoFactor.resendIn', { seconds: resendSecondsLeft })
                : $t('pages.auth.signIn.twoFactor.resend')
            }}
          </button>

          <TheButton
            @click="confirmTwoFactorSignIn"
            :button-text="!sended ? $t('pages.auth.signIn.twoFactor.confirm') : $t('common.sending')"
            :sended="sended"
          />

          <button
            type="button"
            class="w-full text-center text-sm text-text-link hover:underline"
            @click="resetLoginCodeState"
          >
            {{ $t('pages.auth.signIn.twoFactor.useAnotherAccount') }}
          </button>
      </form>

      <p v-if="authStage === 'email'" class="text-center text-sm text-text-secondaryDark">
        {{ $t('pages.auth.signIn.noAccount') }}
        <router-link :to="signUpLocation" class="text-text-link hover:underline">
          {{ $t('pages.auth.signIn.register') }}
        </router-link>
      </p>
    </div>
  </div>
</template>
