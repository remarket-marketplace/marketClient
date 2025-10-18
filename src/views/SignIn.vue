<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import router from '@/router'
import { getErrorMessage } from '@/utils/errorsMap'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const sended = ref(false)
const email = ref('')
const password = ref('')
const errorMessage = ref('')

const { t } = useI18n()


async function signIn() {
  sended.value = true
  errorMessage.value = ''
  try {
    const success = await authService.signIn(email.value, password.value)
    if (success) {
      router.push('/')
    }
    else {
      // Если signIn возвращает false, пробуем получить ошибку из httpClient
      errorMessage.value = t('errors.INCORRECT_EMAIL_OR_PASSWORD')
    }
  }
  catch (e: any) {
    // Если signIn пробрасывает ошибку, парсим её
    if (e?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(e.response.data.detail, t)
    }
    else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
  }
  sended.value = false
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-dark-900 px-4">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-dark-800/90 p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-white font-bold">
        {{ $t('signIn.title') }}
      </h1>

      <form class="space-y-4" @submit.prevent>
        <ErrorBanner :message="errorMessage" />
        <div>
          <label for="email" class="mb-1 block text-sm text-gray-300">Email</label>
          <input
            id="email" v-model="email" type="email" required placeholder="Email"
            class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          >
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm text-gray-300">{{ $t('signIn.password') }}</label>
          <input
            id="password" v-model="password" type="password" required placeholder="••••••••"
            class="w-full rounded-lg bg-dark-500 border border-dark-200 px-4 py-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          >
        </div>

        <button
          type="submit"
          :disabled="sended"
          class="w-full rounded-lg bg-blue-600 py-2 text-white font-semibold transition-colors duration-200 hover:bg-blue-700"
          @click="signIn"
        >
          {{ $t('signIn.login') }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500">
        {{ $t('signIn.noAccount') }}
        <a href="/signup" class="text-blue-400 hover:underline">{{ $t('signIn.register') }}</a>
      </p>
    </div>
  </div>
</template>
