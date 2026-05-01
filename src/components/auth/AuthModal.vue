<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import AppModal from '@/components/AppModal.vue'
import Captcha from '@/components/Captcha.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import TheButton from '@/views/forms/TheButton.vue'
import { useUserStore } from '@/stores/user'
import { getErrorMessage } from '@/utils/errorsMap'
import { getAuthRedirectFromRoute } from '@/utils/authRedirect'
import { queueAuthWelcomeToast } from '@/utils/authWelcomeToast'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

type AuthMode = 'signin' | 'signup'

const props = defineProps<{
  isOpen: boolean
  mode: AuthMode
}>()

const emit = defineEmits<{
  close: []
  modeChange: [mode: AuthMode]
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isSubmitting = ref(false)
const errorMessage = ref('')
const email = ref('')
const username = ref('')
const emailError = ref('')
const usernameError = ref('')
const captchaToken = ref('')
const captchaRenderKey = ref(0)
const signInStage = ref<'email' | 'code'>('email')
const signUpStage = ref<'profile' | 'code'>('profile')
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const resendSecondsLeft = ref(0)
const isResendingLoginCode = ref(false)
let resendTimer: ReturnType<typeof window.setInterval> | null = null

const afterAuthRedirect = computed(() => getAuthRedirectFromRoute(route))
const isSignIn = computed(() => props.mode === 'signin')
const modalTitle = computed(() => (
  isSignIn.value ? t('pages.auth.signIn.title') : t('pages.auth.signUp.title')
))
const activeStage = computed(() => (
  isSignIn.value ? signInStage.value : signUpStage.value
))
const isCodeStage = computed(() => activeStage.value === 'code')
const canRequestSignUpCode = computed(() =>
  !isSubmitting.value
  && !isCodeStage.value
  && Boolean(captchaToken.value)
  && isUsernameValidForSubmit.value
  && isEmailValidForSubmit.value
)
const welcomeTitle = computed(() => {
  const safeUsername = resolveWelcomeUsername()
  return t('pages.auth.signIn.welcomeTitle', { username: safeUsername })
})
const isUsernameValidForSubmit = computed(() => {
  const normalizedUsername = username.value.trim()
  return (
    normalizedUsername.length >= 4
    && normalizedUsername.length <= 32
    && /^[A-Za-z0-9_]+$/.test(normalizedUsername)
  )
})
const isEmailValidForSubmit = computed(() => {
  const normalizedEmail = email.value.trim()
  if (!normalizedEmail || normalizedEmail.length > 64) {
    return false
  }

  const atIndex = normalizedEmail.indexOf('@')
  const localPart = atIndex >= 0 ? normalizedEmail.slice(0, atIndex) : ''
  if (localPart.length > 64) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
})

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

function refreshCaptcha() {
  captchaToken.value = ''
  captchaRenderKey.value += 1
}

function resetCodeInputs() {
  codeDigits.value = ['', '', '', '', '', '']
}

function resetState() {
  isSubmitting.value = false
  errorMessage.value = ''
  email.value = ''
  username.value = ''
  emailError.value = ''
  usernameError.value = ''
  signInStage.value = 'email'
  signUpStage.value = 'profile'
  resetCodeInputs()
  clearResendTimer()
  resendSecondsLeft.value = 0
  isResendingLoginCode.value = false
  refreshCaptcha()
}

function resetToEmailStep() {
  signInStage.value = 'email'
  resetCodeInputs()
  clearResendTimer()
  resendSecondsLeft.value = 0
  isResendingLoginCode.value = false
  errorMessage.value = ''
  refreshCaptcha()
}

function normalizeCredentials() {
  email.value = email.value.trim()
  username.value = username.value.trim()
}

function validateEmail() {
  emailError.value = ''
  const normalizedEmail = email.value.trim()
  email.value = normalizedEmail

  if (normalizedEmail.length > 64) {
    emailError.value = t('pages.auth.signUp.emailLengthError')
    return false
  }

  const atIndex = normalizedEmail.indexOf('@')
  const localPart = atIndex >= 0 ? normalizedEmail.slice(0, atIndex) : ''
  if (localPart.length > 64) {
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

function validateUsername() {
  usernameError.value = ''
  const normalizedUsername = username.value.trim()
  username.value = normalizedUsername

  if (normalizedUsername.length < 4 || normalizedUsername.length > 32) {
    usernameError.value = t('pages.auth.signUp.usernameLengthError')
    return false
  }

  if (!/^[A-Za-z0-9_]+$/.test(normalizedUsername)) {
    usernameError.value = t('pages.auth.signUp.usernameCharsError')
    return false
  }

  return true
}

function resolveRequestError(error: any): string {
  const detail = error?.response?.data?.detail
  if (detail) {
    return getErrorMessage(detail, t)
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
    return t('errors.NETWORK_ERROR')
  }

  return t('errors.SERVER_ERROR')
}

function resolveWelcomeUsername(): string {
  const usernameFromStore = userStore.user?.username?.trim()
  if (usernameFromStore) return usernameFromStore

  const usernameFromForm = username.value.trim()
  if (usernameFromForm) return usernameFromForm

  const usernameFromEmail = email.value.trim().split('@')[0]?.trim()
  if (usernameFromEmail) return usernameFromEmail

  return t('common.user')
}

function finishAuth(redirectTarget = afterAuthRedirect.value) {
  queueAuthWelcomeToast({
    title: welcomeTitle.value,
  })
  void router.push(redirectTarget)
}

async function requestLoginCode() {
  if (isSubmitting.value || signInStage.value !== 'email') return

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signIn.completeCaptcha')
    return
  }

  if (!email.value.trim()) {
    errorMessage.value = t('errors.FILL_ALL_INPUTS')
    return
  }

  if (!validateEmail()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await authService.sendLoginCode(email.value, captchaToken.value)
    resetCodeInputs()
    signInStage.value = 'code'
    refreshCaptcha()
    startResendCooldown()
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (error: any) {
    const detail = error?.response?.data?.detail
    const errorCode = detail?.error_code

    if (errorCode === 'USER_IS_BANNED' || errorCode === 'USER IS BANNED') {
      const reasonCode = typeof detail?.ban_reason_code === 'string' ? detail.ban_reason_code : undefined
      const reasonText = typeof detail?.ban_reason_text === 'string' ? detail.ban_reason_text : undefined
      void router.push({
        name: 'banned',
        query: {
          reasonCode,
          reasonText,
        },
      })
      return
    }

    errorMessage.value = errorCode ? getErrorMessage(detail, t) : t('errors.SERVER_ERROR')
    refreshCaptcha()
  } finally {
    isSubmitting.value = false
  }
}

async function resendLoginCode() {
  if (
    isSubmitting.value
    || isResendingLoginCode.value
    || signInStage.value !== 'code'
    || resendSecondsLeft.value > 0
  ) {
    return
  }

  if (!email.value.trim()) {
    errorMessage.value = t('errors.FILL_ALL_INPUTS')
    return
  }

  isResendingLoginCode.value = true
  errorMessage.value = ''
  try {
    await authService.resendLoginCode(email.value)
    resetCodeInputs()
    startResendCooldown()
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (error: any) {
    const detail = error?.response?.data?.detail
    const errorCode = detail?.error_code
    errorMessage.value = errorCode ? getErrorMessage(detail, t) : t('errors.SERVER_ERROR')
  } finally {
    isResendingLoginCode.value = false
  }
}

async function confirmLoginCode() {
  if (isSubmitting.value || signInStage.value !== 'code') return

  const code = codeDigits.value.join('')
  if (code.length !== 6) {
    errorMessage.value = t('pages.auth.signIn.twoFactor.invalidCode')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  const redirectTarget = afterAuthRedirect.value
  try {
    await authService.confirmLoginCode(email.value, code)
    finishAuth(redirectTarget)
  } catch (error: any) {
    const detail = error?.response?.data?.detail
    const errorCode = detail?.error_code
    errorMessage.value = errorCode ? getErrorMessage(detail, t) : t('errors.SERVER_ERROR')
  } finally {
    isSubmitting.value = false
  }
}

async function requestSignUpCode() {
  if (isSubmitting.value || signUpStage.value !== 'profile') return

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signUp.completeCaptcha')
    return
  }

  normalizeCredentials()
  const isValid = validateUsername() && validateEmail()
  if (!isValid) return

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authService.sendVerificationCode(email.value, username.value, captchaToken.value)
    signUpStage.value = 'code'
    resetCodeInputs()
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (error) {
    errorMessage.value = resolveRequestError(error)
  } finally {
    refreshCaptcha()
    isSubmitting.value = false
  }
}

async function completeSignUp() {
  if (isSubmitting.value || signUpStage.value !== 'code') return

  normalizeCredentials()
  const code = codeDigits.value.join('')
  if (!code || code.length !== 6) {
    errorMessage.value = t('pages.auth.signUp.invalidCode')
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  const redirectTarget = afterAuthRedirect.value

  try {
    await authService.signUp(email.value, username.value, code)
    finishAuth(redirectTarget)
  } catch (error) {
    errorMessage.value = resolveRequestError(error)
  } finally {
    isSubmitting.value = false
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

  digits.forEach((digit, index) => {
    codeDigits.value[index] = digit
  })

  nextTick(() => {
    const nextIndex = digits.length < 6 ? digits.length : 5
    codeInputs.value[nextIndex]?.focus()
  })
}

function switchMode(mode: AuthMode) {
  if (props.mode === mode) return
  errorMessage.value = ''
  emit('modeChange', mode)
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetState()
  }
})

watch(() => props.mode, () => {
  resetState()
})

onBeforeUnmount(() => {
  clearResendTimer()
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="modalTitle"
    size="sm"
    title-scale="large"
    header-align="center"
    :dismissible="!isSubmitting"
    panel-class="auth-modal-panel"
    body-class="auth-modal-body"
    @cancel="emit('close')"
  >
    <form v-if="isSignIn && signInStage === 'email'" class="space-y-4" novalidate @submit.prevent="requestLoginCode">
      <div>
        <label for="auth-signin-email" class="mb-1 block text-sm text-[var(--text-secondary)]">
          {{ t('common.email') }}
        </label>
        <TheInput
          id="auth-signin-email"
          v-model="email"
          type="email"
          :placeholder="t('common.email')"
          required
          :maxlength="64"
          autocomplete="email"
          @blur="validateEmail"
          @input="emailError = ''"
        />
        <p v-if="emailError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ emailError }}</p>
      </div>

      <Captcha :key="captchaRenderKey" @verified="(token: string) => captchaToken = token" />

      <TheButton
        :button-text="!isSubmitting ? t('pages.auth.signIn.login') : t('common.sending')"
        :sended="isSubmitting"
      />

      <ErrorBanner :message="errorMessage" />
    </form>

    <form v-else-if="isSignIn" class="space-y-4" @submit.prevent="confirmLoginCode">
      <div class="space-y-2">
        <label class="block text-sm text-text-secondary">{{ t('pages.auth.signIn.twoFactor.title') }}</label>
        <p class="text-xs text-[var(--text-muted)]">{{ t('pages.auth.signIn.twoFactor.hint') }}</p>
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
            class="auth-code-input"
            @input="handleCodeInput($event, index)"
            @keydown="handleCodeKeyDown($event, index)"
            @paste="handleCodePaste"
          >
        </div>
      </div>

      <ErrorBanner :message="errorMessage" />

      <button
        type="button"
        class="w-full text-center text-sm text-text-link hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
        :disabled="isSubmitting || isResendingLoginCode || resendSecondsLeft > 0"
        @click="resendLoginCode"
      >
        {{
          resendSecondsLeft > 0
            ? t('pages.auth.signIn.twoFactor.resendIn', { seconds: resendSecondsLeft })
            : t('pages.auth.signIn.twoFactor.resend')
        }}
      </button>

      <TheButton
        :button-text="!isSubmitting ? t('pages.auth.signIn.twoFactor.confirm') : t('common.sending')"
        :sended="isSubmitting"
      />

      <button
        type="button"
        class="w-full text-center text-sm text-text-link hover:underline"
        @click="resetToEmailStep"
      >
        {{ t('pages.auth.signIn.twoFactor.useAnotherAccount') }}
      </button>
    </form>

    <form v-else-if="signUpStage === 'profile'" class="space-y-4" novalidate @submit.prevent="requestSignUpCode">
      <div>
        <label for="auth-signup-username" class="mb-1 block text-sm text-text-secondary">{{ t('common.username') }}</label>
        <TheInput
          id="auth-signup-username"
          v-model="username"
          type="text"
          required
          :minlength="4"
          :maxlength="32"
          autocomplete="username"
          @blur="validateUsername"
          @input="usernameError = ''"
        />
        <p v-if="usernameError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ usernameError }}</p>
      </div>

      <div>
        <label for="auth-signup-email" class="mb-1 block text-sm text-text-secondary">{{ t('common.email') }}</label>
        <TheInput
          id="auth-signup-email"
          v-model="email"
          type="email"
          required
          :maxlength="64"
          autocomplete="email"
          @blur="validateEmail"
          @input="emailError = ''"
        />
        <p v-if="emailError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ emailError }}</p>
      </div>

      <Captcha :key="captchaRenderKey" @verified="(token: string) => captchaToken = token" />

      <p class="text-xs leading-relaxed text-[var(--text-muted)]">
        {{ t('pages.auth.signUp.legalPrefix') }}
        <router-link to="/terms" class="text-[var(--link-text)] transition-colors hover:text-[var(--accent-text)] hover:underline">
          {{ t('pages.auth.signUp.legalTerms') }}
        </router-link>
        {{ ' ' + t('pages.auth.signUp.legalAnd') + ' ' }}
        <router-link to="/privacy-policy" class="text-[var(--link-text)] transition-colors hover:text-[var(--accent-text)] hover:underline">
          {{ t('pages.auth.signUp.legalPrivacy') }}
        </router-link>.
      </p>

      <TheButton
        :button-text="isSubmitting ? t('common.sending') : t('pages.auth.signUp.getCode')"
        :sended="isSubmitting"
        :disabled="!canRequestSignUpCode"
        class="w-full"
      />

      <ErrorBanner :message="errorMessage" />
    </form>

    <form v-else class="space-y-4" @submit.prevent="completeSignUp">
      <div class="space-y-2">
        <label class="block text-sm text-text-secondary">{{ t('pages.auth.signUp.enterCode') }}</label>
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
            class="auth-code-input"
            @input="handleCodeInput($event, index)"
            @keydown="handleCodeKeyDown($event, index)"
            @paste="handleCodePaste"
          >
        </div>
      </div>

      <ErrorBanner :message="errorMessage" />

      <TheButton
        :button-text="t('pages.auth.signUp.completeRegistration')"
        :sended="isSubmitting"
      />
    </form>

    <p v-if="isSignIn && signInStage === 'email'" class="mt-5 text-center text-sm text-text-secondaryDark">
      {{ t('pages.auth.signIn.noAccount') }}
      <button type="button" class="text-text-link hover:underline" @click="switchMode('signup')">
        {{ t('pages.auth.signIn.register') }}
      </button>
    </p>

    <p v-else-if="!isSignIn" class="mt-5 text-center text-sm text-text-secondaryDark">
      {{ t('pages.auth.signUp.haveAccount') }}
      <button type="button" class="text-text-link hover:underline" @click="switchMode('signin')">
        {{ t('pages.auth.signUp.login') }}
      </button>
    </p>
  </AppModal>
</template>

<style scoped>
.auth-code-input {
  aspect-ratio: 1 / 1;
  min-width: 0;
  border: 1px solid rgb(var(--palette-dark-700));
  border-radius: 0.5rem;
  background: rgb(var(--palette-dark-600));
  text-align: center;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-title);
  transition: border-color 160ms ease, background-color 160ms ease;
}

.auth-code-input:focus {
  border-color: var(--accent-surface);
  outline: none;
}
</style>
