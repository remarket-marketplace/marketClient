<script setup lang="ts">
import { settingsService } from '@/api/settings/settingsService'
import TheInput from '@/components/TheInput.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TheButton from './forms/TheButton.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { getErrorMessage } from '@/utils/errorsMap'

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
  <div class="h-full w-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto no-scrollbar">
      <div>
        <p class="text-2xl font-bold">{{ $t('pages.settingsPage.title') }}</p>
      </div>
      <div class="my-8 flex flex-col gap-10 rounded-xl border-1 border-dark-600 p-4 md:max-w-1/3">
        <!-- блок смены пароля -->
        <div class="flex flex-col gap-4">
          <p class="text-gray-300 text-lg">{{ $t('pages.settingsPage.password') }}</p>
          <div class="gap-3 flex flex-col">
            <TheInput
              v-model="changingPasswordCurrentPassword" 
              :placeholder="$t('pages.settingsPage.enterCurrentPassword')" 
              type="password"
            />
            <TheInput 
              v-model="changingPasswordNewPassword" 
              :placeholder="$t('pages.settingsPage.enterNewPassword')" 
              type="password"
            />
            <TheButton 
              @click="changePassword" 
              :loading="isLoading"
              :sended="isSendedChangePassword" 
              :button-text="$t('pages.settingsPage.changePassword')" 
            />
          </div>

          <SuccessMessage 
            v-if="passwordIsChanged" 
            :success-message="$t('pages.settingsPage.passwordChanged')" 
          />
          <ErrorMessage 
            v-if="errorMessage" 
            :error-message="errorMessage" 
          />
        </div>
      </div>
    </div>
  </div>
</template>