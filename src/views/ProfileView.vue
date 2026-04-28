<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import { chatsService } from '@/api/chats/chatsService'
import { productService } from '@/api/product/ProductService'
import { profileService } from '@/api/profile/ProfileService'
import { reviewService } from '@/api/review/ReviewService'
import Loader from '@/components/Loader.vue'
import ProfileProductCard from '@/components/ProfileProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import ReportComplaintModal from '@/components/complaints/ReportComplaintModal.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { LocationQueryValue } from 'vue-router'
import type { Product } from '@/validation/product/product'
import type { PublicProfileData, UserRead } from '@/validation/user/userRead'
import type { SubscriptionSeller } from '@/validation/user/subscriptions'
import type { ReviewSchema } from '@/validation/review/review'
import { Settings, LogOut, Share2, Copy, Check, Wallet, Heart, Archive, Edit, Calendar, Package, ShoppingBag, MessageSquare, Loader2, LayoutGrid, Rows3, UserPlus, UserCheck, Users, Flag } from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import type { Deal } from '@/validation/deal/deal'
import UserRating from '@/components/UserRating.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import AppModal from '@/components/AppModal.vue'
import { formatCurrencyAmount } from '@/utils/currency'
import { isSafeImageFile, SAFE_IMAGE_INPUT_ACCEPT } from '@/utils/imageUpload'
import { formatLastSeen } from '@/utils/presence'
import { buildProductKey } from '@/utils/urlKeys'
import { buildAuthRedirectQuery } from '@/utils/authRedirect'

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUserStore()
const { user: currentUser } = storeToRefs(store)
const API_HOST = import.meta.env.VITE_API_HOST

const username = computed(() => route.params.username as string)
const profileData = ref<PublicProfileData | UserRead | null>(null)
const currentProfileData = ref<UserRead | PublicProfileData | null>(null)
const newDescription = ref('')
const isEditingDescription = ref(false)

const showMenu = ref(false)
const menuContainerRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const showAvatarOverlay = ref(false)
const showShareModal = ref(false)
const showComplaintModal = ref(false)
const isCopied = ref(false)
const isOpeningDirectChat = ref(false)
const directChatError = ref<string | null>(null)
const isSubscriptionLoading = ref(false)

const isOwner = computed(() => currentUser.value?.username === username.value)
const isSubscribedToSeller = computed(() => {
  if (!currentProfileData.value || isOwner.value) return false
  if (!('is_subscribed' in currentProfileData.value)) return false
  return Boolean(currentProfileData.value.is_subscribed)
})
const isProfileBanned = computed(() => !isOwner.value && Boolean(currentProfileData.value?.is_banned))
const profileLastSeenLabel = computed(() => formatLastSeen(
  currentProfileData.value?.last_seen_at,
  Boolean(currentProfileData.value?.is_active),
  locale.value,
  t('common.notSpecified'),
  t('common.online'),
))
const profileBanReason = computed(() => {
  const profile = currentProfileData.value
  if (!profile?.is_banned) {
    return null
  }

  const customReason = typeof profile.ban_reason_text === 'string' ? profile.ban_reason_text.trim() : ''
  if (customReason) {
    return customReason
  }

  const reasonCode = typeof profile.ban_reason_code === 'string' ? profile.ban_reason_code : ''
  if (reasonCode) {
    const translated = t(`common.userBanReasons.${reasonCode}`)
    if (translated !== `common.userBanReasons.${reasonCode}`) {
      return translated
    }
  }

  return t('pages.profile.banReasonMissing')
})
const hasProfileDescription = computed(() => {
  const description = currentProfileData.value?.description
  return typeof description === 'string' && description.trim().length > 0
})
type ProfileTab = 'products' | 'reviews' | 'purchases' | 'subscriptions'

const DEFAULT_PROFILE_TAB: ProfileTab = 'products'

function isProfileTab(value: string): value is ProfileTab {
  return ['products', 'reviews', 'purchases', 'subscriptions'].includes(value)
}

function isTabAllowed(tab: ProfileTab): boolean {
  if (tab === 'purchases' || tab === 'subscriptions') {
    return isOwner.value
  }

  return true
}

function getRequestedTab(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0] ?? undefined
  return typeof value === 'string' ? value : undefined
}

function resolveProfileTab(value: LocationQueryValue | LocationQueryValue[] | undefined): ProfileTab {
  const requestedTab = getRequestedTab(value)

  if (!requestedTab || !isProfileTab(requestedTab)) {
    return DEFAULT_PROFILE_TAB
  }

  return isTabAllowed(requestedTab) ? requestedTab : DEFAULT_PROFILE_TAB
}

const profileUrl = computed(() => {
  if (typeof window === 'undefined') return ''

  const resolved = router.resolve({
    name: 'profile',
    params: { username: username.value },
    query: activeTab.value === DEFAULT_PROFILE_TAB ? {} : { tab: activeTab.value },
  })

  return `${window.location.origin}${resolved.fullPath}`
})
const profileBackgroundImageUrl = computed(() => resolveProfileMediaUrl(currentProfileData.value?.profile_background_url))
const profileBackgroundLayerStyle = computed(() => {
  if (!profileBackgroundImageUrl.value) {
    return {}
  }

  return {
    backgroundImage: `var(--profile-background-overlay), url(${profileBackgroundImageUrl.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})
const activeTab = ref<ProfileTab>(DEFAULT_PROFILE_TAB)
const tabsRef = ref<HTMLElement | null>(null)
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')

// Пагинация для товаров
const products = ref<Product[]>([])
const totalProducts = ref(0)
const currentPageProducts = ref(1)
const totalPagesProducts = ref(1)
const perPage = ref(20)
const isLoadingProducts = ref(false)
const isLoadingMoreProducts = ref(false)
const hasLoadedProductsSummary = ref(false)

// Пагинация для отзывов
const reviews = ref<ReviewSchema[]>([])
const totalReviews = ref(0)
const currentPageReviews = ref(1)
const totalPagesReviews = ref(1)
const isLoadingReviews = ref(false)
const isLoadingMoreReviews = ref(false)
const hasLoadedReviewsSummary = ref(false)

// Пагинация для покупок
const purchases = ref<Deal[]>([])
const currentPagePurchases = ref(1)
const totalPagesPurchases = ref(1)
const isLoadingPurchases = ref(false)
const isLoadingMorePurchases = ref(false)
const hasLoadedPurchasesData = ref(false)
const subscriptions = ref<SubscriptionSeller[]>([])
const isLoadingSubscriptions = ref(false)
const hasLoadedSubscriptionsData = ref(false)
const isProductsSummaryLoading = computed(() => !hasLoadedProductsSummary.value)
const isReviewsSummaryLoading = computed(() => !hasLoadedReviewsSummary.value)

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(useI18n().locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatPrice(price: number) {
  return formatCurrencyAmount(price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function resolveProfileMediaUrl(rawUrl?: string | null): string {
  const normalizedUrl = rawUrl?.trim() ?? ''
  if (!normalizedUrl) return ''
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl
  }
  return `${API_HOST}${normalizedUrl}`
}

async function loadProfileData() {
  try {
    const data = await profileService.getUserProfileData(username.value)
    if (!data) return false

    profileData.value = data
    currentProfileData.value = data
    newDescription.value = data.description ?? ''
    return true
  } catch (error: any) {
    console.error('Profile load error:', error)

    if (error?.response?.status === 404) {
      await router.replace({ name: 'notAccess' })
    }

    return false
  }
}

async function loadUserProducts(page = 1, append = false) {
  if (isLoadingMoreProducts.value) return
  if (page > totalPagesProducts.value) return

  isLoadingMoreProducts.value = true
  isLoadingProducts.value = true

  try {
    const res = await productService.getUserProductsByUsername(
      username.value,
      page,
      perPage.value
    )

    if (append) {
      products.value = [...products.value, ...res.products]
    } else {
      products.value = res.products
    }

    currentPageProducts.value = page
    totalProducts.value = res.total
    totalPagesProducts.value = res.totalPages
  } catch (error) {
    console.error('Failed to load user products:', error)
  } finally {
    hasLoadedProductsSummary.value = true
    isLoadingProducts.value = false
    isLoadingMoreProducts.value = false
  }
}

async function loadReviews(page = 1, append = false) {
  if (isLoadingMoreReviews.value) return
  if (page > totalPagesReviews.value) return

  isLoadingMoreReviews.value = true
  isLoadingReviews.value = true

  try {
    const res = await reviewService.getUserReviews(
      username.value,
      page,
      perPage.value
    )

    if (append) {
      reviews.value = [...reviews.value, ...res.reviews]
    } else {
      reviews.value = res.reviews
    }

    currentPageReviews.value = page
    totalReviews.value = res.total
    totalPagesReviews.value = res.totalPages
  } catch (error) {
    console.error('Failed to load reviews:', error)
  } finally {
    hasLoadedReviewsSummary.value = true
    isLoadingReviews.value = false
    isLoadingMoreReviews.value = false
  }
}

async function loadReviewsCount() {
  try {
    totalReviews.value = await reviewService.getUserReviewsCount(username.value)
    hasLoadedReviewsSummary.value = true
  } catch (error) {
    console.error('Failed to load reviews count:', error)
  }
}

async function loadPurchases(page = 1, append = false) {
  if (!isOwner.value) return
  if (isLoadingMorePurchases.value) return
  if (page > totalPagesPurchases.value) return

  isLoadingMorePurchases.value = true
  isLoadingPurchases.value = true

  try {
    const res = await profileService.getUserPurchases(page, perPage.value)

    if (append) {
      purchases.value = [...purchases.value, ...res.deals]
    } else {
      purchases.value = res.deals
    }

    currentPagePurchases.value = page
    totalPagesPurchases.value = res.totalPages
    hasLoadedPurchasesData.value = true
  } catch (error) {
    console.error('Failed to load purchases:', error)
  } finally {
    isLoadingPurchases.value = false
    isLoadingMorePurchases.value = false
  }
}

async function loadSubscriptions() {
  if (!isOwner.value) return
  if (isLoadingSubscriptions.value) return
  isLoadingSubscriptions.value = true
  try {
    const res = await profileService.getMySubscriptions()
    subscriptions.value = res.subscriptions
    hasLoadedSubscriptionsData.value = true
  } catch (error) {
    console.error('Failed to load subscriptions:', error)
  } finally {
    isLoadingSubscriptions.value = false
  }
}

async function ensureTabDataLoaded(tab: ProfileTab): Promise<void> {
  if (tab === 'products' && products.value.length === 0) {
    await loadUserProducts()
    return
  }

  if (tab === 'reviews' && reviews.value.length === 0) {
    await loadReviews()
    return
  }

  if (tab === 'purchases' && !hasLoadedPurchasesData.value) {
    await loadPurchases()
    return
  }

  if (tab === 'subscriptions' && !hasLoadedSubscriptionsData.value) {
    await loadSubscriptions()
  }
}

async function loadMoreProducts() {
  if (currentPageProducts.value >= totalPagesProducts.value) return
  await loadUserProducts(currentPageProducts.value + 1, true)
}

async function loadMoreReviews() {
  if (currentPageReviews.value >= totalPagesReviews.value) return
  await loadReviews(currentPageReviews.value + 1, true)
}

async function loadMorePurchases() {
  if (currentPagePurchases.value >= totalPagesPurchases.value) return
  await loadPurchases(currentPagePurchases.value + 1, true)
}

async function logout() {
  if (!isOwner.value) return
  if (await authService.logout()) router.push('/signin')
}

async function updateProfileDescription(newValue: string) {
  if (!isOwner.value) return
  try {
    const result = await profileService.updateProfileDescription(newValue)
    store.updateUserProfile({ description: newValue })
    currentProfileData.value = result
    profileData.value = result
    isEditingDescription.value = false
  } catch (error) {
    console.error('Description update error:', error)
  }
}

function toggleMenu() { showMenu.value = !showMenu.value }
function goToSettings() { router.push('/settings') }
function goToWallet() { router.push('/wallet') }
function goToChat(chatId: string) {
  router.push({ name: 'chats', query: { chatId } })
}

function handleClickOutside(event: MouseEvent) {
  if (showMenu.value && menuContainerRef.value && !menuContainerRef.value.contains(event.target as Node)) showMenu.value = false
}

function triggerFileInput() { if (isOwner.value && fileInputRef.value) fileInputRef.value.click() }

async function handleAvatarUpload(event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (!file || !isOwner.value || !isSafeImageFile(file) || file.size > 5 * 1024 * 1024) return
  isUploading.value = true
  try {
    const avatarUrl = await profileService.uploadAvatar(file)
    if (avatarUrl) {
      currentProfileData.value!.avatar_url = avatarUrl
      profileData.value!.avatar_url = avatarUrl
      if (isOwner.value) store.updateUserProfile({ avatar_url: avatarUrl })
    }
  } catch (error) { console.error('Avatar upload error:', error) }
  finally { isUploading.value = false; (event.target as HTMLInputElement).value = '' }
}

function showAvatarEdit() { if (isOwner.value) showAvatarOverlay.value = true }
function hideAvatarEdit() { showAvatarOverlay.value = false }

function openShareModal() {
  showShareModal.value = true
  showMenu.value = false
  isCopied.value = false
}

function closeShareModal() { showShareModal.value = false }

function openProfileReport() {
  if (isOwner.value) return

  if (!currentUser.value) {
    router.push({
      path: '/signin',
      query: buildAuthRedirectQuery(route.fullPath),
    })
    return
  }

  showComplaintModal.value = true
}

function closeComplaintModal() {
  showComplaintModal.value = false
}

async function openDirectChat(event?: MouseEvent) {
  event?.preventDefault()
  event?.stopPropagation()

  if (!username.value || isOpeningDirectChat.value) return
  if (isProfileBanned.value) {
    directChatError.value = t('errors.RECIPIENT_IS_BANNED')
    return
  }
  isOpeningDirectChat.value = true
  directChatError.value = null

  const result = await chatsService.getOrCreateDirectChat(username.value)

  isOpeningDirectChat.value = false

  if (!result.chatId) {
    directChatError.value = result.errorCode
      ? t(`errors.${result.errorCode}`)
      : t('errors.SERVER_ERROR')
    return
  }

  await router.push({ path: '/chats', query: { chatId: result.chatId } })
}

async function copyProfileLink() {
  try { await navigator.clipboard.writeText(profileUrl.value); isCopied.value = true }
  catch { const ta = document.createElement('textarea'); ta.value = profileUrl.value; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); isCopied.value = true }
  setTimeout(() => isCopied.value = false, 2000)
}

async function toggleSellerSubscription() {
  if (isOwner.value || isSubscriptionLoading.value || !currentProfileData.value) return

  isSubscriptionLoading.value = true
  try {
    const result = isSubscribedToSeller.value
      ? await profileService.unsubscribeFromSeller(username.value)
      : await profileService.subscribeToSeller(username.value)

    if (result === null) return
    if ('is_subscribed' in currentProfileData.value) {
      currentProfileData.value.is_subscribed = result
    }
  } finally {
    isSubscriptionLoading.value = false
  }
}

async function syncRouteTab(tab: ProfileTab, replace = false): Promise<void> {
  const currentTab = getRequestedTab(route.query.tab)
  const nextTab = tab === DEFAULT_PROFILE_TAB ? undefined : tab

  if (currentTab === nextTab) return

  const nextQuery = { ...route.query }
  if (nextTab) {
    nextQuery.tab = nextTab
  } else {
    delete nextQuery.tab
  }

  await router[replace ? 'replace' : 'push']({
    name: 'profile',
    params: { ...route.params, username: username.value },
    query: nextQuery,
  })
}

async function switchTab(tab: ProfileTab) {
  if (!isTabAllowed(tab)) {
    tab = DEFAULT_PROFILE_TAB
  }

  activeTab.value = tab
  await ensureTabDataLoaded(tab)
  await syncRouteTab(tab)
}

async function applyTabFromRoute(replaceInvalidQuery = false): Promise<void> {
  const tab = resolveProfileTab(route.query.tab)
  activeTab.value = tab
  await ensureTabDataLoaded(tab)

  if (replaceInvalidQuery) {
    const requestedTab = getRequestedTab(route.query.tab)
    const canonicalTab = tab === DEFAULT_PROFILE_TAB ? undefined : tab
    if (requestedTab !== canonicalTab) {
      await syncRouteTab(tab, true)
    }
  }
}

async function openReviewsTab() {
  await switchTab('reviews')
  await nextTick()
  if (!window.matchMedia('(min-width: 1024px)').matches) {
    tabsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function openProductsTab() {
  await switchTab('products')
  await nextTick()
  if (!window.matchMedia('(min-width: 1024px)').matches) {
    tabsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function goToProduct(productKey: string) {
  if (!productKey) return
  router.push(`/product/${productKey}`)
}
function goToProfile(username: string) { router.push(`/user/${username}`) }

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  restoreProductCardViewModeFromStorage()
  const profileLoaded = await loadProfileData()
  if (profileLoaded) {
    const initialTab = resolveProfileTab(route.query.tab)
    const tasks: Promise<void>[] = [applyTabFromRoute(true)]
    if (initialTab !== 'reviews') {
      tasks.push(loadReviewsCount())
    }
    await Promise.all(tasks)
  }
})

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
})

watch(() => route.query.tab, async () => {
  await applyTabFromRoute(true)
})

watch(isOwner, async () => {
  await applyTabFromRoute(true)
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="relative w-full h-full overflow-scroll lg:overflow-hidden pb-16 md:pb-0">
    <div v-if="profileBackgroundImageUrl" class="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
      :style="profileBackgroundLayerStyle" />

    <div class="relative z-10">
      <!-- Mobile header -->
      <div class="mb-6 lg:hidden px-4 pt-4">
        <div class="flex gap-2">
          <BackButton />
          <h1 class="text-2xl font-bold text-[var(--text-title)]">
            {{ $t('pages.profile.title') }}
          </h1>
        </div>
      </div>

      <!-- Desktop layout -->
      <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
        <!-- Left column - Profile info -->
        <div
          class="relative z-10 lg:w-96 lg:flex-shrink-0 lg:sticky lg:min-h-[calc(100dvh-3.5rem)] lg:border-r border-[rgb(var(--palette-dark-700))] px-4 lg:px-0 lg:pt-6 lg:pr-6">
          <div class="space-y-6">
            <!-- Desktop header -->
            <div class="hidden lg:block">
              <div class="flex gap-2">
                <BackButton />
                <h1 class="text-2xl font-bold text-[var(--text-title)]">
                  {{ $t('pages.profile.title') }}
                </h1>
              </div>
            </div>

            <!-- Profile card -->
            <div v-if="!currentProfileData" class="flex h-full items-center justify-center">
              <Loader />
            </div>

            <div v-else class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.4)] p-6 space-y-6">
              <!-- Profile header -->
              <div class="flex items-start justify-between">
                <div class="min-w-0 space-y-2">
                  <div class="flex items-center gap-3">
                    <StyledUsername
                      :username="currentProfileData.username"
                      :style-id="currentProfileData.nickname_style_id"
                      class="max-w-[220px] text-xl font-bold"
                    />
                  </div>
                  <UserRating
                    :rating="currentProfileData.rating"
                    variant="detail"
                  />
                </div>

                <div v-if="isOwner" class="relative" ref="menuContainerRef">
                  <button @click.stop="toggleMenu"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] hover:bg-[rgb(var(--palette-dark-700))] transition-colors">
                    <svg class="w-5 h-5 text-[var(--text-body)]" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="18" r="1.6" />
                    </svg>
                  </button>

                  <div v-if="showMenu"
                    class="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-800)/0.8)] backdrop-blur-sm shadow-2xl">
                    <button @click="goToSettings"
                      class="w-full rounded-t-xl flex items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] transition-colors">
                      <Settings class="w-4 h-4" />
                      <span>{{ t('pages.profile.settings') }}</span>
                    </button>
                    <button @click="goToWallet"
                      class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] transition-colors">
                      <Wallet class="w-4 h-4" />
                      <span>{{ t('pages.profile.wallet') }}</span>
                    </button>
                    <button @click.stop="openShareModal" type="button"
                      class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.5)] transition-colors">
                      <Share2 class="w-4 h-4" />
                      <span>{{ t('pages.profile.share') }}</span>
                    </button>
                    <hr class="border-[rgb(var(--palette-dark-200))]">
                    <button @click="logout"
                      class="w-full rounded-b-xl flex items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-body)] transition-colors hover:bg-[rgb(var(--palette-dark-700)/0.5)] hover:text-[var(--text-title)]">
                      <LogOut class="w-4 h-4" />
                      <span>{{ t('pages.profile.logout') }}</span>
                    </button>
                  </div>
                </div>

                <div v-else class="flex items-center gap-2">
                  <button @click="toggleSellerSubscription"
                    :disabled="isSubscriptionLoading"
                    class="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    :class="isSubscribedToSeller
                      ? 'border-[rgb(var(--palette-blue-500)/0.6)] market-primary-surface market-primary-hover text-[var(--text-accent-strong)]'
                      : 'border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] text-[var(--text-body-strong)] hover:bg-[rgb(var(--palette-dark-700))]'"
                    :title="isSubscribedToSeller ? t('pages.profile.unsubscribe') : t('pages.profile.subscribe')">
                    <Loader2 v-if="isSubscriptionLoading" class="w-3.5 h-3.5 animate-spin" />
                    <UserCheck v-else-if="isSubscribedToSeller" class="w-3.5 h-3.5" />
                    <UserPlus v-else class="w-3.5 h-3.5" />
                    <span class="text-xs font-medium">
                      {{ isSubscribedToSeller ? t('pages.profile.unsubscribe') : t('pages.profile.subscribe') }}
                    </span>
                  </button>
                  <button @click.stop="openShareModal" type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] hover:bg-[rgb(var(--palette-dark-700))] transition-colors"
                    :title="t('pages.profile.share')">
                    <Share2 class="w-4 h-4 text-[var(--text-body)]" />
                  </button>
                </div>
              </div>

              <!-- Avatar -->
              <div class="relative group">
                <div class="relative mx-auto w-32 h-32">
                  <div class="relative group">
                    <div class="relative mx-auto w-32 h-32">
                      <div
                        class="relative w-full h-full border-2 border-[rgb(var(--palette-dark-700))] rounded-full overflow-hidden bg-[rgb(var(--palette-dark-700))]"
                        @mouseenter="showAvatarEdit" @mouseleave="hideAvatarEdit">
                        <UserAvatar :avatar-url="currentProfileData.avatar_url" :alt="currentProfileData.username"
                          class="w-full h-full object-cover transition-all duration-300"
                          :class="{ 'brightness-75': showAvatarOverlay && isOwner, 'animate-pulse': isUploading }" />

                        <div v-if="showAvatarOverlay && isOwner && !isUploading"
                          class="absolute inset-0 flex items-center justify-center bg-[rgb(var(--palette-black)/0.6)] rounded-full cursor-pointer transition-all duration-300"
                          @click="triggerFileInput">
                          <div class="text-center p-4">
                            <Edit class="w-6 h-6 text-[var(--text-title)] mx-auto mb-2" />
                            <span class="text-xs font-medium text-[var(--text-title)] block">
                              {{ t('pages.profile.changePhoto') }}
                            </span>
                          </div>
                        </div>

                        <div v-if="isUploading"
                          class="absolute inset-0 flex items-center justify-center bg-[rgb(var(--palette-black)/0.4)] rounded-full">
                          <Loader />
                        </div>
                      </div>

                      <!-- Online status indicator -->
                      <div class="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[rgb(var(--palette-dark-800))]"
                        :class="currentProfileData.is_active ? 'bg-[rgb(var(--palette-green-500))]' : 'bg-[rgb(var(--palette-gray-500))]'">
                        <div v-if="currentProfileData.is_active"
                          class="w-full h-full rounded-full bg-[rgb(var(--palette-green-500))] opacity-75" />
                      </div>
                    </div>

                    <input ref="fileInputRef" type="file" :accept="SAFE_IMAGE_INPUT_ACCEPT" class="hidden"
                      @change="handleAvatarUpload" />
                  </div>
                </div>
                <input ref="fileInputRef" type="file" :accept="SAFE_IMAGE_INPUT_ACCEPT" class="hidden" @change="handleAvatarUpload" />
              </div>

              <div v-if="currentProfileData.is_banned"
                class="rounded-xl border border-[rgb(var(--palette-red-500)/0.35)] bg-[rgb(var(--palette-red-500)/0.1)] p-3 text-sm text-[var(--text-danger-soft)]">
                <div class="font-semibold">
                  {{ t('pages.profile.bannedStatus') }}
                </div>
                <div class="mt-1 text-[rgb(var(--text-danger-soft-rgb)/0.9)]">
                  {{ t('pages.profile.banReasonTitle') }}: {{ profileBanReason }}
                </div>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-3">
                <button type="button" @click="openProductsTab" :title="t('common.products')"
                  class="text-center p-3 rounded-lg bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] min-h-[76px] space-y-1">
                  <div v-if="isProductsSummaryLoading" class="flex justify-center">
                    <span class="block h-7 w-12 animate-pulse rounded-md bg-[rgb(var(--palette-white)/0.1)] blur-[0.2px]" />
                  </div>
                  <div v-else class="text-lg font-bold text-[var(--text-title)]">{{ totalProducts }}</div>
                  <div class="text-xs text-[var(--text-muted)]">{{ t('common.products') }}</div>
                </button>
                <button type="button" @click="openReviewsTab" :title="t('pages.profile.reviews')"
                  class="text-center p-3 rounded-lg bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] min-h-[76px] space-y-1">
                  <div v-if="isReviewsSummaryLoading" class="flex justify-center">
                    <span class="block h-7 w-12 animate-pulse rounded-md bg-[rgb(var(--palette-white)/0.1)] blur-[0.2px]" />
                  </div>
                  <div v-else class="text-lg font-bold text-[var(--text-title)]">{{ totalReviews }}</div>
                  <div class="text-xs text-[var(--text-muted)]">{{ t('pages.profile.reviews') }}</div>
                </button>
              </div>

              <div class="overflow-hidden rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.3)]">
                <div class="grid grid-cols-1 divide-y divide-[rgb(var(--palette-white)/0.05)]">
                  <div class="flex items-center justify-between gap-4 px-3 py-3">
                    <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <Calendar class="w-3.5 h-3.5 text-[var(--text-success-strong)]" />
                    <span>{{ t('common.lastSeen') }}</span>
                  </div>
                    <div
                    class="text-sm font-semibold text-right"
                    :class="currentProfileData.is_active ? 'text-[var(--text-success)]' : 'text-[var(--text-title)]'"
                  >
                    {{ profileLastSeenLabel }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div v-if="hasProfileDescription || isOwner" class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-[var(--text-body)]">{{ t('common.description') }}</h3>
                  <button v-if="isOwner && !isEditingDescription" @click="isEditingDescription = true"
                    class="text-xs text-[var(--text-link)] hover:text-[var(--text-link)] transition-colors flex items-center gap-1">
                    <Edit class="w-3 h-3" />
                    <span>{{ t('pages.profile.editDescription') }}</span>
                  </button>
                </div>

                <div v-if="!isEditingDescription" class="break-words text-sm leading-relaxed text-[var(--text-body)] [overflow-wrap:anywhere]">
                  <p>{{ currentProfileData.description?.trim() || t('pages.profile.descriptionMissing') }}</p>
                </div>

                <template v-else>
                  <textarea v-model="newDescription" rows="3" maxlength="200"
                    class="w-full px-3 py-2 border border-[rgb(var(--palette-dark-600))] rounded-lg bg-[rgb(var(--palette-dark-700))] text-[var(--text-title)] outline-none focus:border-[rgb(var(--palette-blue-500))] focus:ring-1 focus:ring-[rgb(var(--palette-blue-500)/0.3)] resize-none text-sm"
                    :placeholder="t('pages.profile.descriptionPlaceholder')" />
                  <div class="flex justify-end gap-2 text-xs">
                    <button @click="isEditingDescription = false"
                      class="px-3 py-1.5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700))] text-[var(--text-body)] hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-600))] transition-colors">
                      {{ t('common.cancel') }}
                    </button>
                    <button @click="updateProfileDescription(newDescription)"
                      :disabled="newDescription.trim() === (currentProfileData.description ?? '').trim()"
                      class="market-primary-surface market-primary-hover rounded-lg px-3 py-1.5 text-[var(--text-title)] transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                      {{ t('common.save') }}
                    </button>
                  </div>
                </template>
              </div>

              <!-- Balance (for owner) -->
              <div v-if="isOwner && 'balance' in currentProfileData"
                class="relative overflow-hidden rounded-xl border-[0.5px] border-[rgb(var(--palette-white)/0.3)] p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="space-y-1.5">
                    <div class="text-xs font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-accent-rgb)/0.8)]">{{ t('common.balance')
                      }}</div>
                    <div class="text-2xl font-semibold leading-none tracking-tight tabular-nums text-[var(--text-heading)]">
                      {{ formatPrice((currentProfileData as UserRead).balance) }}
                    </div>
                  </div>
                  <button @click="goToWallet"
                    class="market-primary-surface market-primary-hover flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--palette-blue-400)/0.3)] transition-colors">
                    <Wallet class="w-5 h-5 text-[var(--text-accent-strong)]" />
                  </button>
                </div>
              </div>

              <!-- Member since -->
              <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Calendar class="w-3 h-3" />
                <span>{{ t('common.memberSince') }} {{ formatFullDate(currentProfileData.created_at.toString())
                  }}</span>
              </div>

              <div v-if="isOwner" class="grid w-full grid-cols-2 gap-2">
                <button @click="router.push('/user/products/favorites')"
                  class="w-full flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700))] hover:text-[var(--text-title)] transition-all duration-200">
                  <Heart class="w-4 h-4 text-[var(--text-danger)]" />
                  <span>{{ $t('pages.profile.favorites') }}</span>
                </button>

                <button @click="router.push('/user/products/archive')"
                  class="w-full flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700))] hover:text-[var(--text-title)] transition-all duration-200">
                  <Archive class="w-4 h-4 text-[var(--text-body)]" />
                  <span>{{ $t('pages.profile.archive') }}</span>
                </button>
              </div>

              <button v-else-if="currentUser && !isProfileBanned" type="button" :disabled="isOpeningDirectChat"
                @pointerdown.stop.prevent="openDirectChat" @click.stop.prevent="openDirectChat"
                class="market-primary-surface market-primary-hover relative z-20 flex w-full items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-blue-400)/0.4)] px-4 py-3 text-sm text-[var(--text-title)] transition-all duration-200 touch-manipulation disabled:cursor-not-allowed disabled:opacity-70">
                <Loader2 v-if="isOpeningDirectChat" class="w-4 h-4 animate-spin" />
                <MessageSquare v-else class="w-4 h-4" />
                <span>{{ isOpeningDirectChat ? $t('common.loading') : $t('pages.profile.writeMessage') }}</span>
              </button>
              <p v-else-if="currentUser && isProfileBanned" class="text-xs text-[var(--text-danger)] text-center">
                {{ t('pages.profile.writeBlockedBanned') }}
              </p>
              <p v-if="directChatError" class="text-xs text-[var(--text-danger)] text-center">{{ directChatError }}</p>

              <button
                v-if="!isOwner"
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-lg border border-[rgb(var(--palette-red-700)/0.35)] bg-[rgb(var(--palette-red-950)/0.12)] px-4 py-3 text-sm font-semibold text-[var(--text-danger-soft)] transition-colors hover:border-[rgb(var(--palette-red-600)/0.55)] hover:bg-[rgb(var(--palette-red-950)/0.2)]"
                @click="openProfileReport"
              >
                <Flag class="h-4 w-4" />
                <span>{{ t('pages.profile.reportUser') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right column - Content -->
        <div class="relative z-0 lg:flex-1 overflow-y-auto  mt-6 lg:mt-0 lg:pt-6 lg:pl-6">
          <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
            <!-- Tabs -->
            <div ref="tabsRef"
              class="flex items-center gap-1 sm:gap-2 rounded-xl bg-[rgb(var(--palette-dark-700)/0.3)] p-1 border border-[rgb(var(--palette-dark-600))]">
              <button @click="switchTab('products')"
                class="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="activeTab === 'products'
                  ? 'market-btn-tab-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700)/0.5)]'">
                <div class="flex items-center justify-center gap-1 sm:gap-2 overflow-hidden">
                  <Package class="w-4 h-4 flex-shrink-0 hidden xs:block" />
                  <span class="truncate">
                    <span class="hidden sm:inline">{{ t('common.products') }}</span>
                    <span class="sm:hidden">{{ t('common.productsShort', 'Товары') }}</span>
                  </span>
                </div>
              </button>

              <button @click="switchTab('reviews')"
                class="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="activeTab === 'reviews'
                  ? 'market-btn-tab-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700)/0.5)]'">
                <div class="flex items-center justify-center gap-1 sm:gap-2 overflow-hidden">
                  <MessageSquare class="w-4 h-4 flex-shrink-0 hidden xs:block" />
                  <span class="truncate">
                    <span class="hidden sm:inline">{{ t('pages.profile.reviews') }}</span>
                    <span class="sm:hidden">{{ t('common.reviewsShort', 'Отзывы') }}</span>
                  </span>
                </div>
              </button>

              <button v-if="isOwner" @click="switchTab('purchases')"
                class="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="activeTab === 'purchases'
                  ? 'market-btn-tab-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700)/0.5)]'">
                <div class="flex items-center justify-center gap-1 sm:gap-2 overflow-hidden">
                  <ShoppingBag class="w-4 h-4 flex-shrink-0 hidden xs:block" />
                  <span class="truncate">
                    <span class="hidden sm:inline">{{ t('pages.profile.purchases') }}</span>
                    <span class="sm:hidden">{{ t('common.purchasesShort', 'Покупки') }}</span>
                  </span>
                </div>
              </button>

              <button v-if="isOwner" @click="switchTab('subscriptions')"
                class="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="activeTab === 'subscriptions'
                  ? 'market-btn-tab-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-title)] hover:bg-[rgb(var(--palette-dark-700)/0.5)]'">
                <div class="flex items-center justify-center gap-1 sm:gap-2 overflow-hidden">
                  <Users class="w-4 h-4 flex-shrink-0 hidden xs:block" />
                  <span class="truncate">
                    <span class="hidden sm:inline">{{ t('pages.profile.subscriptions') }}</span>
                    <span class="sm:hidden">{{ t('pages.profile.subscriptions') }}</span>
                  </span>
                </div>
              </button>
            </div>

            <!-- Content -->
            <div class="space-y-4">
              <!-- Products Tab -->
              <div v-if="activeTab === 'products'">
                <div v-if="isLoadingProducts && !products.length" class="w-full flex items-center justify-center py-12">
                  <Loader />
                </div>

                <div v-else-if="products.length === 0" class="text-center py-12">
                  <div
                    class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] flex items-center justify-center">
                    <Package class="w-8 h-8 text-[var(--text-meta)]" />
                  </div>
                  <h3 class="text-lg font-semibold text-[var(--text-body)] mb-2">{{ t('pages.profile.noProducts') }}</h3>
                </div>

                <div v-else class="mt-4 flex justify-end">
                  <div
                    class="inline-flex h-9 items-center gap-0.5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] p-0.5"
                    role="group" :aria-label="t('pages.index.viewSwitcherLabel')">
                    <button type="button"
                      class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
                      :class="productCardViewMode === 'grid'
                        ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                        : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'" :title="t('pages.index.viewGrid')"
                      @click="setProductCardViewMode('grid')">
                      <LayoutGrid class="h-3.5 w-3.5" />
                      <span class="hidden sm:inline">{{ t('pages.index.viewGrid') }}</span>
                    </button>

                    <button type="button"
                      class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
                      :class="productCardViewMode === 'list'
                        ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                        : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'" :title="t('pages.index.viewList')"
                      @click="setProductCardViewMode('list')">
                      <Rows3 class="h-3.5 w-3.5" />
                      <span class="hidden sm:inline">{{ t('pages.index.viewList') }}</span>
                    </button>
                  </div>
                </div>

                <div v-if="products.length && productCardViewMode === 'grid'"
                  class="profile-products-grid grid gap-1 md:gap-2 mt-6 w-full">
                  <ProfileProductCard v-for="product in products" :key="product.id" :product="product"
                    :is-owner="isOwner" hide-description @click="goToProduct" />
                </div>
                <div v-else-if="products.length" class="mt-6 w-full flex flex-col gap-2">
                  <HomeProductListCard v-for="product in products" :key="product.id" :product="product" hide-description
                    @click="goToProduct" />
                </div>

                <div v-if="currentPageProducts < totalPagesProducts" class="flex justify-center mt-6">
                  <button @click="loadMoreProducts" :disabled="isLoadingMoreProducts"
                    class="market-btn market-btn-primary rounded-lg px-6 py-3 font-medium">
                    <span v-if="isLoadingMoreProducts" class="flex items-center gap-2">
                      <Loader />
                      {{ t('common.loading') }}
                    </span>
                    <span v-else>
                      {{ t('common.loadMore') }}
                    </span>
                  </button>
                </div>
              </div>

              <!-- Reviews Tab -->
              <div v-if="activeTab === 'reviews'">
                <div v-if="isLoadingReviews && !reviews.length" class="w-full flex items-center justify-center py-12">
                  <Loader />
                </div>

                <div v-else-if="reviews.length === 0" class="text-center py-12">
                  <div
                    class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] flex items-center justify-center">
                    <MessageSquare class="w-8 h-8 text-[var(--text-meta)]" />
                  </div>
                  <h3 class="text-lg font-semibold text-[var(--text-body)] mb-2">{{ t('pages.profile.noReviews') }}</h3>
                </div>

                <div v-else class="space-y-4">
                  <div v-for="review in reviews" :key="review.id"
                    class="border border-[rgb(var(--palette-dark-700))] rounded-xl bg-[rgb(var(--palette-dark-600)/0.4)] p-4 space-y-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <button v-if="review.reviewer?.username" type="button"
                          class="group inline-flex items-center gap-2 min-w-0 rounded-lg px-1.5 py-1 transition-colors hover:bg-[rgb(var(--palette-dark-700)/0.6)]"
                          @click="goToProfile(review.reviewer.username)">
                          <UserAvatar :avatar-url="review.reviewer.avatar_url" :alt="review.reviewer.username"
                            class="w-8 h-8 rounded-full object-cover border border-[rgb(var(--palette-dark-600))] flex-shrink-0" />
                          <StyledUsername :username="review.reviewer.username"
                            :style-id="review.reviewer.nickname_style_id"
                            class="text-sm font-medium text-[var(--text-body-strong)] group-hover:text-[var(--text-title)] truncate" />
                        </button>

                        <UserRating :rating="review.rating" />
                      </div>

                      <span class="text-sm text-[var(--text-muted)] whitespace-nowrap">{{ formatFullDate(review.created_at)
                        }}</span>
                    </div>

                    <p v-if="review.body?.trim()" class="text-sm leading-relaxed text-[var(--text-body)]">{{ review.body }}</p>
                  </div>

                  <div v-if="currentPageReviews < totalPagesReviews" class="flex justify-center mt-6">
                    <button @click="loadMoreReviews" :disabled="isLoadingMoreReviews"
                      class="market-btn market-btn-primary rounded-lg px-6 py-3 font-medium">
                      <span v-if="isLoadingMoreReviews" class="flex items-center gap-2">
                        <Loader />
                        {{ t('common.loading') }}
                      </span>
                      <span v-else>
                        {{ t('common.loadMore') }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Purchases Tab -->
              <div v-if="activeTab === 'purchases'">
                <div v-if="isLoadingPurchases && !purchases.length"
                  class="w-full flex items-center justify-center py-12">
                  <Loader />
                </div>

                <div v-else-if="purchases.length === 0" class="text-center py-12">
                  <div
                    class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] flex items-center justify-center">
                    <ShoppingBag class="w-8 h-8 text-[var(--text-meta)]" />
                  </div>
                  <h3 class="text-lg font-semibold text-[var(--text-body)] mb-2">{{ t('pages.profile.noPurchases') }}</h3>
                </div>

                <div v-else class="space-y-4">
                  <div v-for="deal in purchases" :key="deal.id"
                    class="border border-[rgb(var(--palette-dark-700))] rounded-xl bg-[rgb(var(--palette-dark-600)/0.4)] p-4 space-y-4 hover:border-[rgb(var(--palette-blue-500)/0.3)] transition-all duration-200">
                    <!-- Верхняя строка: цена и дата -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div class="space-y-1">
                        <div class="text-lg font-bold text-[var(--text-success-strong)] whitespace-nowrap">{{ formatPrice(deal.price) }}
                        </div>
                        <div class="text-xs text-[var(--text-muted)] whitespace-nowrap">{{ formatFullDate(deal.created_at) }}</div>
                      </div>

                      <!-- Продавец и покупатель - теперь в отдельной строке на мобильных -->
                      <div class="flex flex-col xs:flex-row gap-2">
                        <div @click="goToProfile(deal.seller.username)"
                          class="market-primary-surface market-primary-hover cursor-pointer truncate rounded-lg px-2 py-1.5 text-center text-xs text-[var(--text-link)] transition-colors"
                          :title="`${t('common.seller')}: ${deal.seller.username}`">
                          <span class="hidden sm:inline">{{ t('common.seller') }}: </span>
                          <span class="truncate">{{ deal.seller.username }}</span>
                        </div>
                        <div @click="goToProfile(deal.buyer.username)"
                          class="cursor-pointer truncate rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-2 py-1.5 text-center text-xs text-[var(--text-body-strong)] transition-colors hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]"
                          :title="`${t('common.buyer')}: ${deal.buyer.username}`">
                          <span class="hidden sm:inline">{{ t('common.buyer') }}: </span>
                          <span class="truncate">{{ deal.buyer.username }}</span>
                        </div>
                      </div>

                      <button v-if="deal.chat_room_id" @click.stop="goToChat(deal.chat_room_id)"
                        class="market-btn market-btn-primary rounded-lg px-3 py-2 text-xs">
                        <MessageSquare class="w-4 h-4" />
                        <span>{{ t('common.toChat') }}</span>
                      </button>
                    </div>

                    <!-- Карточка товара -->
                    <div @click="goToProduct(buildProductKey(deal.product))"
                      class="flex gap-4 p-3 rounded-lg bg-[rgb(var(--palette-dark-700)/0.5)] hover:bg-[rgb(var(--palette-dark-700))] transition-colors cursor-pointer">
                      <div class="flex-shrink-0">
                        <img :src="deal.product.images[0] ? `${API_HOST}${deal.product.images[0].image_url}` : ''"
                          class="w-16 h-16 rounded-lg object-cover" :alt="deal.product.title" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-semibold text-[var(--text-title)] truncate mb-1">{{ deal.product.title }}</h3>
                        <p class="text-xs text-[var(--text-muted)] line-clamp-2">{{ deal.product.description }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Кнопка загрузки еще -->
                  <div v-if="currentPagePurchases < totalPagesPurchases" class="flex justify-center mt-6">
                    <button @click="loadMorePurchases" :disabled="isLoadingMorePurchases"
                      class="market-btn market-btn-primary rounded-lg px-6 py-3 font-medium">
                      <span v-if="isLoadingMorePurchases" class="flex items-center gap-2">
                        <Loader />
                        {{ t('common.loading') }}
                      </span>
                      <span v-else>
                        {{ t('common.loadMore') }}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="activeTab === 'subscriptions'">
                <div v-if="isLoadingSubscriptions" class="w-full flex items-center justify-center py-12">
                  <Loader />
                </div>

                <div v-else-if="subscriptions.length === 0" class="text-center py-12">
                  <div
                    class="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgb(var(--palette-dark-700)/0.5)] border border-[rgb(var(--palette-dark-600))] flex items-center justify-center">
                    <Users class="w-8 h-8 text-[var(--text-meta)]" />
                  </div>
                  <h3 class="text-lg font-semibold text-[var(--text-body)] mb-2">{{ t('pages.profile.noSubscriptions') }}</h3>
                </div>

                <div v-else class="space-y-3">
                  <button v-for="seller in subscriptions" :key="seller.id" type="button"
                    class="w-full border border-[rgb(var(--palette-dark-700))] rounded-xl bg-[rgb(var(--palette-dark-600)/0.4)] p-4 flex items-center justify-between hover:border-[rgb(var(--palette-blue-500)/0.3)] transition-all duration-200"
                    @click="goToProfile(seller.username)">
                    <div class="flex items-center gap-3 min-w-0">
                      <UserAvatar :avatar-url="seller.avatar_url" :alt="seller.username"
                        class="w-10 h-10 rounded-full object-cover border border-[rgb(var(--palette-dark-600))] flex-shrink-0" />
                      <div class="min-w-0 text-left">
                        <StyledUsername :username="seller.username" :style-id="seller.nickname_style_id"
                          class="text-sm font-medium text-[var(--text-body-strong)] truncate" />
                        <div class="text-xs mt-1" :class="seller.is_active ? 'text-[var(--text-success-strong)]' : 'text-[var(--text-muted)]'">
                          {{ seller.is_active ? t('common.online') : t('common.offline') }}
                        </div>
                      </div>
                    </div>
                    <Users class="w-4 h-4 text-[var(--text-meta)] flex-shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppModal
        :is-open="showShareModal"
        :title="t('pages.profile.shareProfile')"
        size="sm"
        body-class="space-y-5"
        @cancel="closeShareModal"
      >
        <div class="flex flex-col items-center space-y-4">
          <div class="profile-qr-card rounded-2xl bg-[rgb(var(--palette-white))] p-4">
            <QrcodeVue :value="profileUrl" :size="180" level="H" />
          </div>
          <p class="text-center text-sm text-[var(--text-body)]">{{ t('pages.profile.scanQR') }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--text-body)]">{{ t('pages.profile.profileLink') }}</label>
          <div class="space-y-2">
            <div class="w-full min-w-0">
              <input
                type="text"
                :value="profileUrl"
                readonly
                class="w-full min-w-0 rounded-xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-sm text-[var(--text-title)] outline-none"
              />
            </div>
            <button
              @click="copyProfileLink"
              class="market-btn w-full rounded-xl px-4 py-3 text-sm"
              :class="isCopied ? 'market-btn-secondary text-[var(--text-title)]' : 'market-btn-primary text-mainText'"
            >
              <Check v-if="isCopied" class="w-4 h-4" />
              <Copy v-else class="w-4 h-4" />
              {{ isCopied ? t('common.copied') : t('common.copy') }}
            </button>
          </div>
        </div>
      </AppModal>

      <ReportComplaintModal
        v-if="currentProfileData && !isOwner"
        :is-open="showComplaintModal"
        target-type="user"
        :target-id="currentProfileData.id"
        :target-label="currentProfileData.username"
        :target-url="profileUrl"
        @close="closeComplaintModal"
      />

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

.profile-qr-card {
  box-shadow: 0 20px 50px rgb(var(--palette-black) / 0.2);
}

.profile-products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 359px) {
  .profile-products-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) and (max-width: 1299px) {
  .profile-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1300px) and (max-width: 1535px) {
  .profile-products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1536px) and (max-width: 1799px) {
  .profile-products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1800px) and (max-width: 1999px) {
  .profile-products-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 2100px) {
  .profile-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
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
