<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import TheButton from './forms/TheButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import Captcha from '@/components/Captcha.vue'
import { buildAuthRedirectQuery, getAuthRedirectFromRoute } from '@/utils/authRedirect'
import { queueAuthWelcomeToast } from '@/utils/authWelcomeToast'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// Данные регистрации
const email = ref('')
const username = ref('')

const captchaToken = ref('')
const captchaRenderKey = ref(0)


// Состояния отправки форм
const sended = ref(false)

const showCodeInput = ref(false)
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const errorMessage = ref('')
const welcomeUsername = ref('')
const afterAuthRedirect = computed(() => getAuthRedirectFromRoute(route))
const signInLocation = computed(() => ({
  path: '/signin',
  query: buildAuthRedirectQuery(afterAuthRedirect.value),
}))

// Ошибки валидации
const usernameError = ref('')
const emailError = ref('')

function refreshCaptcha() {
  captchaToken.value = ''
  captchaRenderKey.value += 1
}

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

const canRequestVerificationCode = computed(() =>
  !sended.value
  && !showCodeInput.value
  && Boolean(captchaToken.value)
  && isUsernameValidForSubmit.value
  && isEmailValidForSubmit.value
)

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

function validateForm() {
  const isUsernameValid = validateUsername()
  const isEmailValid = validateEmail()

  return isUsernameValid && isEmailValid
}

function normalizeCredentials() {
  username.value = username.value.trim()
  email.value = email.value.trim()
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

async function sendCode() {
  if (sended.value) {
    return
  }

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signUp.completeCaptcha')
    return
  }

  normalizeCredentials()

  if (!validateForm()) {
    return
  }

  errorMessage.value = ''
  sended.value = true

  try {
    await authService.sendVerificationCode(email.value, username.value, captchaToken.value)
    showCodeInput.value = true
    codeDigits.value = ['', '', '', '', '', '']
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (error) {
    errorMessage.value = resolveRequestError(error)
  } finally {
    refreshCaptcha()
    sended.value = false
  }
}

function handlePaste(event: ClipboardEvent) {
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


async function completeSignUp() {
  if (sended.value) {
    return
  }

  normalizeCredentials()

  const code = codeDigits.value.join('')
  if (!code || code.length !== 6) {
    errorMessage.value = t('pages.auth.signUp.invalidCode')
    return
  }

  errorMessage.value = ''
  sended.value = true

  try {
    await authService.signUp(email.value, username.value, code)
    showCodeInput.value = false
    welcomeUsername.value = username.value.trim() || t('common.user')
    queueAuthWelcomeToast({
      title: welcomeTitle.value,
    })
    void router.push(afterAuthRedirect.value)
  } catch (error) {
    errorMessage.value = resolveRequestError(error)
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

function handleKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    event.preventDefault()
    nextTick(() => {
      codeInputs.value[index - 1]?.focus()
    })
  }
}

// Сброс ошибок при вводе
function clearUsernameError() {
  usernameError.value = ''
}

function clearEmailError() {
  emailError.value = ''
}

const welcomeTitle = computed(() => {
  const safeUsername = welcomeUsername.value.trim() || t('common.user')
  return t('pages.auth.signIn.welcomeTitle', { username: safeUsername })
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-10">
    <div
      class="max-w-sm w-full border border-[rgb(var(--palette-dark-700))] rounded-2xl bg-background p-8 backdrop-blur-md space-y-6 my-auto"
    >
        <h1 class="text-center text-3xl text-mainText font-bold">
          {{ $t('pages.auth.signUp.title') }}
        </h1>

        <!-- Форма регистрации -->
        <form v-if="!showCodeInput" class="space-y-4" novalidate @submit.prevent="sendCode">
          <!-- Username -->
          <div>
            <label for="username" class="mb-1 block text-sm text-text-secondary">{{ $t('common.username') }}</label>
            <TheInput id="username" v-model="username" type="text"
              placeholder="" required @blur="validateUsername"
              @input="clearUsernameError" :minlength="4" :maxlength="32" autocomplete="username" />
            <p v-if="usernameError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ usernameError }}</p>
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="mb-1 block text-sm text-text-secondary">{{ $t('common.email') }}</label>
            <TheInput id="email" v-model="email" type="email" placeholder="" required
              @blur="validateEmail" @input="clearEmailError" :maxlength="64" autocomplete="email" />
            <p v-if="emailError" class="mt-1 text-xs leading-4 text-[var(--danger-text-soft)]">{{ emailError }}</p>
          </div>

          <Captcha :key="captchaRenderKey" @verified="(token: string) => captchaToken = token" />

          <p class="text-xs leading-relaxed text-[var(--text-muted)]">
            {{ $t('pages.auth.signUp.legalPrefix') }}
            <router-link to="/terms" class="text-[var(--link-text)] transition-colors hover:text-[var(--accent-text)] hover:underline">
              {{ $t('pages.auth.signUp.legalTerms') }}
            </router-link>
            {{ ' ' + $t('pages.auth.signUp.legalAnd') + ' ' }}
            <router-link to="/privacy-policy" class="text-[var(--link-text)] transition-colors hover:text-[var(--accent-text)] hover:underline">
              {{ $t('pages.auth.signUp.legalPrivacy') }}
            </router-link>.
          </p>

          <TheButton :button-text="sended ? $t('common.sending') : $t('pages.auth.signUp.getCode')"
            :sended="sended" :disabled="!canRequestVerificationCode" class="w-full" />

          <ErrorBanner :message="errorMessage" />
        </form>

        <!-- Форма ввода кода -->
        <form v-if="showCodeInput" class="space-y-4" @submit.prevent="completeSignUp">
          <div class="space-y-2">
            <label class="block text-sm text-text-secondary">{{ $t('pages.auth.signUp.enterCode') }}</label>
            <div class="grid grid-cols-6 gap-2">
              <input v-for="(digit, index) in 6" :key="index" :ref="el => codeInputs[index] = el as HTMLInputElement"
                v-model="codeDigits[index]" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*"
                class="flex-1 aspect-square min-w-0 border border-1 border-[rgb(var(--palette-dark-700))] rounded-lg bg-[rgb(var(--palette-dark-600))] text-center text-lg text-mainText font-bold transition-all focus:border-[var(--accent-surface)] focus:outline-none"
                @input="handleCodeInput($event, index)" @keydown="handleKeyDown($event, index)" @paste="handlePaste">
            </div>
          </div>

          <div>
            <ErrorBanner :message="errorMessage" />
          </div>

          <TheButton :button-text="$t('pages.auth.signUp.completeRegistration')" :sended="sended" />
        </form>

        <p class="text-center text-sm text-text-secondaryDark">
          {{ $t('pages.auth.signUp.haveAccount') }}
          <router-link :to="signInLocation" class="text-text-link hover:underline">
            {{ $t('pages.auth.signUp.login') }}
          </router-link>
        </p>
    </div>
  </div>
</template>
