<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import TheButton from '../forms/TheButton.vue'
import TheInput from '@/components/TheInput.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Loader from '@/components/Loader.vue'
import { buildAuthModalLocation } from '@/utils/authRedirect'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const resetPasswordToken = route.query.reset_token

const errorMessage = ref('')
const successMessage = ref('')

const newPassword = ref('')

const tokenIsNotExpired = ref<boolean | null>(null)

const sended = ref(false)

async function resetPassword() {
  try {
    if (resetPasswordToken != null) {
      await authService.resetPassword(resetPasswordToken.toString(), newPassword.value)
      successMessage.value = t('pages.resetPassword.passwordHasReset')
      sended.value = false
      setTimeout(() => {
        router.push('/signIn')
      }, 1000)
    }
  } catch (error: any) {
    const detail = error?.response?.data?.detail
    errorMessage.value = getErrorMessage(detail, t)
  }
}

onMounted(async () => {
  if (resetPasswordToken) {
    try {
      const response = await authService.checkResetTokenNotExpired(resetPasswordToken.toString())
      tokenIsNotExpired.value = response.data
    } catch (error: any) {
      tokenIsNotExpired.value = false
    }
  }
})
</script>

<template>
  <div class="w-full min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center bg-background px-4">
    <Loader v-if="tokenIsNotExpired === null" />

    <div v-if="tokenIsNotExpired === true"
      class="max-w-sm w-full border border-[rgb(var(--palette-dark-700))] rounded-2xl bg-background p-8 backdrop-blur-md space-y-6">
      <h1 class="text-center text-3xl text-mainText font-bold">
        {{ $t('pages.resetPassword.enterNewPassword') }}
      </h1>

      <div class="space-y-4">
        <SuccessMessage v-if="successMessage" :successMessage="successMessage" />
        <ErrorBanner v-if="errorMessage" :message="errorMessage" />

        <div class="space-y-4">

          <TheInput id="confirm-password" v-model="newPassword" type="text" :placeholder="$t('common.password')"
            required :minlength="8" autocomplete="new-password" :error="newPassword.length > 0" />

          <TheButton @click="resetPassword" :button-text="sended ? $t('common.sending') :
            $t('pages.passwordRecovery.changePassword')
            " :sended="sended" class="w-full" />
        </div>

      </div>

      <p class="text-center text-sm text-text-secondaryDark">
        <router-link :to="buildAuthModalLocation(route)" class="text-text-link hover:underline">
          {{ $t('common.backToSignIn') }}
        </router-link>
      </p>
    </div>

    <div v-if="tokenIsNotExpired === false">
      <p>{{ $t('pages.resetPassword.resetPasswordTokenIsExpired') }}</p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
