<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import { Icon } from '@iconify/vue'
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()

const router = useRouter()

// Данные регистрации
const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const username = ref('')

const sended = ref(false)
const showCodeInput = ref(false)
const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const errorMessage = ref('')

const passwordHidden = ref(true)


async function sendCode() {
  if (await passwordsEquals()) {
    errorMessage.value = ''
    sended.value = true
    const result = await authService.sendVerificationCode(email.value, username.value)
    if (result) {
      showCodeInput.value = true
    }
    else {
      errorMessage.value = t('signUp.errorSendCode')
    }
    sended.value = false
  }
}

async function switchPasswordVisibility() {
  passwordHidden.value = !passwordHidden.value
}

async function passwordsEquals(): Promise<boolean> {
  if (password.value !== passwordRepeat.value) {
    errorMessage.value = t('signUp.passwordsMismatch')
    return false
  }
  return true
}

async function completeSignUp() {
  if (await passwordsEquals()) {
    const code = codeDigits.value.join('')
    if (!code || code.length !== 6) {
      errorMessage.value = t('signUp.invalidCode')
      return
    }
    errorMessage.value = ''
    sended.value = true
    const result = await authService.signUp(email.value, password.value, username.value, code)
    if (result) {
      router.push('/')
    }
    else {
      errorMessage.value = t('signUp.invalidCode')
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
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-dark-900 px-4">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-dark-800/90 p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-white font-bold">
        {{ $t('signUp.title') }}
      </h1>

      <p v-if="errorMessage" class="text-center text-red-500">
        {{ errorMessage }}
      </p>

      <!-- Форма регистрации -->
      <form v-if="!showCodeInput" class="space-y-4" @submit.prevent="sendCode">
        <ErrorBanner :message="errorMessage" />
        <div>
          <label for="username" class="mb-1 block text-sm text-gray-300">{{ $t('signUp.username') }}</label>
          <input
            id="username" v-model="username" type="text" required :placeholder="$t('signUp.usernamePlaceholder')"
            class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <div>
          <label for="email" class="mb-1 block text-sm text-gray-300">Email</label>
          <input
            id="email" v-model="email" type="email" required placeholder="Email"
            class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          >
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm text-gray-300">{{ $t('signUp.password') }}</label>
          <div class="flex items-center">
            <input
              id="password" v-model="password" :type="passwordHidden === true ? 'password' : 'text'" required minlength="8"
              placeholder="••••••••"
              class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            >
            <Icon icon="ei:eye" class="mx-3 text-3xl" @click="switchPasswordVisibility" />
          </div>
        </div>

        <div>
          <label for="passwordRepeat" class="mb-1 block text-sm text-gray-300">{{ $t('signUp.confirmPassword') }}</label>
          <input
            id="passwordRepeat" v-model="passwordRepeat" type="password" required minlength="8" placeholder="••••••••"
            class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          >
        </div>

        <button
          type="submit" :disabled="sended"
          class="w-full rounded-lg bg-blue-600 py-2 text-white font-semibold transition-colors duration-200 hover:bg-blue-700"
        >
          {{ $t('signUp.getCode') }}
        </button>
      </form>

      <!-- Форма ввода кода -->
      <form v-else class="space-y-4" @submit.prevent="completeSignUp">
        <div>
          <label class="mb-1 block text-sm text-gray-300">{{ $t('signUp.enterCode') }}</label>
          <div class="flex justify-center space-x-2">
            <input
              v-for="(digit, index) in 6"
              :key="index"
              :ref="el => codeInputs[index] = el as HTMLInputElement"
              v-model="codeDigits[index]"
              type="text"
              maxlength="1"
              inputmode="numeric"
              pattern="[0-9]*"
              class="h-12 w-12 border-2 border-dark-600 rounded-lg bg-dark-500 text-center text-lg text-white font-bold transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @input="handleCodeInput($event, index)"
              @keydown="handleKeyDown($event, index)"
            >
          </div>
        </div>

        <button
          type="submit" :disabled="sended"
          class="w-full rounded-lg bg-green-600 py-2 text-white font-semibold transition-colors duration-200 hover:bg-green-700"
        >
          {{ $t('signUp.completeRegistration') }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500">
        {{ $t('signUp.haveAccount') }}
        <a href="/signin" class="text-blue-400 hover:underline">{{ $t('signUp.login') }}</a>
      </p>
    </div>
  </div>
</template>
