<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import TheButton from '../forms/TheButton.vue'
import TheInput from '@/components/TheInput.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Captcha from '@/components/Captcha.vue'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const email = ref('')

const errorMessage = ref('')
const successMessage = ref('')

const sended = ref(false)
const captchaToken = ref('')

const emailValid = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.value)
})

async function sendLetter() {
    try {
        sended.value = true
        await authService.sendPasswordResetLetter(email.value, captchaToken.value)
        successMessage.value = t('pages.resetPassword.ResetLetterSuccessSended')
    } catch (error: any) {
        sended.value = false
        const detail = error?.response?.data?.detail
        errorMessage.value = getErrorMessage(detail, t)
    }
}
</script>

<template>
    <div class="h-full w-full flex items-center justify-center bg-background px-4">
        <div class="max-w-sm w-full border border-dark-700 rounded-2xl bg-background p-8 backdrop-blur-md space-y-6">
            <h1 class="text-center text-3xl text-mainText font-bold">
                {{ $t('pages.resetPassword.title') }}
            </h1>

            <div class="space-y-4">

                <!-- Success banner -->
                <SuccessMessage v-if="successMessage" :successMessage="successMessage" />
                <ErrorBanner v-if="errorMessage" :message="errorMessage" />

                <div class="space-y-4">
                    <TheInput id="email" v-model="email" type="email" :placeholder="$t('common.emailPlaceholder')"
                        required autocomplete="email" :error="email.length > 0 && !emailValid" />
                    <p v-if="email.length > 0 && !emailValid" class="mt-1 text-xs text-red-400">
                        {{ $t('validation.invalidEmail') }}
                    </p>

                    <div>
                        <Captcha @verified="(token: string) => captchaToken = token" />
                    </div>

                    <TheButton @click="sendLetter" :button-text="sended ? $t('common.sending') :
                            $t('pages.passwordRecovery.changePassword')
                        " :sended="sended" :disabled="!emailValid || sended" class="w-full" />
                </div>


            <p class="text-center text-sm text-text-secondaryDark">
                <router-link to="/signin" class="text-text-link hover:underline">
                    {{ $t('common.backToSignIn') }}
                </router-link>
            </p>
            </div>
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