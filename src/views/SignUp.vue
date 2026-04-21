<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import TheButton from './forms/TheButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import Captcha from '@/components/Captcha.vue'
import AuthWelcomeTyping from '@/components/AuthWelcomeTyping.vue'
import { buildAuthRedirectQuery, getAuthRedirectFromRoute } from '@/utils/authRedirect'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// Данные регистрации
const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const username = ref('')

const captchaToken = ref('')
const captchaRenderKey = ref(0)


// Состояния отправки форм
const sended = ref(false)

const showCodeInput = ref(false)
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const errorMessage = ref('')
const passwordHidden = ref(true)
const passwordRepeatHidden = ref(true)
const successShown = ref(false)
const isWelcomeRedirecting = ref(false)
const afterAuthRedirect = computed(() => getAuthRedirectFromRoute(route))
const signInLocation = computed(() => ({
  path: '/signin',
  query: buildAuthRedirectQuery(afterAuthRedirect.value),
}))

// Ошибки валидации
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const passwordRepeatError = ref('')

function refreshCaptcha() {
  captchaToken.value = ''
  captchaRenderKey.value += 1
}

function normalizePasswordToLatin(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, '')
}

watch(password, (value) => {
  const normalized = normalizePasswordToLatin(value)
  if (normalized !== value) {
    password.value = normalized
  }
})

watch(passwordRepeat, (value) => {
  const normalized = normalizePasswordToLatin(value)
  if (normalized !== value) {
    passwordRepeat.value = normalized
  }
})

function getPasswordRequirementError(): string {
  if (!/[A-Z]/.test(password.value)) {
    return t('pages.auth.signUp.passwordUppercaseError')
  }

  if (!/[a-z]/.test(password.value)) {
    return t('pages.auth.signUp.passwordLowercaseError')
  }

  if (!/\d/.test(password.value)) {
    return t('pages.auth.signUp.passwordDigitError')
  }

  if (!/[^A-Za-z0-9]/.test(password.value)) {
    return t('pages.auth.signUp.passwordSpecialCharError')
  }

  if (password.value.length < 8) {
    return t('pages.auth.signUp.passwordLengthError')
  }

  return ''
}

const passwordHints = computed(() => {
  const value = password.value
  return [
    {
      key: 'length',
      label: t('pages.auth.signUp.passwordLengthError'),
      isMet: value.length >= 8,
    },
    {
      key: 'uppercase',
      label: t('pages.auth.signUp.passwordUppercaseError'),
      isMet: /[A-Z]/.test(value),
    },
    {
      key: 'lowercase',
      label: t('pages.auth.signUp.passwordLowercaseError'),
      isMet: /[a-z]/.test(value),
    },
    {
      key: 'digit',
      label: t('pages.auth.signUp.passwordDigitError'),
      isMet: /\d/.test(value),
    },
    {
      key: 'special',
      label: t('pages.auth.signUp.passwordSpecialCharError'),
      isMet: /[^A-Za-z0-9]/.test(value),
    },
  ]
})

const activePasswordHint = computed(() =>
  passwordHints.value.find((hint) => !hint.isMet) ?? null,
)

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

const isPasswordValidForSubmit = computed(() => password.value.length > 0 && getPasswordRequirementError() === '')

const isPasswordRepeatValidForSubmit = computed(() =>
  passwordRepeat.value.length > 0 && password.value === passwordRepeat.value,
)

const canRequestVerificationCode = computed(() =>
  !sended.value
  && !showCodeInput.value
  && Boolean(captchaToken.value)
  && isUsernameValidForSubmit.value
  && isEmailValidForSubmit.value
  && isPasswordValidForSubmit.value
  && isPasswordRepeatValidForSubmit.value,
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

function validatePassword() {
  passwordError.value = getPasswordRequirementError()
  return passwordError.value === ''
}

function validateForm() {
  const isUsernameValid = validateUsername()
  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword()

  return isUsernameValid && isEmailValid && isPasswordValid
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

  if (!validatePasswordRepeat()) {
    return
  }

  errorMessage.value = ''
  sended.value = true

  try {
    await authService.sendVerificationCode(email.value, username.value, captchaToken.value)
    showCodeInput.value = true
    codeDigits.value = ['', '', '', '', '', '']
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


function switchPasswordVisibility() {
  passwordHidden.value = !passwordHidden.value
}

function switchPasswordRepeatVisibility() {
  passwordRepeatHidden.value = !passwordRepeatHidden.value
}

function validatePasswordRepeat(showFormError = true): boolean {
  passwordRepeatError.value = ''

  if (password.value !== passwordRepeat.value) {
    passwordRepeatError.value = t('pages.auth.signUp.passwordsMismatch')
    if (showFormError) {
      errorMessage.value = t('pages.auth.signUp.passwordsMismatch')
    }
    return false
  }
  passwordRepeatError.value = ''
  return true
}

async function completeSignUp() {
  if (sended.value) {
    return
  }

  normalizeCredentials()

  if (!validatePasswordRepeat()) {
    return
  }

  const code = codeDigits.value.join('')
  if (!code || code.length !== 6) {
    errorMessage.value = t('pages.auth.signUp.invalidCode')
    return
  }

  errorMessage.value = ''
  sended.value = true

  try {
    await authService.signUp(email.value, password.value, username.value, code)
    showCodeInput.value = false
    successShown.value = true
    isWelcomeRedirecting.value = false
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

function clearPasswordError() {
  if (!password.value) {
    passwordError.value = ''
    return
  }

  passwordError.value = getPasswordRequirementError()
}

function clearPasswordRepeatError() {
  if (!passwordRepeat.value.length) {
    passwordRepeatError.value = ''
    return
  }
  void validatePasswordRepeat(false)
}

const welcomeText = computed(() => {
  const safeUsername = username.value.trim() || t('common.user')
  return t('pages.auth.signIn.welcomeTitle', { username: safeUsername })
})

function handleWelcomeFinished() {
  if (isWelcomeRedirecting.value) {
    return
  }

  isWelcomeRedirecting.value = true
  router.push(afterAuthRedirect.value)
}
</script>

<template>
  <div class="h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-10">
    <transition name="signin-stage" mode="out-in">
      <div v-if="successShown" key="welcome" class="my-auto w-full px-4">
        <AuthWelcomeTyping
          :text="welcomeText"
          :duration-ms="900"
          :hold-ms="220"
          @finished="handleWelcomeFinished"
        />
      </div>

      <div
        v-else
        key="form"
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

          <!-- Password с иконкой глаза -->
          <div>
            <label for="password" class="mb-1 block text-sm text-text-secondary">{{ $t('common.password') }}</label>
            <TheInput id="password" v-model="password" :type="passwordHidden ? 'password' : 'text'" placeholder="••••••••"
              required :minlength="8" @blur="validatePassword" @input="clearPasswordError" autocomplete="new-password">
              <template #append>
                <button type="button" class="p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] focus:outline-none"
                  @click="switchPasswordVisibility">
                  <EyeOff v-if="passwordHidden" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
            <div v-if="password.length > 0 && activePasswordHint" class="mt-2">
              <p class="flex items-center gap-2 text-xs leading-4 text-[var(--danger-text-soft)]">
                <span class="inline-flex w-3 justify-center font-semibold">•</span>
                <span>{{ activePasswordHint.label }}</span>
              </p>
            </div>
          </div>

          <!-- Confirm Password с иконкой глаза -->
          <div>
            <label for="passwordRepeat" class="mb-1 block text-sm text-text-secondary">{{
              $t('pages.auth.signUp.confirmPassword')
              }}</label>
            <TheInput id="passwordRepeat" v-model="passwordRepeat" :type="passwordRepeatHidden ? 'password' : 'text'" placeholder="••••••••" required
              :minlength="8" autocomplete="new-password" @input="clearPasswordRepeatError" @blur="clearPasswordRepeatError">
              <template #append>
                <button type="button" class="p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] focus:outline-none"
                  @click="switchPasswordRepeatVisibility">
                  <EyeOff v-if="passwordRepeatHidden" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
            <p v-if="passwordRepeatError" class="mt-1 text-sm text-[var(--danger-text-soft)]">{{ passwordRepeatError }}</p>
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
    </transition>
  </div>
</template>

<style scoped>
.signin-stage-enter-active,
.signin-stage-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
}

.signin-stage-enter-from,
.signin-stage-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
