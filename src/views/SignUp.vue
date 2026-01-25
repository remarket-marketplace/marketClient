<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import TheButton from './forms/TheButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import SuccessMessage from '@/components/SuccessMessage.vue'
import Captcha from '@/components/Captcha.vue'

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
const successShown = ref(false)

// Ошибки валидации
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')

function validateUsername() {
  usernameError.value = ''

  if (username.value.length < 3 || username.value.length > 16) {
    usernameError.value = t('pages.auth.signUp.usernameLengthError')
    return false
  }

  if (!/^[A-Za-z0-9_]+$/.test(username.value)) {
    usernameError.value = t('pages.auth.signUp.usernameCharsError')
    return false
  }

  return true
}

function validateEmail() {
  emailError.value = ''

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    emailError.value = t('pages.auth.signUp.invalidEmail')
    return false
  }

  return true
}

function validatePassword() {
  passwordError.value = ''

  if (password.value.length < 8) {
    passwordError.value = t('pages.auth.signUp.passwordLengthError')
    return false
  }

  if (!/[A-Z]/.test(password.value)) {
    passwordError.value = t('pages.auth.signUp.passwordUppercaseError')
    return false
  }

  if (!/[a-z]/.test(password.value)) {
    passwordError.value = t('pages.auth.signUp.passwordLowercaseError')
    return false
  }

  if (!/\d/.test(password.value)) {
    passwordError.value = t('pages.auth.signUp.passwordDigitError')
    return false
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password.value)) {
    passwordError.value = t('pages.auth.signUp.passwordSpecialCharError')
    return false
  }

  return true
}

function validateForm() {
  const isUsernameValid = validateUsername()
  const isEmailValid = validateEmail()
  const isPasswordValid = validatePassword()

  return isUsernameValid && isEmailValid && isPasswordValid
}

async function sendCode() {
  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signUp.completeCaptcha')
    return
  }

  if (!validateForm()) return

  if (await passwordsEquals()) {
    errorMessage.value = ''
    sended.value = true
    try {
      await authService.sendVerificationCode(email.value, username.value, captchaToken.value)
      showCodeInput.value = true
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      errorMessage.value = getErrorMessage(detail, t)
    } finally {
      sended.value = false
    }
  } else {
    errorMessage.value = t('pages.auth.signUp.passwordsMustEqual')
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

async function passwordsEquals(): Promise<boolean> {
  if (password.value !== passwordRepeat.value) {
    errorMessage.value = t('pages.auth.signUp.passwordsMismatch')
    return false
  }
  return true
}

async function completeSignUp() {
  if (await passwordsEquals()) {
    const code = codeDigits.value.join('')
    if (!code || code.length !== 6) {
      errorMessage.value = t('pages.auth.signUp.invalidCode')
      return
    }
    errorMessage.value = ''
    sended.value = true
    const result = await authService.signUp(email.value, password.value, username.value, code)
    if (result) {
      showCodeInput.value = false
      successShown.value = true

      setTimeout(() => {
        router.push('/')
      }, 500)
    } else {
      errorMessage.value = t('pages.auth.signUp.invalidCode')
    }

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
</script>

<template>
  <div class=" h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-10">
    <div
      class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6 my-auto">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.auth.signUp.title') }}
      </h1>

      <!-- Форма регистрации -->
      <form v-if="!showCodeInput && !successShown" class="space-y-4" @submit.prevent>
        <!-- Username -->
        <div>
          <label for="username" class="mb-1 block text-sm text-text-secondary">{{ $t('common.username') }}</label>
          <TheInput id="username" v-model="username" type="text"
            :placeholder="$t('pages.auth.signUp.usernamePlaceholder')" required @blur="validateUsername"
            @input="clearUsernameError" />
          <p v-if="usernameError" class="text-gray-300 text-sm mt-1">{{ usernameError }}</p>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="mb-1 block text-sm text-text-secondary">{{ $t('common.email') }}</label>
          <TheInput id="email" v-model="email" type="email" :placeholder="$t('common.email')" required
            @blur="validateEmail" @input="clearEmailError" />
          <p v-if="emailError" class="text-gray-300 text-sm mt-1">{{ emailError }}</p>
        </div>

        <!-- Password с иконкой глаза -->
        <div>
          <label for="password" class="mb-1 block text-sm text-text-secondary">{{ $t('common.password') }}</label>
          <TheInput id="password" v-model="password" :type="passwordHidden ? 'password' : 'text'" placeholder="••••••••"
            required :minlength="8" @blur="validatePassword" @input="clearPasswordError">
            <template #append>
              <button type="button" class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                @click="switchPasswordVisibility">
                <EyeOff v-if="passwordHidden" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </template>
          </TheInput>
          <p v-if="passwordError" class="text-gray-300 text-sm mt-1">{{ passwordError }}</p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="passwordRepeat" class="mb-1 block text-sm text-text-secondary">{{
            $t('pages.auth.signUp.confirmPassword')
          }}</label>
          <TheInput id="passwordRepeat" v-model="passwordRepeat" type="password" placeholder="••••••••" required
            :minlength="8" />
        </div>
        <Captcha @verified="(token: string) => captchaToken = token" />

        <TheButton @click="sendCode" :button-text="sended ? $t('common.sending') : $t('pages.auth.signUp.getCode')"
          :sended="sended" class="w-full" />

        <ErrorBanner :message="errorMessage" />
      </form>

      <SuccessMessage v-if="successShown" :success-message="$t('pages.auth.signUp.success')" />


      <!-- Форма ввода кода -->
      <form v-if="showCodeInput && !successShown" class="space-y-4">
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

        <TheButton @click="completeSignUp" :button-text="$t('pages.auth.signUp.completeRegistration')"
          :sended="sended" />
      </form>

      <p class="text-center text-sm text-text-secondaryDark">
        {{ $t('pages.auth.signUp.haveAccount') }}
        <router-link to="/signin" class="text-text-link hover:underline">
          {{ $t('pages.auth.signUp.login') }}
        </router-link>
      </p>
    </div>
  </div>
</template>