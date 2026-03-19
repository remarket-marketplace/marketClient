<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import TheButton from './forms/TheButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import Captcha from '@/components/Captcha.vue'
import AuthWelcomeTyping from '@/components/AuthWelcomeTyping.vue'

const { t } = useI18n()
const router = useRouter()

// Данные регистрации
const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const username = ref('')

const captchaToken = ref('')


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

// Ошибки валидации
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const passwordSpecialCharRegex = /[!@#$%^&*]/

const usernameRules = computed(() => [
  {
    key: 'length',
    isValid: username.value.trim().length >= 4 && username.value.trim().length <= 32,
    message: t('pages.auth.signUp.usernameLengthError'),
  },
  {
    key: 'chars',
    isValid: /^[A-Za-z0-9_]+$/.test(username.value.trim()),
    message: t('pages.auth.signUp.usernameCharsError'),
  },
])

const emailRules = computed(() => {
  const normalizedEmail = email.value.trim()
  const atIndex = normalizedEmail.indexOf('@')
  const localPart = atIndex >= 0 ? normalizedEmail.slice(0, atIndex) : ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return [
    {
      key: 'length',
      isValid: normalizedEmail.length <= 64 && localPart.length <= 64,
      message: t('pages.auth.signUp.emailLengthError'),
    },
    {
      key: 'format',
      isValid: emailRegex.test(normalizedEmail),
      message: t('pages.auth.signUp.invalidEmail'),
    },
  ]
})

const passwordRules = computed(() => [
  {
    key: 'length',
    isValid: password.value.length >= 8,
    message: t('pages.auth.signUp.passwordLengthError'),
  },
  {
    key: 'uppercase',
    isValid: /[A-Z]/.test(password.value),
    message: t('pages.auth.signUp.passwordUppercaseError'),
  },
  {
    key: 'lowercase',
    isValid: /[a-z]/.test(password.value),
    message: t('pages.auth.signUp.passwordLowercaseError'),
  },
  {
    key: 'digit',
    isValid: /\d/.test(password.value),
    message: t('pages.auth.signUp.passwordDigitError'),
  },
  {
    key: 'special',
    isValid: passwordSpecialCharRegex.test(password.value),
    message: t('pages.auth.signUp.passwordSpecialCharError'),
  },
])

const unmetUsernameRules = computed(() => usernameRules.value.filter((rule) => !rule.isValid))
const unmetEmailRules = computed(() => emailRules.value.filter((rule) => !rule.isValid))
const unmetPasswordRules = computed(() => passwordRules.value.filter((rule) => !rule.isValid))

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

function validatePassword(showError = true) {
  passwordError.value = ''

  if (password.value.length < 8) {
    if (showError) passwordError.value = t('pages.auth.signUp.passwordLengthError')
    return false
  }

  if (!/[A-Z]/.test(password.value)) {
    if (showError) passwordError.value = t('pages.auth.signUp.passwordUppercaseError')
    return false
  }

  if (!/[a-z]/.test(password.value)) {
    if (showError) passwordError.value = t('pages.auth.signUp.passwordLowercaseError')
    return false
  }

  if (!/\d/.test(password.value)) {
    if (showError) passwordError.value = t('pages.auth.signUp.passwordDigitError')
    return false
  }

  if (!passwordSpecialCharRegex.test(password.value)) {
    if (showError) passwordError.value = t('pages.auth.signUp.passwordSpecialCharError')
    return false
  }

  return true
}

function validateForm() {
  const isUsernameValid = validateUsername()
  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword(false)

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

  if (!(await passwordsEquals())) {
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

async function passwordsEquals(): Promise<boolean> {
  if (password.value !== passwordRepeat.value) {
    errorMessage.value = t('pages.auth.signUp.passwordsMismatch')
    return false
  }
  return true
}

async function completeSignUp() {
  if (sended.value) {
    return
  }

  normalizeCredentials()

  if (!(await passwordsEquals())) {
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
  passwordError.value = ''
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
  router.push('/')
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
        class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6 my-auto"
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
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="mb-1 block text-sm text-text-secondary">{{ $t('common.email') }}</label>
            <TheInput id="email" v-model="email" type="email" placeholder="" required
              @blur="validateEmail" @input="clearEmailError" :maxlength="64" autocomplete="email" />
          </div>

          <!-- Password с иконкой глаза -->
          <div>
            <label for="password" class="mb-1 block text-sm text-text-secondary">{{ $t('common.password') }}</label>
            <TheInput id="password" v-model="password" :type="passwordHidden ? 'password' : 'text'" placeholder="••••••••"
              required :minlength="8" @blur="validatePassword" @input="clearPasswordError" autocomplete="new-password">
              <template #append>
                <button type="button" class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility">
                  <EyeOff v-if="passwordHidden" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
            <ul
              v-if="password.length > 0 && unmetPasswordRules.length > 0"
              class="mt-2 space-y-1 text-xs text-gray-400"
            >
              <li
                v-for="rule in unmetPasswordRules"
                :key="rule.key"
              >
                {{ rule.message }}
              </li>
            </ul>
            <p
              v-if="passwordError && password.length > 0 && unmetPasswordRules.length === 0"
              class="text-gray-300 text-sm mt-1"
            >
              {{ passwordError }}
            </p>
          </div>

          <!-- Confirm Password с иконкой глаза -->
          <div>
            <label for="passwordRepeat" class="mb-1 block text-sm text-text-secondary">{{
              $t('pages.auth.signUp.confirmPassword')
              }}</label>
            <TheInput id="passwordRepeat" v-model="passwordRepeat" :type="passwordRepeatHidden ? 'password' : 'text'" placeholder="••••••••" required
              :minlength="8" autocomplete="new-password">
              <template #append>
                <button type="button" class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordRepeatVisibility">
                  <EyeOff v-if="passwordRepeatHidden" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
          </div>
          <Captcha @verified="(token: string) => captchaToken = token" />

          <p class="text-xs text-gray-400 leading-relaxed">
            {{ $t('pages.auth.signUp.legalPrefix') }}
            <router-link to="/terms" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
              {{ $t('pages.auth.signUp.legalTerms') }}
            </router-link>
            {{ ' ' + $t('pages.auth.signUp.legalAnd') + ' ' }}
            <router-link to="/privacy-policy" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
              {{ $t('pages.auth.signUp.legalPrivacy') }}
            </router-link>.
          </p>

          <TheButton :button-text="sended ? $t('common.sending') : $t('pages.auth.signUp.getCode')"
            :sended="sended" class="w-full" />

          <ErrorBanner :message="errorMessage" />
        </form>

        <!-- Форма ввода кода -->
        <form v-if="showCodeInput" class="space-y-4" @submit.prevent="completeSignUp">
          <div class="space-y-2">
            <label class="block text-sm text-text-secondary">{{ $t('pages.auth.signUp.enterCode') }}</label>
            <div class="grid grid-cols-6 gap-2">
              <input v-for="(digit, index) in 6" :key="index" :ref="el => codeInputs[index] = el as HTMLInputElement"
                v-model="codeDigits[index]" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*"
                class="flex-1 aspect-square min-w-0 border border-1 border-dark-700 rounded-lg bg-dark-600 text-center text-lg text-mainText font-bold transition-all focus:border-blue-500 focus:outline-none"
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
          <router-link to="/signin" class="text-text-link hover:underline">
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
