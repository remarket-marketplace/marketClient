<script setup lang="ts">
import { settingsService } from '@/api/settings/settingsService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import TheInput from '@/components/TheInput.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import Checkbox from '@/components/Checkbox.vue'
import DarkColorPicker from '@/components/settings/DarkColorPicker.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SuccessMessage from '@/components/SuccessMessage.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import { AtSign, Bell, Key, Loader2, Lock, Mail, Palette, Send, Shield, ImagePlus, Link2Off } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { formatCurrencyAmount, resolvePreferredCurrency } from '@/utils/currency'
import { useRoute, useRouter } from 'vue-router'
import {
  buildCustomNicknameStyleId,
  CUSTOM_NICKNAME_STYLE_FONT_WEIGHTS,
  CUSTOM_NICKNAME_STYLE_PRICE_RUB,
  isCustomNicknameStyleId,
  resolveNicknameStyleId,
  type CustomNicknameStyleFontWeight,
} from '@/utils/nicknameStyles'
import type {
  NicknameStyleCatalogItem,
  NicknameStyleCatalogResponse,
} from '@/validation/user/nicknameStyle'
import type { NotificationSettings } from '@/validation/user/notificationSettings'

type SettingsSection = 'security' | 'notifications' | 'nickname' | 'nickname-styles'
type ColorPickerGroup = 'primary' | 'secondary' | 'glow'

const NICKNAME_MIN_LENGTH = 4
const NICKNAME_MAX_LENGTH = 32
const NICKNAME_CHANGE_PRICE_RUB = 100
const PROFILE_BACKGROUND_UNLOCK_PRICE_RUB = 199
const NICKNAME_REGEX = /^[A-Za-z0-9_]+$/

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const API_HOST = import.meta.env.VITE_API_HOST

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
const notificationsData = ref<NotificationSettings | null>(null)
const notificationsErrorMessage = ref<string | null>(null)
const notificationsSuccessMessage = ref<string | null>(null)
const isNotificationsLoading = ref(false)
const isNotificationsSaving = ref(false)
const isTelegramConnectLoading = ref(false)
const isTelegramDisconnectLoading = ref(false)
const pendingTelegramConnectUrl = ref<string | null>(null)
let isNotificationsSilentRefreshInFlight = false
let telegramStatusPollingTimer: ReturnType<typeof window.setInterval> | null = null
let telegramStatusPollingAttempts = 0
const TELEGRAM_STATUS_POLL_INTERVAL_MS = 2500
const TELEGRAM_STATUS_POLL_MAX_ATTEMPTS = 48

const isStylesLoading = ref(false)
const stylesErrorMessage = ref<string | null>(null)
const stylesSuccessMessage = ref<string | null>(null)
const stylesCatalog = ref<NicknameStyleCatalogResponse | null>(null)
const previewStyleId = ref('default')
const styleActionType = ref<'buy' | 'apply' | null>(null)
const styleActionLoadingId = ref<string | null>(null)
const showUsernameConfirmModal = ref(false)
const pendingUsernameForChange = ref('')
const showStylePurchaseConfirmModal = ref(false)
const pendingStylePurchaseId = ref<string | null>(null)
const profileBackgroundFileInputRef = ref<HTMLInputElement | null>(null)
const isProfileBackgroundPurchasing = ref(false)
const isProfileBackgroundUploading = ref(false)
const isProfileBackgroundRemoving = ref(false)
const profileBackgroundErrorMessage = ref<string | null>(null)
const profileBackgroundSuccessMessage = ref<string | null>(null)
const showProfileBackgroundPurchaseConfirmModal = ref(false)
const customPrimaryR = ref(94)
const customPrimaryG = ref(234)
const customPrimaryB = ref(212)
const customSecondaryR = ref(129)
const customSecondaryG = ref(140)
const customSecondaryB = ref(248)
const customGlowR = ref(244)
const customGlowG = ref(114)
const customGlowB = ref(182)
const customFontWeight = ref<CustomNicknameStyleFontWeight>(700)
const customGlowEnabled = ref(true)

const currentUsername = computed(() => user.value?.username ?? 'username')
const currentStyleId = computed(
  () => stylesCatalog.value?.active_style_id ?? user.value?.nickname_style_id ?? 'default',
)
const resolvedPreviewStyleId = computed(() =>
  resolveNicknameStyleId(previewStyleId.value || currentStyleId.value),
)
const customStyleId = computed(() =>
  buildCustomNicknameStyleId({
    primaryColor: { r: customPrimaryR.value, g: customPrimaryG.value, b: customPrimaryB.value },
    secondaryColor: { r: customSecondaryR.value, g: customSecondaryG.value, b: customSecondaryB.value },
    glowColor: { r: customGlowR.value, g: customGlowG.value, b: customGlowB.value },
    fontWeight: customFontWeight.value,
    glowEnabled: customGlowEnabled.value,
  }),
)
const priceFractionDigits = computed(() => (resolvePreferredCurrency() === 'USD' ? 2 : 0))
const nicknameChangePriceLabel = computed(() =>
  formatCurrencyAmount(NICKNAME_CHANGE_PRICE_RUB, {
    fromCurrency: 'RUB',
    minimumFractionDigits: priceFractionDigits.value,
    maximumFractionDigits: priceFractionDigits.value,
  }),
)
const profileBackgroundUnlockPriceLabel = computed(() =>
  formatCurrencyAmount(PROFILE_BACKGROUND_UNLOCK_PRICE_RUB, {
    fromCurrency: 'RUB',
    minimumFractionDigits: priceFractionDigits.value,
    maximumFractionDigits: priceFractionDigits.value,
  }),
)
const profileBackgroundUnlocked = computed(() => user.value?.profile_background_unlocked === true)
const profileBackgroundPreviewUrl = computed(() =>
  resolveProfileMediaUrl(user.value?.profile_background_url),
)
const emailNotificationsEnabled = computed(
  () => notificationsData.value?.email_notifications_enabled ?? true,
)
const telegramNotificationsEnabled = computed(
  () => notificationsData.value?.telegram_notifications_enabled ?? false,
)
const telegramIntegrationEnabled = computed(
  () => notificationsData.value?.telegram_integration_enabled !== false,
)
const telegramConnected = computed(() => notificationsData.value?.telegram_connected === true)
const telegramUsername = computed(() => notificationsData.value?.telegram_username ?? null)
const telegramBotUsername = computed(() => notificationsData.value?.telegram_bot_username ?? null)
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
const pendingStylePurchase = computed(
  () =>
    stylesCatalog.value?.styles.find((style) => style.style_id === pendingStylePurchaseId.value) ??
    (pendingStylePurchaseId.value && isCustomNicknameStyleId(pendingStylePurchaseId.value)
      ? {
          style_id: pendingStylePurchaseId.value,
          price_rub: CUSTOM_NICKNAME_STYLE_PRICE_RUB,
          is_owned: false,
          is_active: false,
        }
      : null),
)
const pendingStylePurchasePriceLabel = computed(() => {
  if (!pendingStylePurchase.value) return ''
  return getStylePriceLabel(pendingStylePurchase.value)
})
const customStyleCatalogItem = computed(
  () => stylesCatalog.value?.styles.find((style) => style.style_id === customStyleId.value) ?? null,
)
const customStylePriceLabel = computed(() =>
  formatCurrencyAmount(CUSTOM_NICKNAME_STYLE_PRICE_RUB, {
    fromCurrency: 'RUB',
    minimumFractionDigits: priceFractionDigits.value,
    maximumFractionDigits: priceFractionDigits.value,
  }),
)
const customStyleActionLabel = computed(() => {
  const existingCustomStyle = customStyleCatalogItem.value
  const isLoadingCustomAction = styleActionLoadingId.value === customStyleId.value

  if (existingCustomStyle?.is_active) return t('pages.settingsPage.active')
  if (existingCustomStyle?.is_owned) {
    return isLoadingCustomAction && styleActionType.value === 'apply'
      ? t('pages.settingsPage.applying')
      : t('pages.settingsPage.select')
  }

  return isLoadingCustomAction && styleActionType.value === 'buy'
    ? t('pages.settingsPage.buying')
    : t('pages.settingsPage.buyFor', { price: customStylePriceLabel.value })
})

function normalizeSettingsSection(value: unknown): SettingsSection {
  const raw = Array.isArray(value) ? value[0] : value
  if (
    raw === 'security'
    || raw === 'notifications'
    || raw === 'nickname'
    || raw === 'nickname-styles'
  ) {
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

function setNotificationsSuccessMessage(value: string) {
  notificationsSuccessMessage.value = value
  window.setTimeout(() => {
    if (notificationsSuccessMessage.value === value) {
      notificationsSuccessMessage.value = null
    }
  }, 2600)
}

function setProfileBackgroundSuccessMessage(value: string) {
  profileBackgroundSuccessMessage.value = value
  window.setTimeout(() => {
    if (profileBackgroundSuccessMessage.value === value) {
      profileBackgroundSuccessMessage.value = null
    }
  }, 2600)
}

function resolveProfileMediaUrl(rawUrl?: string | null): string {
  const normalizedUrl = rawUrl?.trim() ?? ''
  if (!normalizedUrl) return ''
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl
  }
  return `${API_HOST}${normalizedUrl}`
}

function applyStylesCatalog(data: NicknameStyleCatalogResponse) {
  stylesCatalog.value = data
  previewStyleId.value = resolveNicknameStyleId(data.active_style_id)
  userStore.updateUserProfile({
    balance: data.balance,
    nickname_style_id: data.active_style_id,
  })
}

function clampRgb(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(255, Math.max(0, Math.round(value)))
}

function channelToHex(value: number): string {
  return clampRgb(value).toString(16).padStart(2, '0')
}

function rgbToHexColor(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().toLowerCase()
  const match = normalized.match(/^#([0-9a-f]{6})$/)
  if (!match || !match[1]) return null
  const raw = match[1]
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  }
}

const customPrimaryHex = computed({
  get: () => rgbToHexColor(customPrimaryR.value, customPrimaryG.value, customPrimaryB.value),
  set: (value: string) => {
    const parsed = parseHexColor(value)
    if (!parsed) return
    customPrimaryR.value = parsed.r
    customPrimaryG.value = parsed.g
    customPrimaryB.value = parsed.b
  },
})

const customSecondaryHex = computed({
  get: () => rgbToHexColor(customSecondaryR.value, customSecondaryG.value, customSecondaryB.value),
  set: (value: string) => {
    const parsed = parseHexColor(value)
    if (!parsed) return
    customSecondaryR.value = parsed.r
    customSecondaryG.value = parsed.g
    customSecondaryB.value = parsed.b
  },
})

const customGlowHex = computed({
  get: () => rgbToHexColor(customGlowR.value, customGlowG.value, customGlowB.value),
  set: (value: string) => {
    const parsed = parseHexColor(value)
    if (!parsed) return
    customGlowR.value = parsed.r
    customGlowG.value = parsed.g
    customGlowB.value = parsed.b
  },
})

const customPrimaryPaletteRef = ref<HTMLElement | null>(null)
const customSecondaryPaletteRef = ref<HTMLElement | null>(null)
const customGlowPaletteRef = ref<HTMLElement | null>(null)
const activeColorPalette = ref<ColorPickerGroup | null>(null)

const darkMarketPalette = [
  '#0B1220', '#111827', '#1F2937', '#273244', '#334155', '#475569',
  '#0F172A', '#172554', '#1E3A8A', '#1E40AF', '#0C4A6E', '#155E75',
  '#052E2B', '#064E3B', '#14532D', '#365314', '#4C1D95', '#581C87',
  '#3B1B3D', '#4C1D32', '#7C2D12', '#7F1D1D', '#B45309', '#BE123C',
] as const

function getPaletteContainerRef(group: ColorPickerGroup): HTMLElement | null {
  if (group === 'primary') return customPrimaryPaletteRef.value
  if (group === 'secondary') return customSecondaryPaletteRef.value
  return customGlowPaletteRef.value
}

function toggleColorPalette(group: ColorPickerGroup) {
  activeColorPalette.value = activeColorPalette.value === group ? null : group
}

function handleOutsidePaletteClick(event: MouseEvent) {
  if (!activeColorPalette.value) return
  const paletteContainer = getPaletteContainerRef(activeColorPalette.value)
  if (!paletteContainer) return
  const target = event.target as Node | null
  if (target && !paletteContainer.contains(target)) {
    activeColorPalette.value = null
  }
}

function applyNotificationSettings(data: NotificationSettings) {
  notificationsData.value = data
}

async function refreshNotificationSettingsSilently() {
  if (isNotificationsSilentRefreshInFlight) return
  isNotificationsSilentRefreshInFlight = true

  const result = await settingsService.getNotificationSettings()
  if (result.success && result.data) {
    applyNotificationSettings(result.data)
  }

  isNotificationsSilentRefreshInFlight = false
}

function stopTelegramStatusPolling() {
  if (telegramStatusPollingTimer) {
    window.clearInterval(telegramStatusPollingTimer)
    telegramStatusPollingTimer = null
  }
  telegramStatusPollingAttempts = 0
}

function startTelegramStatusPolling() {
  stopTelegramStatusPolling()
  telegramStatusPollingAttempts = 0

  telegramStatusPollingTimer = window.setInterval(async () => {
    if (activeSection.value !== 'notifications') return

    telegramStatusPollingAttempts += 1
    await refreshNotificationSettingsSilently()

    if (
      telegramConnected.value
      || telegramStatusPollingAttempts >= TELEGRAM_STATUS_POLL_MAX_ATTEMPTS
    ) {
      stopTelegramStatusPolling()
    }
  }, TELEGRAM_STATUS_POLL_INTERVAL_MS)
}

async function loadNotificationSettings() {
  isNotificationsLoading.value = true
  notificationsErrorMessage.value = null

  const result = await settingsService.getNotificationSettings()
  if (!result.success || !result.data) {
    notificationsErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isNotificationsLoading.value = false
    return
  }

  applyNotificationSettings(result.data)
  isNotificationsLoading.value = false
}

async function updateNotificationSettings(payload: {
  email_notifications_enabled?: boolean
  telegram_notifications_enabled?: boolean
}) {
  if (isNotificationsSaving.value) return
  notificationsErrorMessage.value = null
  notificationsSuccessMessage.value = null
  isNotificationsSaving.value = true

  const result = await settingsService.updateNotificationSettings(payload)
  if (!result.success || !result.data) {
    notificationsErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isNotificationsSaving.value = false
    return
  }

  applyNotificationSettings(result.data)
  setNotificationsSuccessMessage(t('pages.settingsPage.notificationsSaved'))
  isNotificationsSaving.value = false
}

async function toggleEmailNotifications() {
  if (!notificationsData.value) return
  await updateNotificationSettings({
    email_notifications_enabled: !notificationsData.value.email_notifications_enabled,
  })
}

async function toggleTelegramNotifications() {
  if (!notificationsData.value || !telegramConnected.value) return
  await updateNotificationSettings({
    telegram_notifications_enabled: !notificationsData.value.telegram_notifications_enabled,
  })
}

async function connectTelegram() {
  if (isTelegramConnectLoading.value) return
  notificationsErrorMessage.value = null
  notificationsSuccessMessage.value = null
  pendingTelegramConnectUrl.value = null
  isTelegramConnectLoading.value = true
  const pendingWindow = window.open('about:blank', '_blank')
  if (pendingWindow) {
    try {
      pendingWindow.opener = null
    } catch {
      // no-op: browser may disallow changing opener
    }
  }

  const result = await settingsService.createTelegramConnectLink()
  if (!result.success || !result.data) {
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.close()
    }
    notificationsErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isTelegramConnectLoading.value = false
    return
  }

  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.location.href = result.data.connect_url
  } else {
    pendingTelegramConnectUrl.value = result.data.connect_url
    notificationsErrorMessage.value = t('pages.settingsPage.notificationsTelegramPopupBlocked')
  }
  startTelegramStatusPolling()
  setNotificationsSuccessMessage(t('pages.settingsPage.notificationsConnectLinkOpened'))
  isTelegramConnectLoading.value = false
}

async function disconnectTelegram() {
  if (isTelegramDisconnectLoading.value || !telegramConnected.value) return
  notificationsErrorMessage.value = null
  notificationsSuccessMessage.value = null
  isTelegramDisconnectLoading.value = true

  const result = await settingsService.disconnectTelegram()
  if (!result.success || !result.data) {
    notificationsErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isTelegramDisconnectLoading.value = false
    return
  }

  applyNotificationSettings(result.data)
  setNotificationsSuccessMessage(t('pages.settingsPage.notificationsSaved'))
  isTelegramDisconnectLoading.value = false
}

function getStyleDescription(styleId: string) {
  if (isCustomNicknameStyleId(styleId)) {
    return ''
  }
  const key = `pages.settingsPage.nicknameStyleCatalog.${styleId}.description`
  const value = t(key)
  return value === key ? '' : value
}

function getStylePriceLabel(style: NicknameStyleCatalogItem) {
  if (style.price_rub <= 0) return t('pages.settingsPage.free')
  return formatCurrencyAmount(style.price_rub, {
    fromCurrency: 'RUB',
    minimumFractionDigits: priceFractionDigits.value,
    maximumFractionDigits: priceFractionDigits.value,
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

async function executeStyleAction(style: NicknameStyleCatalogItem) {
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

function requestStyleAction(style: NicknameStyleCatalogItem) {
  if (style.is_active || styleActionLoadingId.value) return

  if (style.is_owned) {
    void executeStyleAction(style)
    return
  }

  pendingStylePurchaseId.value = style.style_id
  showStylePurchaseConfirmModal.value = true
}

function requestCustomStyleAction() {
  if (!stylesCatalog.value || styleActionLoadingId.value) return

  selectPreviewStyle(customStyleId.value)

  if (customStyleCatalogItem.value?.is_owned) {
    void executeStyleAction(customStyleCatalogItem.value)
    return
  }

  pendingStylePurchaseId.value = customStyleId.value
  showStylePurchaseConfirmModal.value = true
}

function closeStylePurchaseConfirmModal() {
  if (styleActionType.value === 'buy' && styleActionLoadingId.value === pendingStylePurchaseId.value) return
  showStylePurchaseConfirmModal.value = false
  pendingStylePurchaseId.value = null
}

async function confirmStylePurchase() {
  const style = pendingStylePurchase.value
  if (!style) {
    closeStylePurchaseConfirmModal()
    return
  }

  await executeStyleAction(style)
  closeStylePurchaseConfirmModal()
}

function triggerProfileBackgroundFileInput() {
  if (!profileBackgroundUnlocked.value || !profileBackgroundFileInputRef.value) return
  profileBackgroundFileInputRef.value.click()
}

function requestProfileBackgroundPurchase() {
  if (profileBackgroundUnlocked.value || isProfileBackgroundPurchasing.value) return
  profileBackgroundErrorMessage.value = null
  profileBackgroundSuccessMessage.value = null
  showProfileBackgroundPurchaseConfirmModal.value = true
}

function closeProfileBackgroundPurchaseConfirmModal() {
  if (isProfileBackgroundPurchasing.value) return
  showProfileBackgroundPurchaseConfirmModal.value = false
}

async function purchaseProfileBackgroundAccess() {
  if (profileBackgroundUnlocked.value || isProfileBackgroundPurchasing.value) return

  profileBackgroundErrorMessage.value = null
  isProfileBackgroundPurchasing.value = true

  const result = await settingsService.purchaseProfileBackgroundAccess()
  if (!result.success || !result.data) {
    profileBackgroundErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isProfileBackgroundPurchasing.value = false
    return
  }

  userStore.updateUserProfile({
    balance: result.data.balance,
    profile_background_unlocked: result.data.profile_background_unlocked,
    profile_background_url: result.data.profile_background_url,
  })
  setProfileBackgroundSuccessMessage(t('pages.settingsPage.profileBackgroundPurchased'))
  isProfileBackgroundPurchasing.value = false
}

async function confirmProfileBackgroundPurchase() {
  await purchaseProfileBackgroundAccess()
  closeProfileBackgroundPurchaseConfirmModal()
}

async function handleProfileBackgroundUpload(event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (
    !file
    || !profileBackgroundUnlocked.value
    || !file.type.startsWith('image/')
    || file.size > 10 * 1024 * 1024
  ) {
    return
  }

  profileBackgroundErrorMessage.value = null
  isProfileBackgroundUploading.value = true

  const result = await settingsService.uploadProfileBackground(file)
  if (!result.success || !result.data) {
    profileBackgroundErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isProfileBackgroundUploading.value = false
    ;(event.target as HTMLInputElement).value = ''
    return
  }

  userStore.updateUserProfile({
    balance: result.data.balance,
    profile_background_unlocked: result.data.profile_background_unlocked,
    profile_background_url: result.data.profile_background_url,
  })
  setProfileBackgroundSuccessMessage(t('pages.settingsPage.profileBackgroundUpdated'))
  isProfileBackgroundUploading.value = false
  ;(event.target as HTMLInputElement).value = ''
}

async function removeProfileBackground() {
  if (!profileBackgroundUnlocked.value || !profileBackgroundPreviewUrl.value || isProfileBackgroundRemoving.value) {
    return
  }

  profileBackgroundErrorMessage.value = null
  isProfileBackgroundRemoving.value = true

  const result = await settingsService.removeProfileBackground()
  if (!result.success || !result.data) {
    profileBackgroundErrorMessage.value = getErrorMessage(
      result.error,
      t as unknown as (key: string) => string,
    )
    isProfileBackgroundRemoving.value = false
    return
  }

  userStore.updateUserProfile({
    balance: result.data.balance,
    profile_background_unlocked: result.data.profile_background_unlocked,
    profile_background_url: result.data.profile_background_url,
  })
  setProfileBackgroundSuccessMessage(t('pages.settingsPage.profileBackgroundRemoved'))
  isProfileBackgroundRemoving.value = false
}

function requestUsernameChangeConfirmation() {
  usernameErrorMessage.value = null
  usernameSuccessMessage.value = null

  const normalizedUsername = changingUsername.value.trim()
  const validationError = validateUsernameForChange(normalizedUsername)
  if (validationError) {
    usernameErrorMessage.value = validationError
    return
  }

  pendingUsernameForChange.value = normalizedUsername
  showUsernameConfirmModal.value = true
}

function closeUsernameConfirmModal() {
  if (isChangingUsername.value) return
  showUsernameConfirmModal.value = false
  pendingUsernameForChange.value = ''
}

async function changeUsername() {
  const normalizedUsername = pendingUsernameForChange.value.trim()
  if (!normalizedUsername) {
    closeUsernameConfirmModal()
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
  isChangingUsername.value = false
  closeUsernameConfirmModal()
  setUsernameSuccessMessage(t('pages.settingsPage.nicknameChanged'))
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
    if (section === 'notifications' && !isNotificationsLoading.value) {
      if (!notificationsData.value) {
        void loadNotificationSettings()
      } else {
        void refreshNotificationSettingsSilently()
      }
    }
  },
  { immediate: true },
)

watch(telegramConnected, (connected) => {
  if (connected) {
    stopTelegramStatusPolling()
    pendingTelegramConnectUrl.value = null
  }
})

function handleWindowFocus() {
  if (activeSection.value !== 'notifications') return
  void refreshNotificationSettingsSilently()
}

function handleWindowVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  if (activeSection.value !== 'notifications') return
  void refreshNotificationSettingsSilently()
}

onMounted(() => {
  window.addEventListener('click', handleOutsidePaletteClick)
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleWindowVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsidePaletteClick)
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleWindowVisibilityChange)
  stopTelegramStatusPolling()
})
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

              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-lg text-left transition"
                :class="isSectionActive('notifications')
                  ? 'bg-amber-600/20 border border-amber-500/30'
                  : 'border border-transparent hover:bg-dark-700/60'"
                @click="switchSection('notifications')"
              >
                <div class="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                  <Bell class="w-4 h-4" :class="isSectionActive('notifications') ? 'text-amber-300' : 'text-gray-400'" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ $t('pages.settingsPage.notificationsMenu') }}</h3>
                  <p class="text-xs text-gray-300">{{ $t('pages.settingsPage.notificationsHint') }}</p>
                </div>
              </button>
            </div>

            <div
              v-if="activeSection === 'security'"
              class="rounded-xl border border-dark-700 bg-dark-600/40 p-4 space-y-3"
            >
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
                @click="requestUsernameChangeConfirmation"
              >
                <Loader2 v-if="isChangingUsername" class="w-4 h-4 animate-spin" />
                <span>{{ isChangingUsername ? t('pages.settingsPage.savingNickname') : t('pages.settingsPage.saveNickname') }}</span>
              </button>
            </div>
          </div>

          <div v-else-if="activeSection === 'notifications'" class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white">{{ $t('pages.settingsPage.notificationsSectionTitle') }}</h2>
              <p class="text-sm text-gray-400">{{ $t('pages.settingsPage.notificationsSectionHint') }}</p>
            </div>

            <div v-if="isNotificationsLoading" class="rounded-xl border border-dark-700 bg-dark-600/40 p-6">
              <div class="flex items-center gap-2 text-sm text-gray-300">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>{{ t('common.loading') }}</span>
              </div>
            </div>

            <div v-else class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-5">
              <div class="rounded-xl border border-dark-700 bg-dark-700/30 p-4 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-white font-semibold">
                    <Mail class="w-4 h-4 text-blue-300" />
                    <span>{{ $t('pages.settingsPage.notificationsEmailTitle') }}</span>
                  </div>
                  <p class="mt-1 text-xs text-gray-300">{{ $t('pages.settingsPage.notificationsEmailHint') }}</p>
                </div>
                <Checkbox
                  size="md"
                  :model-value="emailNotificationsEnabled"
                  :disabled="isNotificationsSaving"
                  @update:model-value="toggleEmailNotifications"
                />
              </div>

              <div
                v-if="telegramIntegrationEnabled"
                class="rounded-xl border border-dark-700 bg-dark-700/30 p-4 space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 text-white font-semibold">
                      <Send class="w-4 h-4 text-emerald-300" />
                      <span>{{ $t('pages.settingsPage.notificationsTelegramTitle') }}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-300">{{ $t('pages.settingsPage.notificationsTelegramHint') }}</p>
                  </div>
                  <Checkbox
                    size="md"
                    :model-value="telegramNotificationsEnabled"
                    :disabled="isNotificationsSaving || !telegramConnected"
                    @update:model-value="toggleTelegramNotifications"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 font-semibold"
                    :class="telegramConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'"
                  >
                    {{ telegramConnected ? $t('pages.settingsPage.notificationsTelegramConnected') : $t('pages.settingsPage.notificationsTelegramNotConnected') }}
                  </span>
                  <span v-if="telegramUsername" class="text-gray-300">@{{ telegramUsername }}</span>
                  <span v-if="telegramBotUsername" class="text-gray-400">bot: @{{ telegramBotUsername }}</span>
                </div>

                <p class="text-xs text-gray-400">{{ $t('pages.settingsPage.notificationsTelegramStartHint') }}</p>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-if="!telegramConnected"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    :disabled="isTelegramConnectLoading"
                    @click="connectTelegram"
                  >
                    <Loader2 v-if="isTelegramConnectLoading" class="w-4 h-4 animate-spin" />
                    <span>{{ isTelegramConnectLoading ? $t('pages.settingsPage.notificationsTelegramConnecting') : $t('pages.settingsPage.notificationsTelegramConnect') }}</span>
                  </button>

                  <button
                    v-else
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    :disabled="isTelegramDisconnectLoading"
                    @click="disconnectTelegram"
                  >
                    <Loader2 v-if="isTelegramDisconnectLoading" class="w-4 h-4 animate-spin" />
                    <Link2Off v-else class="w-4 h-4" />
                    <span>{{ $t('pages.settingsPage.notificationsTelegramDisconnect') }}</span>
                  </button>

                  <a
                    v-if="pendingTelegramConnectUrl && !telegramConnected"
                    :href="pendingTelegramConnectUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 transition"
                  >
                    <Send class="w-4 h-4" />
                    <span>{{ $t('pages.settingsPage.notificationsTelegramOpenLink') }}</span>
                  </a>
                </div>
              </div>

              <ErrorMessage
                v-if="notificationsErrorMessage"
                :error-message="notificationsErrorMessage"
              />
              <SuccessMessage
                v-if="notificationsSuccessMessage"
                :success-message="notificationsSuccessMessage"
              />
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
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-white">
                    {{ $t('pages.settingsPage.profileBackgroundSectionTitle') }}
                  </h3>
                  <p v-if="!profileBackgroundUnlocked" class="mt-1 text-xs text-gray-300">
                    {{ $t('pages.settingsPage.profileBackgroundSectionHint') }}
                  </p>
                </div>
                <span
                  v-if="!profileBackgroundUnlocked"
                  class="rounded-md border border-amber-500/35 bg-amber-600/15 px-2.5 py-1 text-xs font-semibold text-amber-100"
                >
                  {{ profileBackgroundUnlockPriceLabel }}
                </span>
              </div>

              <div class="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-3">
                <div class="text-xs uppercase tracking-wide text-gray-400">
                  {{ $t('pages.settingsPage.profileBackgroundPreview') }}
                </div>
                <div class="relative h-24 overflow-hidden rounded-lg border border-dark-600 bg-dark-700/60">
                  <div
                    v-if="profileBackgroundPreviewUrl"
                    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    :style="{
                      backgroundImage: `linear-gradient(180deg, rgba(8, 12, 19, 0.45) 0%, rgba(8, 12, 19, 0.75) 100%), url(${profileBackgroundPreviewUrl})`,
                    }"
                  />
                  <div class="relative z-10 flex h-full w-full items-center justify-center text-xs text-gray-200">
                    {{ $t('pages.settingsPage.profileBackgroundPreviewHint') }}
                  </div>
                </div>
                <div v-if="!profileBackgroundUnlocked" class="text-xs text-gray-300">
                  {{ $t('pages.settingsPage.profileBackgroundUnlockFee', { price: profileBackgroundUnlockPriceLabel }) }}
                </div>
              </div>

              <ErrorMessage
                v-if="profileBackgroundErrorMessage"
                :error-message="profileBackgroundErrorMessage"
              />
              <SuccessMessage
                v-if="profileBackgroundSuccessMessage"
                :success-message="profileBackgroundSuccessMessage"
              />

              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="!profileBackgroundUnlocked"
                  type="button"
                  class="rounded-lg border border-amber-500/35 bg-amber-600/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-600/25 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isProfileBackgroundPurchasing"
                  @click="requestProfileBackgroundPurchase"
                >
                  <span>
                    {{ isProfileBackgroundPurchasing
                      ? $t('pages.settingsPage.profileBackgroundPurchasing')
                      : $t('pages.settingsPage.profileBackgroundPurchase')
                    }}
                  </span>
                </button>

                <button
                  v-else
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-700/70 px-3 py-2 text-xs font-semibold text-gray-100 transition hover:bg-dark-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isProfileBackgroundUploading || isProfileBackgroundRemoving"
                  @click="triggerProfileBackgroundFileInput"
                >
                  <Loader2 v-if="isProfileBackgroundUploading" class="h-3.5 w-3.5 animate-spin" />
                  <ImagePlus v-else class="h-3.5 w-3.5" />
                  <span>
                    {{ isProfileBackgroundUploading
                      ? $t('pages.settingsPage.profileBackgroundUploading')
                      : $t('pages.settingsPage.profileBackgroundChange')
                    }}
                  </span>
                </button>

                <button
                  v-if="profileBackgroundUnlocked && profileBackgroundPreviewUrl"
                  type="button"
                  class="rounded-lg border border-dark-500 bg-dark-700/70 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-dark-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isProfileBackgroundRemoving || isProfileBackgroundUploading"
                  @click="removeProfileBackground"
                >
                  <span>
                    {{ isProfileBackgroundRemoving
                      ? $t('pages.settingsPage.profileBackgroundRemoving')
                      : $t('pages.settingsPage.profileBackgroundRemove')
                    }}
                  </span>
                </button>

                <input
                  ref="profileBackgroundFileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleProfileBackgroundUpload"
                />
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

                <div class="rounded-xl border border-dark-600 bg-dark-700/50 p-4 space-y-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="text-sm font-semibold text-white">
                        {{ $t('pages.settingsPage.customStyleBuilderTitle') }}
                      </h3>
                      <p class="mt-1 text-xs text-gray-300">
                        {{ $t('pages.settingsPage.customStyleBuilderHint') }}
                      </p>
                    </div>
                    <div class="rounded-md border border-amber-500/35 bg-amber-600/15 px-2.5 py-1 text-xs font-semibold text-amber-100">
                      {{ customStylePriceLabel }}
                    </div>
                  </div>

                  <div class="rounded-xl border border-dark-600 bg-dark-800/70 p-3">
                    <div class="text-xs uppercase tracking-wide text-gray-400">
                      {{ $t('pages.settingsPage.customStylePreview') }}
                    </div>
                    <div class="mt-2">
                      <StyledUsername
                        :username="currentUsername"
                        :style-id="customStyleId"
                        class="text-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div class="rounded-lg border border-dark-600 bg-dark-800/60 p-3">
                      <div class="text-xs font-medium text-gray-300">
                        {{ $t('pages.settingsPage.customPrimaryColor') }}
                      </div>
                      <div ref="customPrimaryPaletteRef" class="relative mt-2 inline-block">
                        <button
                          type="button"
                          class="h-10 w-10 min-w-10 aspect-square rounded-md border border-dark-500 transition hover:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/45"
                          :style="{ backgroundColor: `rgb(${customPrimaryR}, ${customPrimaryG}, ${customPrimaryB})` }"
                          :aria-label="$t('pages.settingsPage.customPrimaryColor')"
                          @click.stop="toggleColorPalette('primary')"
                        >
                        </button>
                        <DarkColorPicker
                          v-if="activeColorPalette === 'primary'"
                          v-model="customPrimaryHex"
                          :swatches="darkMarketPalette"
                          class="absolute left-0 top-12 z-20"
                        />
                      </div>
                    </div>

                    <div class="rounded-lg border border-dark-600 bg-dark-800/60 p-3">
                      <div class="text-xs font-medium text-gray-300">
                        {{ $t('pages.settingsPage.customSecondaryColor') }}
                      </div>
                      <div ref="customSecondaryPaletteRef" class="relative mt-2 inline-block">
                        <button
                          type="button"
                          class="h-10 w-10 min-w-10 aspect-square rounded-md border border-dark-500 transition hover:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/45"
                          :style="{ backgroundColor: `rgb(${customSecondaryR}, ${customSecondaryG}, ${customSecondaryB})` }"
                          :aria-label="$t('pages.settingsPage.customSecondaryColor')"
                          @click.stop="toggleColorPalette('secondary')"
                        >
                        </button>
                        <DarkColorPicker
                          v-if="activeColorPalette === 'secondary'"
                          v-model="customSecondaryHex"
                          :swatches="darkMarketPalette"
                          class="absolute left-0 top-12 z-20"
                        />
                      </div>
                    </div>

                    <div class="rounded-lg border border-dark-600 bg-dark-800/60 p-3">
                      <div class="text-xs font-medium text-gray-300">
                        {{ $t('pages.settingsPage.customGlowColor') }}
                      </div>
                      <div ref="customGlowPaletteRef" class="relative mt-2 inline-block">
                        <button
                          type="button"
                          class="h-10 w-10 min-w-10 aspect-square rounded-md border border-dark-500 transition hover:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/45"
                          :style="{ backgroundColor: `rgb(${customGlowR}, ${customGlowG}, ${customGlowB})` }"
                          :aria-label="$t('pages.settingsPage.customGlowColor')"
                          @click.stop="toggleColorPalette('glow')"
                        >
                        </button>
                        <DarkColorPicker
                          v-if="activeColorPalette === 'glow'"
                          v-model="customGlowHex"
                          :swatches="darkMarketPalette"
                          class="absolute left-0 top-12 z-20"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 lg:grid-cols-2">
                    <label class="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-2">
                      <div class="text-[11px] uppercase tracking-wide text-gray-400">
                        {{ $t('pages.settingsPage.customFontWeight') }}
                      </div>
                      <select
                        v-model.number="customFontWeight"
                        class="mt-2 w-full rounded-md border border-dark-500 bg-dark-700 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-blue-500/60"
                      >
                        <option
                          v-for="weight in CUSTOM_NICKNAME_STYLE_FONT_WEIGHTS"
                          :key="weight"
                          :value="weight"
                        >
                          {{ weight }}
                        </option>
                      </select>
                    </label>

                    <label class="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-2 text-xs text-gray-200">
                      <div class="text-[11px] uppercase tracking-wide text-gray-400">
                        {{ $t('pages.settingsPage.customGlowEnabled') }}
                      </div>
                      <Checkbox
                        v-model="customGlowEnabled"
                        class="mt-3"
                        size="md"
                      />
                    </label>
                  </div>

                  <div class="flex justify-end">
                    <button
                      type="button"
                      class="rounded-lg px-3 py-1.5 text-xs font-semibold transition border"
                      :class="customStyleCatalogItem?.is_active
                        ? 'cursor-default border-blue-500/35 bg-blue-600/20 text-blue-200'
                        : customStyleCatalogItem?.is_owned
                          ? 'border-emerald-500/35 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25'
                          : 'border-amber-500/35 bg-amber-600/15 text-amber-100 hover:bg-amber-600/25'"
                      :disabled="!stylesCatalog || !!styleActionLoadingId || customStyleCatalogItem?.is_active"
                      @click="requestCustomStyleAction"
                    >
                      {{ customStyleActionLabel }}
                    </button>
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
                        <p v-if="getStyleDescription(style.style_id)" class="mt-1 text-xs text-gray-200/80">
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
                        @click.stop="requestStyleAction(style)"
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

  <ConfirmWindow
    :is-open="showUsernameConfirmModal"
    :title="$t('pages.settingsPage.confirmNicknameChangeTitle')"
    :message="$t('pages.settingsPage.confirmNicknameChangeMessage', { nickname: pendingUsernameForChange, price: nicknameChangePriceLabel })"
    :confirm-text="$t('pages.settingsPage.confirmNicknameChangeConfirm')"
    :cancel-text="$t('common.cancel')"
    :is-loading="isChangingUsername"
    @confirm="changeUsername"
    @cancel="closeUsernameConfirmModal"
  />

  <ConfirmWindow
    :is-open="showStylePurchaseConfirmModal"
    :title="$t('pages.settingsPage.confirmStylePurchaseTitle')"
    :message="$t('pages.settingsPage.confirmStylePurchaseMessage', { price: pendingStylePurchasePriceLabel })"
    :confirm-text="$t('pages.settingsPage.confirmStylePurchaseConfirm')"
    :cancel-text="$t('common.cancel')"
    :is-loading="styleActionType === 'buy' && styleActionLoadingId === pendingStylePurchaseId"
    @confirm="confirmStylePurchase"
    @cancel="closeStylePurchaseConfirmModal"
  />

  <ConfirmWindow
    :is-open="showProfileBackgroundPurchaseConfirmModal"
    :title="$t('pages.settingsPage.confirmProfileBackgroundPurchaseTitle')"
    :message="$t('pages.settingsPage.confirmProfileBackgroundPurchaseMessage', { price: profileBackgroundUnlockPriceLabel })"
    :confirm-text="$t('pages.settingsPage.confirmProfileBackgroundPurchaseConfirm')"
    :cancel-text="$t('common.cancel')"
    :is-loading="isProfileBackgroundPurchasing"
    @confirm="confirmProfileBackgroundPurchase"
    @cancel="closeProfileBackgroundPurchaseConfirmModal"
  />
</template>

<style>
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
