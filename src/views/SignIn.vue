<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import router from '@/router'
import { getErrorMessage } from '@/utils/errorsMap'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TheButton from './forms/TheButton.vue'
import { useUserStore } from '@/stores/user'
import SuccessMessage from '@/components/SuccessMessage.vue'
import Captcha from '@/components/Captcha.vue'

const sended = ref(false)
const email = ref('')
const password = ref('')
const captchaToken = ref('')

const errorMessage = ref('')
const successMessage = ref('')

const { t } = useI18n()

async function signIn() {
  if (sended.value) return

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signIn.completeCaptcha')
    return
  }

  sended.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!email.value.trim() || !password.value.trim()) {
      errorMessage.value = t('errors.FILL_ALL_INPUTS')
      return
    }

    const success = await authService.signIn(email.value, password.value, captchaToken.value)

    if (!success) {
      errorMessage.value = t('errors.INCORRECT_EMAIL_OR_PASSWORD')
      return
    }

    successMessage.value = t('pages.auth.signIn.success')

    const user = await useUserStore().getUser()

    setTimeout(() => {
      if (user?.role === 'admin') router.push('/admin')
      else router.push('/')
    }, 800)
  }
  catch (e: any) {
    if (e?.response?.data?.detail?.error_code) {
      errorMessage.value = getErrorMessage(e.response.data.detail, t)
    } else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
  }
  finally {
    sended.value = false
  }
}
</script>

<template>
  <div class="no-scrollbar h-full w-full flex flex-col items-center overflow-scroll pb-36">
    <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6 my-auto">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.auth.signIn.title') }}
      </h1>

      <form class="space-y-4" @submit.prevent>
        <div>
          <label for="email" class="mb-1 block text-sm text-gray-300">
            {{ $t('common.email') }}
          </label>
          <TheInput
            id="email"
            v-model="email"
            type="email"
            :placeholder="$t('common.email')"
            required
          />
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm text-gray-300">
            {{ $t('common.password') }}
          </label>
          <TheInput
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            :minlength="8"
          />
        </div>

        <div>
          <Captcha @verified="(token: string) => captchaToken = token" />
        </div>

        <TheButton
          @click="signIn"
          :button-text="!sended ? $t('pages.auth.signIn.login') : $t('common.sending')"
          :sended="sended"
        />

        <SuccessMessage v-if="successMessage" :success-message="successMessage"/>
        <ErrorBanner :message="errorMessage" />
      </form>

      <p class="text-center text-sm text-text-secondaryDark">
        {{ $t('pages.auth.signIn.noAccount') }}
        <router-link to="/signup" class="text-text-link hover:underline">
          {{ $t('pages.auth.signIn.register') }}
        </router-link>
      </p>

      <p class="text-center text-sm text-text-secondaryDark">
        <router-link to="/password-reset-email" class="text-text-link hover:underline">
          {{ $t('pages.auth.signIn.forgotPassword') }}
        </router-link>
      </p>
    </div>
  </div>
</template>
