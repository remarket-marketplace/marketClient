<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import router from '@/router'
import { nextTick, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TheButton from './forms/TheButton.vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const { t } = useI18n()
const sended = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const passwordHidden = ref(true)

const currentState = ref<'waitEmail' | 'waitConfirmCode' | 'waitNewPassword'>('waitEmail')

const codeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const fullCode = computed(() => codeDigits.value.join(''))

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
  } else if (!digit && index > 0) {
    nextTick(() => {
      codeInputs.value[index - 1]?.focus()
    })
  }
}

function switchPasswordVisibility() {
  passwordHidden.value = !passwordHidden.value
}

function handleKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    event.preventDefault()
    nextTick(() => {
      codeInputs.value[index - 1]?.focus()
    })
  }
}

async function sendForm() {
  errorMessage.value = ''
  sended.value = true

  try {
    if (currentState.value === 'waitEmail') {
      await sendCode()
    } else if (currentState.value === 'waitConfirmCode') {
      await confirmCode()
    } else if (currentState.value === 'waitNewPassword') {
      await setNewPassword()
    }
  } finally {
    sended.value = false
  }
}

async function sendCode() {
  if (!email.value) {
    throw new Error(t('pages.passwordRecovery.emailRequired'))
  }

  const result = await authService.sendPasswordResetCode(email.value)

  if (result === true) {
    currentState.value = 'waitConfirmCode'
  } else {
    errorMessage.value = result
  }
}

async function confirmCode() {
  if (fullCode.value.length !== 6) {
    throw new Error(t('pages.passwordRecovery.codeRequired'))
  }

  const result = await authService.confirmPasswordResetCode(email.value, fullCode.value)

  if (result === true) {
    currentState.value = 'waitNewPassword'
  } else {
    errorMessage.value = result
  }
}

async function setNewPassword() {
  if (password.value.length < 8) {
    throw new Error(t('pages.passwordRecovery.passwordMinLength', { length: 8 }))
  }

  if (password.value !== confirmPassword.value) {
    throw new Error(t('pages.passwordRecovery.passwordsDoNotMatch'))
  }

  const result = await authService.setNewPassword(email.value, fullCode.value, password.value)

  if (result === true) {
    await router.push('/')
  } else {
    errorMessage.value = result
  }
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-background px-4">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.passwordRecovery.title') }}
      </h1>

      <form class="space-y-4" @submit.prevent>
        <ErrorBanner :error="errorMessage" />

        <div v-if="currentState === 'waitEmail'">
          <label for="email" class="mb-1 block text-sm text-gray-300">{{ $t('common.email') }}</label>
          <TheInput
            id="email"
            v-model="email"
            type="email"
            :placeholder="$t('common.email')"
            required
          />
        </div>

        <div v-if="currentState === 'waitConfirmCode'">
          <label class="mb-1 block text-sm text-text-secondary">{{ $t('pages.auth.signUp.enterCode') }}</label>
          <div class="grid grid-cols-6 gap-2">
            <input
              v-for="index in 6"
              :key="index"
              :ref="el => codeInputs[index - 1] = el as HTMLInputElement"
              v-model="codeDigits[index - 1]"
              type="text"
              maxlength="1"
              inputmode="numeric"
              pattern="[0-9]*"
              class="flex-1 aspect-square min-w-0 border border-1 border-dark-700 rounded-lg bg-dark-600 text-center text-lg text-mainText font-bold transition-all focus:border-blue-500 focus:outline-none"
              @input="handleCodeInput($event, index - 1)"
              @keydown="handleKeyDown($event, index - 1)"
            >
          </div>
        </div>

        <div class="flex flex-col gap-2" v-if="currentState === 'waitNewPassword'">
          <div>
            <label for="password" class="mb-1 block text-sm text-gray-300">{{ $t('common.password') }}</label>
            <TheInput
              id="password"
              v-model="password"
              :type="passwordHidden ? 'password' : 'text'"
              :placeholder="$t('common.password')"
              required
              :minlength="8"
            >
              <template #append>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility"
                >
                  <component :is="passwordHidden ? Eye : EyeOff" class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
          </div>

          <div>
            <label for="confirm-password" class="mb-1 block text-sm text-gray-300">{{ $t('common.repeatPassword') }}</label>
            <TheInput
              id="confirm-password"
              v-model="confirmPassword"
              :type="passwordHidden ? 'password' : 'text'"
              :placeholder="$t('common.repeatPassword')"
              required
              :minlength="8"
              :error="password !== confirmPassword && confirmPassword.length > 0"
            >
              <template #append>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility"
                >
                  <component :is="passwordHidden ? Eye : EyeOff" class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
          </div>
        </div>

        <TheButton
          @click="sendForm"
          :button-text="sended ? $t('common.sending') : $t('common.send')"
          :sended="sended"
        />
      </form>

      <p class="text-center text-sm">
        <router-link to="/signin" class="text-text-link hover:underline">
          {{ $t('common.back') }}
        </router-link>
      </p>
    </div>
  </div>
</template>