<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import { productService } from '@/api/product/ProductService'
import { profileService } from '@/api/profile/ProfileService'
import { reviewService } from '@/api/review/ReviewService'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/validation/product/product'
import type { PublicProfileData, UserRead } from '@/validation/user/userRead'
import type { ReviewSchema } from '@/validation/review/review'
import { Settings, LogOut, Share2, Copy, Check, Wallet, Heart, Edit, Calendar, Star, Package, ShoppingBag, MessageSquare, Award, TrendingUp } from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import type { Deal } from '@/validation/deal/deal'
import UserRating from '@/components/UserRating.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const { t } = useI18n()
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
const shareModalRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const showAvatarOverlay = ref(false)
const showShareModal = ref(false)
const isCopied = ref(false)

const isOwner = computed(() => currentUser.value?.username === username.value)
const profileUrl = computed(() => `${window.location.origin}/user/${username.value}`)
const activeTab = ref<'products' | 'reviews' | 'purchases'>('products')

// Пагинация для товаров
const products = ref<Product[]>([])
const currentPageProducts = ref(1)
const totalPagesProducts = ref(1)
const perPage = ref(20)
const isLoadingProducts = ref(false)
const isLoadingMoreProducts = ref(false)

// Пагинация для отзывов
const reviews = ref<ReviewSchema[]>([])
const currentPageReviews = ref(1)
const totalPagesReviews = ref(1)
const isLoadingReviews = ref(false)
const isLoadingMoreReviews = ref(false)

// Пагинация для покупок
const purchases = ref<Deal[]>([])
const currentPagePurchases = ref(1)
const totalPagesPurchases = ref(1)
const isLoadingPurchases = ref(false)
const isLoadingMorePurchases = ref(false)

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(useI18n().locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatPrice(price: number) {
  return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₽'
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
    totalPagesProducts.value = res.totalPages
  } catch (error) {
    console.error('Failed to load user products:', error)
  } finally {
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
    totalPagesReviews.value = res.totalPages
  } catch (error) {
    console.error('Failed to load reviews:', error)
  } finally {
    isLoadingReviews.value = false
    isLoadingMoreReviews.value = false
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
  } catch (error) {
    console.error('Failed to load purchases:', error)
  } finally {
    isLoadingPurchases.value = false
    isLoadingMorePurchases.value = false
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
  if (showShareModal.value && shareModalRef.value && !shareModalRef.value.contains(event.target as Node)) closeShareModal()
}

function triggerFileInput() { if (isOwner.value && fileInputRef.value) fileInputRef.value.click() }

async function handleAvatarUpload(event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (!file || !isOwner.value || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return
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
  setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
}

function closeShareModal() { showShareModal.value = false; document.removeEventListener('click', handleClickOutside) }

async function copyProfileLink() {
  try { await navigator.clipboard.writeText(profileUrl.value); isCopied.value = true }
  catch { const ta = document.createElement('textarea'); ta.value = profileUrl.value; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); isCopied.value = true }
  setTimeout(() => isCopied.value = false, 2000)
}

function switchTab(tab: 'products' | 'reviews' | 'purchases') {
  activeTab.value = tab
  if (tab === 'products' && products.value.length === 0) {
    loadUserProducts()
  }
  if (tab === 'reviews' && reviews.value.length === 0) {
    loadReviews()
  }
  if (tab === 'purchases' && purchases.value.length === 0) {
    loadPurchases()
  }
}

function goToProduct(productId: string) { router.push(`/product/${productId}`) }
function goToProfile(username: string) { router.push(`/user/${username}`) }

onMounted(async () => {
  const profileLoaded = await loadProfileData()
  if (profileLoaded) {
    await loadUserProducts()
  }
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="w-full h-full overflow-scroll lg:overflow-hidden pb-16 md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.profile.title') }}
        </h1>
      </div>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
      <!-- Left column - Profile info -->
      <div
        class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:min-h-[calc(100dvh-3.5rem)] lg:border-r border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pr-6">
        <div class="space-y-6">
          <!-- Desktop header -->
          <div class="hidden lg:block">
            <div class="flex gap-2">
              <BackButton />
              <h1 class="text-2xl font-bold text-white">
                {{ $t('pages.profile.title') }}
              </h1>
            </div>
          </div>

          <!-- Profile card -->
          <div v-if="!currentProfileData" class="flex h-full items-center justify-center">
            <Loader />
          </div>

          <div v-else class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-6">
            <!-- Profile header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-white truncate">{{ currentProfileData.username }}</h2>
                <div v-if="currentProfileData.rating > 0" class="flex items-center gap-2">
                  <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-400/30">
                    <Star class="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span class="text-sm font-semibold text-yellow-200">{{ currentProfileData.rating }}</span>
                  </div>
                  <span class="text-[11px] text-gray-400 whitespace-nowrap">
                    {{ $t('pages.profile.ratingPeriodShort') }}
                  </span>
                </div>
              </div>

              <div v-if="isOwner" class="relative" ref="menuContainerRef">
                <button @click.stop="toggleMenu"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-colors">
                  <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="6" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="12" cy="18" r="1.6" />
                  </svg>
                </button>

                <div v-if="showMenu"
                  class="absolute right-0 z-10 mt-2 w-48 border border-dark-600 rounded-xl bg-dark-800/80 backdrop-blur-sm shadow-2xl">
                  <button @click="goToSettings"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-dark-700/50 transition-colors">
                    <Settings class="w-4 h-4" />
                    <span>{{ t('pages.profile.settings') }}</span>
                  </button>
                  <button @click="goToWallet"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-dark-700/50 transition-colors">
                    <Wallet class="w-4 h-4" />
                    <span>{{ t('pages.profile.wallet') }}</span>
                  </button>
                  <button @click="openShareModal"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-dark-700/50 transition-colors">
                    <Share2 class="w-4 h-4" />
                    <span>{{ t('pages.profile.share') }}</span>
                  </button>
                  <div class="h-px bg-dark-600 my-2"></div>
                  <hr class="border-dark-200">
                  <button @click="logout"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-dark-700/50 transition-colors">
                    <LogOut class="w-4 h-4" />
                    <span>{{ t('pages.profile.logout') }}</span>
                  </button>
                </div>
              </div>

              <button v-else @click="openShareModal"
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-colors"
                :title="t('pages.profile.share')">
                <Share2 class="w-4 h-4 text-gray-300" />
              </button>
            </div>

            <!-- Avatar -->
            <div class="relative group">
              <div class="relative mx-auto w-32 h-32">
                <div
                  class="relative w-full h-full border-2 border-dark-700 rounded-full overflow-hidden bg-dark-700"
                  @mouseenter="showAvatarEdit" @mouseleave="hideAvatarEdit">
                  <UserAvatar
                    :avatar-url="currentProfileData.avatar_url"
                    :alt="currentProfileData.username"
                    class="w-full h-full object-cover transition-all duration-300"
                    :class="{ 'brightness-75': showAvatarOverlay && isOwner, 'animate-pulse': isUploading }"
                  />

                  <div v-if="showAvatarOverlay && isOwner && !isUploading"
                    class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer transition-all duration-300"
                    @click="triggerFileInput">
                    <div class="text-center p-4">
                      <Edit class="w-6 h-6 text-white mx-auto mb-2" />
                      <span class="text-xs font-medium text-white block">{{ t('pages.profile.changePhoto') }}</span>
                    </div>
                  </div>

                  <div v-if="isUploading"
                    class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                    <Loader />
                  </div>
                </div>
              </div>
              <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="text-center p-3 rounded-lg bg-dark-700/50 border border-dark-600 min-h-[76px] space-y-1">
                <div class="text-lg font-bold text-white">{{ products.length }}</div>
                <div class="text-xs text-gray-400">{{ t('common.products') }}</div>
              </div>
              <div class="text-center p-3 rounded-lg bg-dark-700/50 border border-dark-600 min-h-[76px] space-y-1">
                <div class="text-lg font-bold text-white">{{ reviews.length }}</div>
                <div class="text-xs text-gray-400">{{ t('pages.profile.reviews') }}</div>
              </div>
              <div class="text-center p-3 rounded-lg bg-dark-700/50 border border-dark-600 min-h-[76px] space-y-1">
                <div class="text-lg font-bold text-white">{{ currentProfileData.rating }}</div>
                <div class="text-xs text-gray-400">{{ t('common.rating') }}</div>
              </div>
            </div>

            <!-- Description -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-300">{{ t('common.description') }}</h3>
                <button v-if="isOwner && !isEditingDescription" @click="isEditingDescription = true"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                  <Edit class="w-3 h-3" />
                  <span>{{ t('pages.profile.editDescription') }}</span>
                </button>
              </div>

              <div v-if="!isEditingDescription" class="text-sm text-gray-300 leading-relaxed">
                <p>{{ currentProfileData.description || t('pages.profile.descriptionMissing') }}</p>
              </div>

              <template v-else>
                <textarea v-model="newDescription" rows="3" maxlength="200"
                  class="w-full px-3 py-2 border border-dark-600 rounded-lg bg-dark-700 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none text-sm"
                  :placeholder="t('pages.profile.descriptionPlaceholder')" />
                <div class="flex justify-end gap-2 text-xs">
                  <button @click="isEditingDescription = false"
                    class="px-3 py-1.5 rounded-lg border border-dark-600 bg-dark-700 text-gray-300 hover:text-white hover:bg-dark-600 transition-colors">
                    {{ t('common.cancel') }}
                  </button>
                  <button @click="updateProfileDescription(newDescription)"
                    :disabled="!newDescription.trim() || newDescription === currentProfileData.description"
                    class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ t('common.save') }}
                  </button>
                </div>
              </template>
            </div>

            <!-- Balance (for owner) -->
            <div v-if="isOwner && 'balance' in currentProfileData"
              class="rounded-lg bg-gradient-to-r from-blue-900/30 to-cyan-900/20 border border-blue-800/30 p-4">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <div class="text-sm text-blue-300 font-medium">{{ t('common.balance') }}</div>
                  <div class="text-2xl font-bold text-green-400">{{ (currentProfileData as UserRead).balance.toFixed(2)
                    }}₽</div>
                </div>
                <button @click="goToWallet"
                  class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-colors">
                  <Wallet class="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <!-- Member since -->
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <Calendar class="w-3 h-3" />
              <span>{{ t('common.memberSince') }} {{ formatFullDate(currentProfileData.created_at.toString()) }}</span>
            </div>

            <!-- Favorites button -->
            <button v-if="isOwner" @click="router.push('/user/products/favorites')"
              class="w-full flex items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700/50 px-4 py-3 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-all duration-200">
              <Heart class="w-4 h-4 text-red-400" />
              <span>{{ $t('pages.profile.favorites') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right column - Content -->
      <div class="lg:flex-1 overflow-y-auto  mt-6 lg:mt-0 lg:pt-6 lg:pl-6">
        <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
          <!-- Tabs -->
          <div class="flex items-center gap-1 sm:gap-2 rounded-xl bg-dark-700/30 p-1 border border-dark-600">
            <button @click="switchTab('products')"
              class="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              :class="activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-dark-700/50'">
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
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-dark-700/50'">
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
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-dark-700/50'">
              <div class="flex items-center justify-center gap-1 sm:gap-2 overflow-hidden">
                <ShoppingBag class="w-4 h-4 flex-shrink-0 hidden xs:block" />
                <span class="truncate">
                  <span class="hidden sm:inline">{{ t('pages.profile.purchases') }}</span>
                  <span class="sm:hidden">{{ t('common.purchasesShort', 'Покупки') }}</span>
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
                  class="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
                  <Package class="w-8 h-8 text-gray-500" />
                </div>
                <h3 class="text-lg font-semibold text-gray-300 mb-2">{{ t('pages.profile.noProducts') }}</h3>
              </div>

              <div v-else class="grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 gap-4">
                <div v-for="product in products" :key="product.id"
                  class="group relative border border-dark-700 rounded-xl bg-dark-600/40 hover:bg-dark-600/60 transition-all duration-200 hover:border-blue-500/30 overflow-hidden"
                  @click="router.push(`/product/${product.id}`)">
                  <div class="aspect-square relative overflow-hidden">
                    <img v-if="product.images?.[0]" :src="`${API_HOST}${product.images[0].image_url}`"
                      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      :alt="product.title" />
                    <div v-else class="w-full h-full flex items-center justify-center bg-dark-700">
                      <Package class="w-12 h-12 text-gray-500" />
                    </div>

                    <div class="absolute top-3 right-3">
                      <ProductStatusTag v-if="product.is_owner" :product-status="product.status" />
                    </div>

                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <span class="text-lg font-bold text-white">{{ product.price }}₽</span>
                    </div>
                  </div>

                  <div class="p-4 space-y-2">
                    <h3 class="text-sm font-semibold text-white truncate">{{ product.title }}</h3>
                    <p class="text-xs text-gray-400 line-clamp-2">{{ product.description }}</p>

                    <div class="flex items-center justify-between pt-2">
                      <div class="text-xs text-gray-400">
                        {{ formatFullDate(product.created_at) }}
                      </div>
                      <div v-if="product.is_sold" class="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                        {{ t('common.sold') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="currentPageProducts < totalPagesProducts" class="flex justify-center mt-6">
                <button @click="loadMoreProducts" :disabled="isLoadingMoreProducts"
                  class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
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
                  class="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
                  <MessageSquare class="w-8 h-8 text-gray-500" />
                </div>
                <h3 class="text-lg font-semibold text-gray-300 mb-2">{{ t('pages.profile.noReviews') }}</h3>
              </div>

              <div v-else class="space-y-4">
                <div v-for="review in reviews" :key="review.id"
                  class="border border-dark-700 rounded-xl bg-dark-600/40 p-4 space-y-3">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <UserRating :rating="review.rating" />
                      <span class="text-sm text-gray-400">{{ formatFullDate(review.created_at) }}</span>
                    </div>
                  </div>

                  <p class="text-sm text-gray-300 leading-relaxed">{{ review.body }}</p>
                </div>

                <div v-if="currentPageReviews < totalPagesReviews" class="flex justify-center mt-6">
                  <button @click="loadMoreReviews" :disabled="isLoadingMoreReviews"
                    class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
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
              <div v-if="isLoadingPurchases && !purchases.length" class="w-full flex items-center justify-center py-12">
                <Loader />
              </div>

              <div v-else-if="purchases.length === 0" class="text-center py-12">
                <div
                  class="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
                  <ShoppingBag class="w-8 h-8 text-gray-500" />
                </div>
                <h3 class="text-lg font-semibold text-gray-300 mb-2">{{ t('pages.profile.noPurchases') }}</h3>
              </div>

              <div v-else class="space-y-4">
                <div v-for="deal in purchases" :key="deal.id"
                  class="border border-dark-700 rounded-xl bg-dark-600/40 p-4 space-y-4 hover:border-blue-500/30 transition-all duration-200">
                  <!-- Верхняя строка: цена и дата -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-lg font-bold text-green-400 whitespace-nowrap">{{ formatPrice(deal.price) }}
                      </div>
                      <div class="text-xs text-gray-400 whitespace-nowrap">{{ formatFullDate(deal.created_at) }}</div>
                    </div>

                    <!-- Продавец и покупатель - теперь в отдельной строке на мобильных -->
                    <div class="flex flex-col xs:flex-row gap-2">
                      <div @click="goToProfile(deal.seller.username)"
                        class="text-xs px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors cursor-pointer truncate text-center"
                        :title="`${t('common.seller')}: ${deal.seller.username}`">
                        <span class="hidden sm:inline">{{ t('common.seller') }}: </span>
                        <span class="truncate">{{ deal.seller.username }}</span>
                      </div>
                      <div @click="goToProfile(deal.buyer.username)"
                        class="text-xs px-2 py-1.5 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors cursor-pointer truncate text-center"
                        :title="`${t('common.buyer')}: ${deal.buyer.username}`">
                        <span class="hidden sm:inline">{{ t('common.buyer') }}: </span>
                        <span class="truncate">{{ deal.buyer.username }}</span>
                      </div>
                    </div>

                    <button
                      v-if="deal.chat_room_id"
                      @click.stop="goToChat(deal.chat_room_id)"
                      class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      <MessageSquare class="w-4 h-4" />
                      <span>{{ t('common.toChat') }}</span>
                    </button>
                  </div>

                  <!-- Карточка товара -->
                  <div @click="goToProduct(deal.product.id)"
                    class="flex gap-4 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors cursor-pointer">
                    <div class="flex-shrink-0">
                      <img :src="deal.product.images[0] ? `${API_HOST}${deal.product.images[0].image_url}` : ''"
                        class="w-16 h-16 rounded-lg object-cover" :alt="deal.product.title" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-semibold text-white truncate mb-1">{{ deal.product.title }}</h3>
                      <p class="text-xs text-gray-400 line-clamp-2">{{ deal.product.description }}</p>
                    </div>
                  </div>
                </div>

                <!-- Кнопка загрузки еще -->
                <div v-if="currentPagePurchases < totalPagesPurchases" class="flex justify-center mt-6">
                  <button @click="loadMorePurchases" :disabled="isLoadingMorePurchases"
                    class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
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
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <Teleport to="body">
      <div v-if="showShareModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div ref="shareModalRef"
          class="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto border border-dark-600 rounded-2xl bg-dark-800/95 backdrop-blur-sm p-4 sm:p-6 space-y-6"
          @click.stop>
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-white">{{ t('pages.profile.shareProfile') }}</h3>
            <button @click="closeShareModal"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-gray-300">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div class="flex flex-col items-center space-y-4">
              <div class="bg-white p-4 rounded-xl">
                <QrcodeVue :value="profileUrl" :size="180" level="H" />
              </div>
              <p class="text-sm text-gray-300 text-center">{{ t('pages.profile.scanQR') }}</p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">{{ t('pages.profile.profileLink') }}</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <div class="w-full min-w-0 flex-1">
                  <input type="text" :value="profileUrl" readonly
                    class="w-full min-w-0 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-sm text-white outline-none" />
                </div>
                <button @click="copyProfileLink"
                  class="w-full sm:w-auto sm:flex-shrink-0 rounded-lg border border-transparent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                  :class="isCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-button-main hover:bg-blue-700'">
                  <Check v-if="isCopied" class="w-4 h-4" />
                  <Copy v-else class="w-4 h-4" />
                  {{ isCopied ? t('common.copied') : t('common.copy') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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
