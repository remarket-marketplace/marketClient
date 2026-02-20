<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import { authService } from '@/api/auth/AuthService'
import ErrorBanner from '@/components/ErrorBanner.vue'
import TheInput from '@/components/TheInput.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import TheButton from './forms/TheButton.vue'
import { useUserStore } from '@/stores/user'
import Captcha from '@/components/Captcha.vue'
import Title from '@/components/Title.vue'
import AuthWelcomeTyping from '@/components/AuthWelcomeTyping.vue'

const sended = ref(false)
const email = ref('')
const password = ref('')
const captchaToken = ref('')
const passwordHidden = ref(true)
const showWelcomeScreen = ref(false)
const welcomeUsername = ref('')
const isWelcomeRedirecting = ref(false)
const errorMessage = ref('')

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const welcomeText = computed(() => {
  const safeUsername = welcomeUsername.value.trim() || t('common.user')
  return t('pages.auth.signIn.welcomeTitle', { username: safeUsername })
})

function resolveWelcomeUsername() {
  const usernameFromStore = userStore.user?.username?.trim()
  if (usernameFromStore) {
    return usernameFromStore
  }

  const usernameFromEmail = email.value.trim().split('@')[0]?.trim()
  if (usernameFromEmail) {
    return usernameFromEmail
  }

  return t('common.user')
}

function handleWelcomeFinished() {
  if (isWelcomeRedirecting.value) {
    return
  }

  isWelcomeRedirecting.value = true
  router.push('/')
}

async function signIn() {
  if (sended.value) return

  if (!captchaToken.value) {
    errorMessage.value = t('pages.auth.signIn.completeCaptcha')
    return
  }

  sended.value = true
  errorMessage.value = ''

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

    welcomeUsername.value = resolveWelcomeUsername()
    isWelcomeRedirecting.value = false
    showWelcomeScreen.value = true
  } catch (e: any) {
    const detail = e?.response?.data?.detail
    const errorCode = detail?.error_code

    if (errorCode === 'USER_IS_BANNED' || errorCode === 'USER IS BANNED') {
      const reasonCode = typeof detail?.ban_reason_code === 'string' ? detail.ban_reason_code : undefined
      const reasonText = typeof detail?.ban_reason_text === 'string' ? detail.ban_reason_text : undefined
      router.push({
        name: 'banned',
        query: {
          reasonCode,
          reasonText,
        },
      })
      return
    }

    if (errorCode) {
      errorMessage.value = getErrorMessage(detail, t)
    } else {
      errorMessage.value = t('errors.SERVER_ERROR')
    }
  } finally {
    sended.value = false
  }
}

function switchPasswordVisibility() {
  passwordHidden.value = !passwordHidden.value
}
</script>

<template>
  <div class="h-full w-full flex flex-col items-center overflow-scroll pb-36 pt-10">
    <transition name="signin-stage" mode="out-in">
      <div v-if="showWelcomeScreen" key="welcome" class="my-auto w-full px-4">
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
        <Title :text="t('pages.auth.signIn.title')" class="text-center text-4xl" />

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
              :type="passwordHidden ? 'password' : 'text'"
              placeholder="••••••••"
              required
              :minlength="8"
            >
              <template #append>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-300 transition-colors focus:outline-none p-1"
                  @click="switchPasswordVisibility"
                >
                  <EyeOff v-if="passwordHidden" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </template>
            </TheInput>
          </div>

          <div>
            <Captcha @verified="(token: string) => captchaToken = token" />
          </div>

          <TheButton
            @click="signIn"
            :button-text="!sended ? $t('pages.auth.signIn.login') : $t('common.sending')"
            :sended="sended"
          />

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
