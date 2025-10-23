<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import router from '@/router'
import { getErrorMessage } from '@/utils/errorsMap'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TheButton from './forms/TheButton.vue'

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
  <div class="h-full w-full flex items-center justify-center bg-background px-4">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.auth.signIn.title') }}
      </h1>

      <form class="space-y-4" @submit.prevent>
        <ErrorBanner :message="errorMessage" />
        <div>
          <label for="email" class="mb-1 block text-sm text-gray-300">{{ $t('common.email') }}</label>
          <TheInput
            id="email"
            v-model="email"
            type="email"
            :placeholder="$t('common.email')"
            required
          />
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm text-gray-300">{{ $t('common.password') }}</label>
          <TheInput
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            :minlength="8"
          />
        </div>

        <TheButton
          @click="signIn"
          :button-text="$t('pages.auth.signIn.login')"
          :sended="sended"
        >
        </TheButton>
      </form>

      <p class="text-center text-sm text-text-secondaryDark">
        {{ $t('pages.auth.signIn.noAccount') }}
        <router-link to="/signup" class="text-blue-400 hover:underline">
          {{ $t('pages.auth.signIn.register') }}
        </router-link>
      </p>
    </div>
  </div>
</template>