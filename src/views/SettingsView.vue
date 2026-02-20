<script setup lang="ts">
import { settingsService } from '@/api/settings/settingsService'
import TheInput from '@/components/TheInput.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SuccessMessage from '@/components/SuccessMessage.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import { Lock, Shield, Key, Loader2 } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'

const { t } = useI18n()

const isLoading = ref<boolean>(false)
const isSendedChangePassword = ref<boolean>(false)

// состояния смены пароля
const changingPasswordCurrentPassword = ref('')
const changingPasswordNewPassword = ref('')
const passwordIsChanged = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

async function changePassword() {
  // Сбрасываем состояния
  errorMessage.value = null
  passwordIsChanged.value = false
  isLoading.value = true

  // Валидация полей
  if (!changingPasswordCurrentPassword.value || !changingPasswordNewPassword.value) {
    errorMessage.value = t('errors.FILL_REQUIRED_FIELDS')
    isLoading.value = false
    return
  }

  try {
    isSendedChangePassword.value = true
    const response = await settingsService.changePassword(
      changingPasswordCurrentPassword.value, 
      changingPasswordNewPassword.value
    )
    
    if (response.success) {
      // Успех
      passwordIsChanged.value = true
      changingPasswordCurrentPassword.value = ''
      changingPasswordNewPassword.value = ''
    } else {
      if (response.error) {
        errorMessage.value = getErrorMessage(response.error, t)
      } else {
        errorMessage.value = t('errors.SERVER_ERROR')
      }
    }
  } catch (e: any) {
    console.error('Unexpected error:', e)
    errorMessage.value = t('errors.SERVER_ERROR')
  } finally {
    isLoading.value = false
    isSendedChangePassword.value = false
  }
}
</script>

<template>
  <div class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.settingsPage.title') }}
        </h1>
      </div>
      <p class="mt-2 text-sm text-gray-400">
        {{ $t('pages.settingsPage.subtitle') }}
      </p>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
      <!-- Left column - Navigation -->
      <div class="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-0 lg:min-h-[calc(100dvh-3.5rem)] lg:border-r border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pr-6">
        <div class="pt-6 lg:pt-0">
          <div class="space-y-6">
            <!-- Desktop header -->
            <div class="hidden lg:block">
              <div class="flex gap-2">
                <BackButton />
                <h1 class="text-2xl font-bold text-white">
                  {{ $t('pages.settingsPage.title') }}
                </h1>
              </div>
              <p class="mt-2 text-sm text-gray-400">
                {{ $t('pages.settingsPage.subtitle') }}
              </p>
            </div>

            <!-- Settings menu -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-4 space-y-4">
              <div class="flex items-center gap-3 p-3 rounded-lg bg-blue-600/20 border border-blue-500/30">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Shield class="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('pages.settingsPage.security') }}</h3>
                  <p class="text-xs text-gray-300">{{ $t('pages.settingsPage.securityHint') }}</p>
                </div>
              </div>

              <!-- Other menu items (можно добавить позже) -->
              <div class="space-y-2">
                <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700/50 transition-colors cursor-not-allowed opacity-50">
                  <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span class="text-sm text-gray-400">{{ $t('pages.settingsPage.accountSettings') }}</span>
                </div>

                <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700/50 transition-colors cursor-not-allowed opacity-50">
                  <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span class="text-sm text-gray-400">{{ $t('pages.settingsPage.notifications') }}</span>
                </div>
              </div>
            </div>

            <!-- Security tips -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-4 space-y-3">
              <h4 class="text-sm font-semibold text-gray-300">{{ $t('pages.settingsPage.securityTips') }}</h4>
              <ul class="space-y-2 text-xs text-gray-400">
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                  <span>{{ $t('pages.settingsPage.tip1') }}</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                  <span>{{ $t('pages.settingsPage.tip2') }}</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                  <span>{{ $t('pages.settingsPage.tip3') }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column - Change password form -->
      <div class="lg:flex-1 overflow-y-auto  mt-6 lg:mt-0 lg:pt-6 lg:pl-6">
        <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
          <!-- Security section -->
          <div class="space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Key class="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">{{ $t('pages.settingsPage.changePassword') }}</h2>
                <p class="text-sm text-gray-400">{{ $t('pages.settingsPage.changePasswordHint') }}</p>
              </div>
            </div>

            <!-- Password change form -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-6">
              <!-- Current password -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-300">
                  {{ $t('pages.settingsPage.currentPassword') }}
                  <span class="text-red-400 ml-1">*</span>
                </label>
                <div class="flex items-center gap-3">
                  <Lock class="w-5 h-5 text-gray-400" />
                  <TheInput
                    v-model="changingPasswordCurrentPassword" 
                    :placeholder="$t('pages.settingsPage.enterCurrentPassword')" 
                    type="password"
                    class="w-full"
                  />
                </div>
              </div>

              <!-- New password -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-300">
                  {{ $t('pages.settingsPage.newPassword') }}
                  <span class="text-red-400 ml-1">*</span>
                </label>
                <div class="flex items-center gap-3">
                  <Key class="w-5 h-5 text-gray-400" />
                  <TheInput
                    v-model="changingPasswordNewPassword" 
                    :placeholder="$t('pages.settingsPage.enterNewPassword')" 
                    type="password"
                    class="w-full"
                  />
                </div>
                <p class="text-xs text-gray-400 mt-2">
                  {{ $t('pages.settingsPage.passwordRequirements') }}
                </p>
              </div>

              <!-- Success/Error messages -->
              <div class="space-y-3">
                <SuccessMessage 
                  v-if="passwordIsChanged" 
                  :success-message="$t('pages.settingsPage.passwordChanged')" 
                />
                <ErrorMessage 
                  v-if="errorMessage" 
                  :error-message="errorMessage" 
                />
              </div>

              <!-- Submit button -->
              <button
                @click="changePassword"
                :disabled="isLoading || !changingPasswordCurrentPassword || !changingPasswordNewPassword"
                class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
                <span>{{ isLoading ? t('common.loading') : t('pages.settingsPage.changePassword') }}</span>
              </button>
            </div>

            <!-- Password strength tips -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-4">
              <h3 class="text-lg font-semibold text-white">{{ $t('pages.settingsPage.passwordStrength') }}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-sm text-gray-300">{{ $t('pages.settingsPage.strengthTip1') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-sm text-gray-300">{{ $t('pages.settingsPage.strengthTip2') }}</span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-sm text-gray-300">{{ $t('pages.settingsPage.strengthTip3') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-sm text-gray-300">{{ $t('pages.settingsPage.strengthTip4') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Remove number input arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

/* Custom scrollbar for left column on desktop */
@media (min-width: 1024px) {
  .lg\:overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: var(--overlay-white-20) transparent;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
    margin: 10px 0;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: var(--overlay-white-20);
    border-radius: 3px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: var(--overlay-white-30);
  }
}

/* Ensure proper scrolling on mobile */
@media (max-width: 1023px) {
  .lg\:sticky {
    position: static;
  }
}
</style>
