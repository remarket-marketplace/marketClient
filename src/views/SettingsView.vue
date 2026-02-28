<script setup lang="ts">
import { settingsService } from '@/api/settings/settingsService'
import TheInput from '@/components/TheInput.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SuccessMessage from '@/components/SuccessMessage.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import { AtSign, Key, Loader2, Lock, Palette, Shield } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { formatCurrencyAmount } from '@/utils/currency'
import { useRoute, useRouter } from 'vue-router'
import {
  resolveNicknameStyleId,
  type NicknameStyleId,
} from '@/utils/nicknameStyles'
import type {
  NicknameStyleCatalogItem,
  NicknameStyleCatalogResponse,
} from '@/validation/user/nicknameStyle'

type SettingsSection = 'security' | 'nickname' | 'nickname-styles'

const NICKNAME_MIN_LENGTH = 4
const NICKNAME_MAX_LENGTH = 32
const NICKNAME_CHANGE_PRICE_RUB = 100
const NICKNAME_REGEX = /^[A-Za-z0-9_]+$/

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const isLoading = ref(false)
const isSendedChangePassword = ref(false)

const changingPasswordCurrentPassword = ref('')
const changingPasswordNewPassword = ref('')
const passwordIsChanged = ref(false)
const passwordErrorMessage = ref<string | null>(null)

const changingUsername = ref('')
const isChangingUsername = ref(false)
const usernameErrorMessage = ref<string | null>(null)
const usernameSuccessMessage = ref<string | null>(null)

const isStylesLoading = ref(false)
const stylesErrorMessage = ref<string | null>(null)
const stylesSuccessMessage = ref<string | null>(null)
const stylesCatalog = ref<NicknameStyleCatalogResponse | null>(null)
const previewStyleId = ref<NicknameStyleId>('default')
const styleActionType = ref<'buy' | 'apply' | null>(null)
const styleActionLoadingId = ref<string | null>(null)

const currentUsername = computed(() => user.value?.username ?? 'username')
const currentStyleId = computed(
  () => stylesCatalog.value?.active_style_id ?? user.value?.nickname_style_id ?? 'default',
)
const resolvedPreviewStyleId = computed<NicknameStyleId>(() =>
  resolveNicknameStyleId(previewStyleId.value || currentStyleId.value),
)
const nicknameChangePriceLabel = computed(() =>
  formatCurrencyAmount(NICKNAME_CHANGE_PRICE_RUB, {
    fromCurrency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
)
const activeSection = computed<SettingsSection>(() => normalizeSettingsSection(route.query.section))
const canChangeUsername = computed(() => {
  const normalized = changingUsername.value.trim()
  return (
    !isChangingUsername.value &&
    normalized.length >= NICKNAME_MIN_LENGTH &&
    normalized.length <= NICKNAME_MAX_LENGTH &&
    NICKNAME_REGEX.test(normalized) &&
    normalized !== currentUsername.value
  )
})

function normalizeSettingsSection(value: unknown): SettingsSection {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'security' || raw === 'nickname' || raw === 'nickname-styles') {
    return raw
  }
  return 'security'
}

function switchSection(section: SettingsSection) {
  if (section === activeSection.value) return

  const nextQuery = { ...route.query }
  if (section === 'security') {
    delete nextQuery.section
  } else {
    nextQuery.section = section
  }

  void router.replace({ query: nextQuery })
}

function isSectionActive(section: SettingsSection) {
  return activeSection.value === section
}

function setStylesSuccessMessage(value: string) {
  stylesSuccessMessage.value = value
  window.setTimeout(() => {
    if (stylesSuccessMessage.value === value) {
      stylesSuccessMessage.value = null
    }
  }, 2600)
}

function setUsernameSuccessMessage(value: string) {
  usernameSuccessMessage.value = value
  window.setTimeout(() => {
    if (usernameSuccessMessage.value === value) {
      usernameSuccessMessage.value = null
    }
  }, 2600)
}

function applyStylesCatalog(data: NicknameStyleCatalogResponse) {
  stylesCatalog.value = data
  previewStyleId.value = resolveNicknameStyleId(data.active_style_id)
  userStore.updateUserProfile({
    balance: data.balance,
    nickname_style_id: data.active_style_id,
  })
}

function getStyleDescription(styleId: string) {
  const key = `pages.settingsPage.nicknameStyleCatalog.${styleId}.description`
  const value = t(key)
  return value === key ? '' : value
}

function getStylePriceLabel(style: NicknameStyleCatalogItem) {
  if (style.price_rub <= 0) return t('pages.settingsPage.free')
  return formatCurrencyAmount(style.price_rub, {
    fromCurrency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function getStyleActionLabel(style: NicknameStyleCatalogItem) {
  const isLoadingAction = styleActionLoadingId.value === style.style_id

  if (style.is_active) return t('pages.settingsPage.active')
  if (style.is_owned) {
    return isLoadingAction && styleActionType.value === 'apply'
      ? t('pages.settingsPage.applying')
      : t('pages.settingsPage.select')
  }

  return isLoadingAction && styleActionType.value === 'buy'
    ? t('pages.settingsPage.buying')
    : t('pages.settingsPage.buyFor', { price: getStylePriceLabel(style) })
}

function selectPreviewStyle(styleId: string) {
  previewStyleId.value = resolveNicknameStyleId(styleId)
}

function isPreviewStyleSelected(styleId: string) {
  return resolvedPreviewStyleId.value === resolveNicknameStyleId(styleId)
}

function validateUsernameForChange(username: string): string | null {
  if (username.length < NICKNAME_MIN_LENGTH || username.length > NICKNAME_MAX_LENGTH) {
    return t('pages.auth.signUp.usernameLengthError')
  }
  if (!NICKNAME_REGEX.test(username)) {
    return t('pages.auth.signUp.usernameCharsError')
  }
  if (username === currentUsername.value) {
    return t('pages.settingsPage.nicknameMustBeDifferent')
  }
  return null
}

async function loadNicknameStyles() {
  isStylesLoading.value = true
  stylesErrorMessage.value = null

  const result = await settingsService.getNicknameStyles()
  if (!result.success || !result.data) {
    stylesErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isStylesLoading.value = false
    return
  }

  applyStylesCatalog(result.data)
  isStylesLoading.value = false
}

async function handleStyleAction(style: NicknameStyleCatalogItem) {
  if (style.is_active || styleActionLoadingId.value) return

  stylesErrorMessage.value = null
  styleActionLoadingId.value = style.style_id
  styleActionType.value = style.is_owned ? 'apply' : 'buy'

  const result = style.is_owned
    ? await settingsService.activateNicknameStyle(style.style_id)
    : await settingsService.purchaseNicknameStyle(style.style_id)

  if (!result.success || !result.data) {
    stylesErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    styleActionLoadingId.value = null
    styleActionType.value = null
    return
  }

  applyStylesCatalog(result.data)
  setStylesSuccessMessage(
    style.is_owned
      ? t('pages.settingsPage.nicknameStylesUpdated')
      : t('pages.settingsPage.nicknameStylesPurchased'),
  )
  styleActionLoadingId.value = null
  styleActionType.value = null
}

async function changeUsername() {
  usernameErrorMessage.value = null
  usernameSuccessMessage.value = null

  const normalizedUsername = changingUsername.value.trim()
  const validationError = validateUsernameForChange(normalizedUsername)
  if (validationError) {
    usernameErrorMessage.value = validationError
    return
  }

  isChangingUsername.value = true
  const result = await settingsService.changeUsername(normalizedUsername)
  if (!result.success || !result.data) {
    usernameErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isChangingUsername.value = false
    return
  }

  userStore.updateUserProfile({
    username: result.data.username,
    balance: result.data.balance,
  })
  changingUsername.value = ''
  setUsernameSuccessMessage(t('pages.settingsPage.nicknameChanged'))
  isChangingUsername.value = false
}

async function changePassword() {
  passwordErrorMessage.value = null
  passwordIsChanged.value = false
  isLoading.value = true

  if (!changingPasswordCurrentPassword.value || !changingPasswordNewPassword.value) {
    passwordErrorMessage.value = t('errors.FILL_REQUIRED_FIELDS')
    isLoading.value = false
    return
  }

  try {
    isSendedChangePassword.value = true
    const response = await settingsService.changePassword(
      changingPasswordCurrentPassword.value,
      changingPasswordNewPassword.value,
    )

    if (response.success) {
      passwordIsChanged.value = true
      changingPasswordCurrentPassword.value = ''
      changingPasswordNewPassword.value = ''
    } else if (response.error) {
      passwordErrorMessage.value = getErrorMessage(response.error, t)
    } else {
      passwordErrorMessage.value = t('errors.SERVER_ERROR')
    }
  } catch (e: any) {
    console.error('Unexpected error:', e)
    passwordErrorMessage.value = t('errors.SERVER_ERROR')
  } finally {
    isLoading.value = false
    isSendedChangePassword.value = false
  }
}

watch(
  activeSection,
  (section) => {
    if (section === 'nickname-styles' && !stylesCatalog.value && !isStylesLoading.value) {
      void loadNicknameStyles()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
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

    <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
      <div
        class="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-0 lg:min-h-[calc(100dvh-3.5rem)] lg:border-r border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pr-6"
      >
        <div class="pt-6 lg:pt-0">
          <div class="space-y-6">
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

            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-4 space-y-4">
              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-lg text-left transition"
                :class="isSectionActive('security')
                  ? 'bg-blue-600/20 border border-blue-500/30'
                  : 'border border-transparent hover:bg-dark-700/60'"
                @click="switchSection('security')"
              >
                <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <Shield class="w-4 h-4" :class="isSectionActive('security') ? 'text-blue-300' : 'text-gray-400'" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('pages.settingsPage.security') }}</h3>
                  <p class="text-xs text-gray-300">{{ $t('pages.settingsPage.securityHint') }}</p>
                </div>
              </button>

              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-lg text-left transition"
                :class="isSectionActive('nickname')
                  ? 'bg-emerald-600/20 border border-emerald-500/30'
                  : 'border border-transparent hover:bg-dark-700/60'"
                @click="switchSection('nickname')"
              >
                <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <AtSign class="w-4 h-4" :class="isSectionActive('nickname') ? 'text-emerald-300' : 'text-gray-400'" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('pages.settingsPage.nicknameMenu') }}</h3>
                  <p class="text-xs text-gray-300">{{ $t('pages.settingsPage.nicknameHint') }}</p>
                </div>
              </button>

              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-lg text-left transition"
                :class="isSectionActive('nickname-styles')
                  ? 'bg-violet-600/20 border border-violet-500/30'
                  : 'border border-transparent hover:bg-dark-700/60'"
                @click="switchSection('nickname-styles')"
              >
                <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <Palette class="w-4 h-4" :class="isSectionActive('nickname-styles') ? 'text-violet-300' : 'text-gray-400'" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('pages.settingsPage.nicknameStylesMenu') }}</h3>
                  <p class="text-xs text-gray-300">{{ $t('pages.settingsPage.nicknameStylesHint') }}</p>
                </div>
              </button>

              <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700/50 transition-colors cursor-not-allowed opacity-50">
                <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span class="text-sm text-gray-400">{{ $t('pages.settingsPage.notifications') }}</span>
              </div>
            </div>

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

      <div class="lg:flex-1 overflow-y-auto mt-6 lg:mt-0 lg:pt-6 lg:pl-6">
        <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
          <div v-if="activeSection === 'security'" class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white">{{ $t('pages.settingsPage.changePassword') }}</h2>
              <p class="text-sm text-gray-400">{{ $t('pages.settingsPage.changePasswordHint') }}</p>
            </div>

            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-6">
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

              <div class="space-y-3">
                <SuccessMessage
                  v-if="passwordIsChanged"
                  :success-message="$t('pages.settingsPage.passwordChanged')"
                />
                <ErrorMessage
                  v-if="passwordErrorMessage"
                  :error-message="passwordErrorMessage"
                />
              </div>

              <button
                :disabled="isLoading || !changingPasswordCurrentPassword || !changingPasswordNewPassword"
                class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                @click="changePassword"
              >
                <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
                <span>{{ isLoading ? t('common.loading') : t('pages.settingsPage.changePassword') }}</span>
              </button>
            </div>

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

          <div v-else-if="activeSection === 'nickname'" class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white">{{ $t('pages.settingsPage.nicknameSectionTitle') }}</h2>
              <p class="text-sm text-gray-400">{{ $t('pages.settingsPage.nicknameSectionHint') }}</p>
            </div>

            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-6">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-3">
                  <label class="block text-sm font-medium text-gray-300">
                    {{ $t('pages.settingsPage.currentNickname') }}
                  </label>
                  <div class="rounded-xl border border-dark-700 bg-dark-700/40 px-4 py-3">
                    <StyledUsername
                      :username="currentUsername"
                      :style-id="user?.nickname_style_id ?? 'default'"
                      class="text-base font-semibold"
                    />
                  </div>
                </div>

                <div class="space-y-3">
                  <label class="block text-sm font-medium text-gray-300">
                    {{ $t('pages.settingsPage.newNickname') }}
                    <span class="text-red-400 ml-1">*</span>
                  </label>
                  <TheInput
                    v-model="changingUsername"
                    :placeholder="$t('pages.settingsPage.enterNewNickname')"
                    type="text"
                    class="w-full"
                  />
                  <p class="text-xs text-gray-400">
                    {{ $t('pages.settingsPage.nicknameRequirements') }}
                  </p>
                </div>
              </div>

              <div class="rounded-lg border border-amber-500/35 bg-amber-600/15 px-4 py-3 text-sm text-amber-100">
                {{ $t('pages.settingsPage.nicknameChangeFee', { price: nicknameChangePriceLabel }) }}
              </div>

              <SuccessMessage
                v-if="usernameSuccessMessage"
                :success-message="usernameSuccessMessage"
              />
              <ErrorMessage
                v-if="usernameErrorMessage"
                :error-message="usernameErrorMessage"
              />

              <button
                type="button"
                class="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3.5 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                :disabled="!canChangeUsername"
                @click="changeUsername"
              >
                <Loader2 v-if="isChangingUsername" class="w-4 h-4 animate-spin" />
                <span>{{ isChangingUsername ? t('pages.settingsPage.savingNickname') : t('pages.settingsPage.saveNickname') }}</span>
              </button>
            </div>
          </div>

          <div v-else class="space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-bold text-white">{{ $t('pages.settingsPage.nicknameStylesSectionTitle') }}</h2>
                <p class="text-sm text-gray-400">{{ $t('pages.settingsPage.nicknameStylesSectionHint') }}</p>
              </div>
              <div
                v-if="stylesCatalog"
                class="rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-sm text-blue-200"
              >
                {{ $t('common.balance') }}:
                <span class="font-semibold text-white">
                  {{ formatCurrencyAmount(stylesCatalog.balance, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
            </div>

            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-4">
              <div v-if="isStylesLoading" class="flex items-center justify-center py-8 text-sm text-gray-400">
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {{ $t('common.loading') }}
              </div>

              <ErrorMessage
                v-if="stylesErrorMessage"
                :error-message="stylesErrorMessage"
              />
              <SuccessMessage
                v-if="stylesSuccessMessage"
                :success-message="stylesSuccessMessage"
              />

              <template v-if="stylesCatalog && stylesCatalog.styles.length">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div class="rounded-xl border border-dark-600 bg-dark-700/60 p-4">
                    <div class="text-xs uppercase tracking-wide text-gray-400">{{ $t('pages.settingsPage.previewPlain') }}</div>
                    <div class="mt-3">
                      <StyledUsername
                        :username="currentUsername"
                        :style-id="resolvedPreviewStyleId"
                        class="text-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div
                    class="rounded-xl border border-dark-600 bg-dark-700/60 p-4"
                  >
                    <div class="text-xs uppercase tracking-wide text-gray-200/80">{{ $t('pages.settingsPage.previewInCard') }}</div>
                    <p class="mt-2 text-xs text-gray-300">{{ $t('pages.settingsPage.productCardSample') }}</p>
                    <div class="mt-3 flex items-center gap-2">
                      <StyledUsername
                        :username="currentUsername"
                        :style-id="resolvedPreviewStyleId"
                        class="text-sm font-semibold"
                      />
                      <span class="h-2 w-2 rounded-full bg-green-500"></span>
                      <span class="text-xs text-gray-200">★ 4.9</span>
                    </div>
                    <div class="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-semibold text-white">
                      {{ formatCurrencyAmount(1290, { fromCurrency: 'RUB' }) }}
                    </div>
                  </div>

                  <div
                    class="rounded-xl border border-dark-600 bg-dark-700/60 p-4"
                  >
                    <div class="text-xs uppercase tracking-wide text-gray-200/80">{{ $t('pages.settingsPage.previewInProfile') }}</div>
                    <p class="mt-2 text-xs text-gray-300">{{ $t('pages.settingsPage.profileSample') }}</p>
                    <div class="mt-3 flex items-center gap-3 rounded-lg border border-dark-600 bg-dark-900/40 px-3 py-2">
                      <div class="h-8 w-8 rounded-full bg-dark-600"></div>
                      <StyledUsername
                        :username="currentUsername"
                        :style-id="resolvedPreviewStyleId"
                        class="text-base font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div
                    v-for="style in stylesCatalog.styles"
                    :key="style.style_id"
                    tabindex="0"
                    class="rounded-xl border bg-dark-700/60 p-4 text-left transition"
                    :class="isPreviewStyleSelected(style.style_id)
                      ? 'border-blue-500/50 ring-1 ring-blue-500/35'
                      : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/80'"
                    @click="selectPreviewStyle(style.style_id)"
                    @keydown.enter.prevent="selectPreviewStyle(style.style_id)"
                    @keydown.space.prevent="selectPreviewStyle(style.style_id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <StyledUsername
                          :username="currentUsername"
                          :style-id="style.style_id"
                          class="text-base font-semibold"
                        />
                        <p class="mt-1 text-xs text-gray-200/80">
                          {{ getStyleDescription(style.style_id) }}
                        </p>
                      </div>

                      <div class="flex flex-shrink-0 items-center gap-2">
                        <span
                          v-if="style.is_owned"
                          class="rounded-md border border-emerald-500/35 bg-emerald-600/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                        >
                          {{ $t('pages.settingsPage.owned') }}
                        </span>
                        <span
                          v-if="style.is_active"
                          class="rounded-md border border-blue-500/35 bg-blue-600/15 px-2 py-0.5 text-[11px] font-semibold text-blue-200"
                        >
                          {{ $t('pages.settingsPage.active') }}
                        </span>
                      </div>
                    </div>

                    <div class="mt-4 flex items-center justify-between gap-3">
                      <div class="text-sm font-semibold text-white">
                        {{ getStylePriceLabel(style) }}
                      </div>
                      <button
                        type="button"
                        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                        :class="style.is_active
                          ? 'cursor-default border border-blue-500/35 bg-blue-600/20 text-blue-200'
                          : style.is_owned
                            ? 'border border-emerald-500/35 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25'
                            : 'border border-amber-500/35 bg-amber-600/15 text-amber-100 hover:bg-amber-600/25'"
                        :disabled="style.is_active || styleActionLoadingId === style.style_id"
                        @click.stop="handleStyleAction(style)"
                      >
                        {{ getStyleActionLabel(style) }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <div
                v-else-if="!isStylesLoading"
                class="rounded-xl border border-dark-700 bg-dark-700/40 px-4 py-8 text-center text-sm text-gray-400"
              >
                {{ $t('pages.settingsPage.noStyles') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

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

@media (max-width: 1023px) {
  .lg\:sticky {
    position: static;
  }
}
</style>
