<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import router from '@/router'
import { getErrorMessage } from '@/utils/errorsMap'
import { nextTick, ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import TheButton from './forms/TheButton.vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const { t } = useI18n()

// Состояния
const currentState = ref<'waitEmail' | 'waitConfirmCode' | 'waitNewPassword'>('waitEmail')
const sended = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Данные формы
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const passwordHidden = ref(true)

// Код подтверждения
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const fullCode = computed(() => codeDigits.value.join(''))

// Валидация
const emailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const passwordValid = computed(() => password.value.length >= 8)
const passwordsMatch = computed(() => password.value === confirmPassword.value)
const codeValid = computed(() => fullCode.value.length === 6)

// Автофокус на первое поле при смене состояния
onMounted(() => {
  if (currentState.value === 'waitConfirmCode') {
    nextTick(() => {
      codeInputs.value[0]?.focus()
    })
  }
})

// Обработчики ввода кода
function handleCodeInput(event: Event, index: number) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '')
  const digit = value[0] ?? ''
  
  codeDigits.value[index] = digit
  
  if (digit && index < 5) {
    nextTick(() => {
      codeInputs.value[index + 1]?.focus()
    })
  }
  
  // Автоподтверждение при полном вводе кода
  if (fullCode.value.length === 6) {
    nextTick(() => {
      sendForm()
    })
  }
}

function handleCodePaste(event: ClipboardEvent) {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text') || ''
  const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6)
  
  digits.forEach((digit, index) => {
    if (index < 6) {
      codeDigits.value[index] = digit
    }
  })
  
  const lastFilledIndex = Math.min(digits.length - 1, 5)
  nextTick(() => {
    codeInputs.value[lastFilledIndex]?.focus()
    
    // Автоподтверждение если код полный
    if (fullCode.value.length === 6) {
      setTimeout(() => sendForm(), 100)
    }
  })
}

function handleKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    nextTick(() => {
      codeInputs.value[index - 1]?.focus()
    })
  }
  
  if (event.key === 'Enter') {
    sendForm()
  }
}

// Основная функция отправки формы
async function sendForm() {
  errorMessage.value = ''
  successMessage.value = ''
  sended.value = true

  try {
    if (currentState.value === 'waitEmail') {
      await sendCode()
    } else if (currentState.value === 'waitConfirmCode') {
      await confirmCode()
    } else if (currentState.value === 'waitNewPassword') {
      await setNewPassword()
    }
  } catch (error: any) {
    console.error('Form submission error:', error)
    if (error?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(error.response.data.detail, t)
    } else {
      errorMessage.value = error.message || t('errors.unknownError')
    }
  } finally {
    sended.value = false
  }
}

async function sendCode() {
  if (!email.value) {
    throw new Error(t('pages.passwordRecovery.emailRequired'))
  }
  
  if (!emailValid.value) {
    throw new Error(t('pages.passwordRecovery.invalidEmail'))
  }

  const result = await authService.sendPasswordResetCode(email.value)
  console.log('Send code result:', result)

  if (result === true) {
    currentState.value = 'waitConfirmCode'
    successMessage.value = t('pages.passwordRecovery.codeSent')
    
    // Фокус на первое поле кода
    nextTick(() => {
      codeInputs.value[0]?.focus()
    })
  } else {
    throw new Error(result?.message || t('errors.sendCodeFailed'))
  }
}

async function confirmCode() {
  if (!codeValid.value) {
    throw new Error(t('pages.passwordRecovery.codeRequired'))
  }

  const result = await authService.confirmPasswordResetCode(email.value, fullCode.value)

  if (result === true || result?.success) {
    currentState.value = 'waitNewPassword'
    successMessage.value = t('pages.passwordRecovery.codeVerified')
  } else {
    // Сброс кода при ошибке
    codeDigits.value = ['', '', '', '', '', '']
    nextTick(() => {
      codeInputs.value[0]?.focus()
    })
    throw new Error(result?.message || t('errors.invalidCode'))
  }
}

async function setNewPassword() {
  if (!passwordValid.value) {
    throw new Error(t('pages.passwordRecovery.passwordMinLength', { length: 8 }))
  }

  if (!passwordsMatch.value) {
    throw new Error(t('pages.passwordRecovery.passwordsDoNotMatch'))
  }

  const result = await authService.setNewPassword(email.value, fullCode.value, password.value)

  if (result === true || result?.success) {
    successMessage.value = t('pages.passwordRecovery.passwordChanged')
    
    // Редирект через секунду
    setTimeout(async () => {
      await router.push('/signin')
    }, 1000)
  } else {
    throw new Error(result?.message || t('errors.passwordChangeFailed'))
  }
}

function switchPasswordVisibility() {
  passwordHidden.value = !passwordHidden.value
}

// Повторная отправка кода
async function resendCode() {
  errorMessage.value = ''
  sended.value = true

  try {
    const result = await authService.sendPasswordResetCode(email.value)
    
    if (result === true || result?.success) {
      successMessage.value = t('pages.passwordRecovery.codeResent')
      
      // Сброс полей кода
      codeDigits.value = ['', '', '', '', '', '']
      nextTick(() => {
        codeInputs.value[0]?.focus()
      })
    } else {
      throw new Error(result?.message || t('errors.sendCodeFailed'))
    }
  } catch (error: any) {
    if (error?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(error.response.data.detail, t)
    } else {
      errorMessage.value = error.message || t('errors.unknownError')
    }
  } finally {
    sended.value = false
  }
}

// Сброс процесса
function resetProcess() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  codeDigits.value = ['', '', '', '', '', '']
  currentState.value = 'waitEmail'
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-background px-4">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.resetPassword.title') }}
      </h1>

      <form class="space-y-4" @submit.prevent="sendForm">
        <!-- Баннер ошибок -->
        <ErrorBanner v-if="errorMessage" :message="errorMessage" />
        
        <!-- Баннер успеха -->
        <div v-if="successMessage" class="p-3 bg-green-500/20 border border-green-500 rounded-lg">
          <p class="text-green-400 text-sm text-center">{{ successMessage }}</p>
        </div>

        <!-- Шаг 1: Email -->
        <div v-if="currentState === 'waitEmail'">
          <label for="email" class="mb-2 block text-sm text-gray-300">
            {{ $t('common.email') }}
          </label>
          <TheInput
            id="email"
            v-model="email"
            type="email"
            :placeholder="$t('common.emailPlaceholder')"
            required
            autocomplete="email"
            :error="email.length > 0 && !emailValid"
          />
          <p v-if="email.length > 0 && !emailValid" class="mt-1 text-xs text-red-400">
            {{ $t('validation.invalidEmail') }}
          </p>
        </div>

        <!-- Шаг 2: Код подтверждения -->
        <div v-if="currentState === 'waitConfirmCode'">
          <div class="text-center mb-4">
            <p class="text-text-secondary text-sm">
              {{ $t('pages.passwordRecovery.codeSentTo') }} <strong class="text-mainText">{{ email }}</strong>
            </p>
          </div>
          
          <label class="mb-2 block text-sm text-text-secondary">
            {{ $t('pages.auth.signUp.enterCode') }}
          </label>
          <div class="grid grid-cols-6 gap-2 mb-3">
            <input
              v-for="index in 6"
              :key="index"
              :ref="el => codeInputs[index - 1] = el as HTMLInputElement"
              v-model="codeDigits[index - 1]"
              type="text"
              maxlength="1"
              inputmode="numeric"
              pattern="[0-9]*"
              autocomplete="one-time-code"
              class="flex-1 aspect-square min-w-0 border border-1 border-dark-700 rounded-lg bg-dark-600 text-center text-lg text-mainText font-bold transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              @input="handleCodeInput($event, index - 1)"
              @keydown="handleKeyDown($event, index - 1)"
              @paste="handleCodePaste"
            >
          </div>
          
          <div class="text-center">
            <button
              type="button"
              @click="resendCode"
              :disabled="sended"
              class="text-text-link hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ sended ? $t('common.sending') : $t('pages.passwordRecovery.resendCode') }}
            </button>
          </div>
        </div>

        <!-- Шаг 3: Новый пароль -->
        <div v-if="currentState === 'waitNewPassword'" class="space-y-4">
          <div>
            <label for="password" class="mb-2 block text-sm text-gray-300">
              {{ $t('common.password') }}
            </label>
            <TheInput
              id="password"
              v-model="password"
              :type="passwordHidden ? 'password' : 'text'"
              :placeholder="$t('common.password')"
              required
              :minlength="8"
              autocomplete="new-password"
              :error="password.length > 0 && !passwordValid"
            >
              <template #append>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility"
                  :title="passwordHidden ? $t('common.showPassword') : $t('common.hidePassword')"
                >
                  <component :is="passwordHidden ? Eye : EyeOff" class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
            <p v-if="password.length > 0 && !passwordValid" class="mt-1 text-xs text-red-400">
              {{ $t('validation.passwordMinLength', { length: 8 }) }}
            </p>
          </div>

          <div>
            <label for="confirm-password" class="mb-2 block text-sm text-gray-300">
              {{ $t('common.repeatPassword') }}
            </label>
            <TheInput
              id="confirm-password"
              v-model="confirmPassword"
              :type="passwordHidden ? 'password' : 'text'"
              :placeholder="$t('common.repeatPassword')"
              required
              :minlength="8"
              autocomplete="new-password"
              :error="confirmPassword.length > 0 && !passwordsMatch"
            >
              <template #append>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility"
                  :title="passwordHidden ? $t('common.showPassword') : $t('common.hidePassword')"
                >
                  <component :is="passwordHidden ? Eye : EyeOff" class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
            <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="mt-1 text-xs text-red-400">
              {{ $t('validation.passwordsDoNotMatch') }}
            </p>
          </div>
        </div>

        <!-- Кнопка отправки -->
        <TheButton
          @click="sendForm"
          :button-text="
            sended ? $t('common.sending') : 
            currentState === 'waitEmail' ? $t('pages.passwordRecovery.sendCode') :
            currentState === 'waitConfirmCode' ? $t('pages.passwordRecovery.verifyCode') :
            $t('pages.passwordRecovery.changePassword')
          "
          :sended="sended"
          class="w-full"
          :disabled="
            (currentState === 'waitEmail' && (!emailValid || sended)) ||
            (currentState === 'waitConfirmCode' && (!codeValid || sended)) ||
            (currentState === 'waitNewPassword' && (!passwordValid || !passwordsMatch || sended))
          "
        />

        <!-- Дополнительные действия -->
        <div class="text-center space-y-2">
          <div v-if="currentState !== 'waitEmail'">
            <button
              type="button"
              @click="resetProcess"
              class="text-text-secondary hover:text-text-primary text-sm underline"
            >
              {{ $t('pages.passwordRecovery.useDifferentEmail') }}
            </button>
          </div>
          
          <p class="text-center text-sm pt-2">
            <router-link to="/signin" class="text-text-link hover:underline">
              {{ $t('common.backToSignIn') }}
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Плавные переходы между состояниями */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Стили для disabled состояний */
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>