<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import { productService } from '@/api/product/ProductService'
import { profileService } from '@/api/profile/ProfileService'
import { reviewService } from '@/api/review/ReviewService'
import Loader from '@/components/Loader.vue'
import ProfileProductCard from '@/components/ProfileProductCard.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/validation/product/product'
import type { PublicProfileData, UserRead } from '@/validation/user/userRead'
import type { ReviewSchema } from '@/validation/review/review'
import { Settings, LogOut, Share2, Copy, Check, Wallet, Heart } from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import type { Deal } from '@/validation/deal/deal'
import UserRating from '@/components/UserRating.vue'
import BackButton from '@/components/navigation/BackButton.vue'

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

const isLoading = ref(true)
const isOwner = computed(() => currentUser.value?.username === username.value)
const profileUrl = computed(() => `${window.location.origin}/profile/${username.value}`)
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
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₽'
}

async function loadProfileData() {
  try {
    const data = await profileService.getUserProfileData(username.value)
    profileData.value = data
    currentProfileData.value = data
    newDescription.value = data?.description ?? ''
    return true
  } catch (error: any) {
    console.error('Profile load error:', error)
    router.push(error.response?.status === 404 ? '/404' : '/error')
    return false
  }
}

// Функция загрузки товаров (оставляем как есть)
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

// Функция загрузки отзывов с пагинацией
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

// Функция загрузки покупок с пагинацией
async function loadPurchases(page = 1, append = false) {
  if (!isOwner.value) return
  if (isLoadingMorePurchases.value) return
  if (page > totalPagesPurchases.value) return

  isLoadingMorePurchases.value = true
  isLoadingPurchases.value = true

  try {
    // Обновляем сервис чтобы он принимал параметры пагинации
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

// Функции для подгрузки следующей страницы
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
  <div class="h-full w-full flex flex-col items-center justify-center lg:pt-6">
    <div v-if="!currentProfileData" class="flex h-full w-full items-center justify-center">
      <Loader />
    </div>

    <section v-else-if="currentProfileData"
      class="h-full w-full flex flex-col gap-6 text-mainText lg:flex-row overflow-scroll lg:overflow-hidden no-scrollbar">
      <div class="w-full h-full border border-dark-600 rounded-lg p-6 lg:max-w-sm space-y-4">
        <div class="flex flex-col items-center text-center">
          <div class="w-full flex items-center justify-between">
            <h1 class="truncate text-lg font-semibold sm:text-xl">{{ currentProfileData.username }}</h1>
            <div v-if="isOwner" class="relative" ref="menuContainerRef">
              <button class="text-gray-300 hover:text-mainText" @click.stop="toggleMenu">
                <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="18" r="1.6" />
                </svg>
              </button>
              <div v-if="showMenu"
                class="absolute right-0 z-10 mt-2 w-40 border border-dark-600 rounded-lg bg-dark-800 shadow-lg">
                <button
                  class="w-full flex items-center gap-1 px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700"
                  @click="goToSettings">
                  <Settings class="w-4 h-4" /> {{ t('pages.profile.settings') }}
                </button>
                <button
                  class="w-full flex items-center gap-1 px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700"
                  @click="goToWallet">
                  <Wallet class="w-4 h-4" /> {{ t('pages.profile.wallet') }}
                </button>
                <button
                  class="w-full flex items-center gap-1 px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700"
                  @click="openShareModal">
                  <Share2 class="w-4 h-4" /> {{ t('pages.profile.share') }}
                </button>
                <button
                  class="w-full flex items-center gap-1 px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-700"
                  @click="logout">
                  <LogOut class="w-4 h-4" /> {{ t('pages.profile.logout') }}
                </button>
              </div>
            </div>
            <div v-else class="relative">
              <button class="text-gray-300 hover:text-mainText transition-colors" @click="openShareModal"
                :title="t('pages.profile.share')">
                <Share2 class="h-6 w-6" />
              </button>
            </div>
          </div>

          <div class="relative mt-4 group" @mouseenter="showAvatarEdit" @mouseleave="hideAvatarEdit">
            <div class="relative">
              <img v-if="currentProfileData.avatar_url" :src="`${API_HOST}${currentProfileData.avatar_url}`"
                class="h-36 w-36 border-2 border-dark-600 rounded-full object-cover transition-all duration-300"
                :class="{ 'brightness-75': showAvatarOverlay && isOwner, 'animate-pulse': isUploading }" alt="Avatar" />
              <div v-else
                class="h-36 w-36 flex items-center justify-center border-2 border-dark-600 rounded-full bg-dark-800 transition-all duration-300"
                :class="{ 'brightness-75': showAvatarOverlay && isOwner, 'animate-pulse': isUploading }">
                <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div v-if="showAvatarOverlay && isOwner && !isUploading"
                class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer transition-opacity duration-300"
                @click="triggerFileInput">
                <div class="text-white text-center">
                  <svg class="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="text-xs font-medium">{{ t('pages.profile.changePhoto') }}</span>
                </div>
              </div>
              <div v-if="isUploading"
                class="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <Loader />
              </div>
            </div>
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </div>

          <div class="mt-4 text-xs text-gray-300 sm:text-sm w-full">
            <template v-if="!isEditingDescription">
              <p>{{ currentProfileData.description || t('pages.profile.descriptionMissing') }}</p>
              <button v-if="isOwner" class="mt-1 text-xs text-blue-400 hover:underline"
                @click="isEditingDescription = true">{{ t('pages.profile.editDescription') }}</button>
            </template>
            <template v-else>
              <textarea v-model="newDescription" rows="3" maxlength="200"
                class="w-full border max-h-28 border-gray-600 rounded bg-dark-900 p-2 text-xs text-mainText outline-none"
                :placeholder="t('pages.profile.descriptionPlaceholder')" />
              <div class="mt-2 flex justify-end gap-2 text-xs">
                <button class="text-gray-400 hover:underline" @click="isEditingDescription = false">{{
                  t('common.cancel') }}</button>
                <button class="text-green-400 hover:underline"
                  :disabled="!newDescription.trim() || newDescription === currentProfileData.description"
                  @click="updateProfileDescription(newDescription)">{{ t('common.save') }}</button>
              </div>
            </template>
          </div>

          <div v-if="isOwner" class="mt-4 text-sm sm:text-base flex">
            <p v-if="'balance' in currentProfileData">{{ t('common.balance') }}: <span class="text-green-400">{{
              (currentProfileData as UserRead).balance.toFixed(2) }}₽</span></p>
            <Wallet class="mx-3 w-4 cursor-pointer" @click="router.push('/wallet')" />
          </div>

          <div class="text-xs mt-2 flex gap-2">
            <UserRating :rating="currentProfileData.rating" />
            <p class=" text-gray-400 sm:text-sm">{{
              t('common.memberSince') }} {{ formatFullDate(currentProfileData.created_at.toString()) }}
            </p>
          </div>
        </div>
        <button v-if="isOwner" @click="router.push('/user/products/favorites')" class="mt-4 w-full flex items-center justify-center gap-2 rounded-lg
         border border-dark-600 bg-dark-800 px-4 py-2
         text-sm text-gray-300
         hover:bg-dark-700 hover:text-white
         transition-colors">
          <Heart class="w-4 h-4 text-red-400" />
          <span>{{ $t('pages.profile.favorites') }}</span>
        </button>

      </div>

      <div
        class="w-full h-max-content lg:h-full flex flex-col border border-dark-600 rounded-lg space-y-4 lg:overflow-hidden">
        <div class="w-full flex">
          <button class="flex-1 hover:bg-dark-500 transition py-4 rounded"
            :class="{ 'bg-dark-700': activeTab === 'products' }" @click="switchTab('products')">{{ t('common.products')
            }}</button>
          <button class="flex-1 hover:bg-dark-500 transition py-4 rounded"
            :class="{ 'bg-dark-700': activeTab === 'reviews' }" @click="switchTab('reviews')">{{
              t('pages.profile.reviews') }}</button>
          <button v-if="isOwner" class="flex-1 hover:bg-dark-500 transition py-4 rounded"
            :class="{ 'bg-dark-700': activeTab === 'purchases' }" @click="switchTab('purchases')">{{
              t('pages.profile.purchases') }}</button>
        </div>

        <div class="w-full flex-1 overflow-scroll no-scrollbar">
          <div class="p-4 pb-8">
            <!-- Products Tab -->
            <div v-if="activeTab === 'products'">
              <div v-if="isLoadingProducts && !products.length" class="w-full flex items-center justify-center py-6">
                <Loader />
              </div>
              <div v-else-if="products.length === 0"
                class="w-full flex items-center justify-center py-6 text-text-secondaryDark">
                {{ t('pages.profile.noProducts') }}</div>
              <div v-else>
                <div v-for="product in products" :key="product.id"
                  class="w-full border-b border-dark-600 hover:bg-dark-800/50 transition">
                  <ProfileProductCard :product="product" :is-owner="isOwner" />
                </div>

                <div v-if="currentPageProducts < totalPagesProducts" class="flex justify-center mt-4">
                  <button class="px-6 py-2 bg-blue-600 rounded-lg text-white" :disabled="isLoadingMoreProducts"
                    @click="loadMoreProducts">
                    {{ isLoadingMoreProducts ? t('common.loading') : t('common.loadMore') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Reviews Tab -->
            <div v-if="activeTab === 'reviews'">
              <div v-if="isLoadingReviews && !reviews.length" class="w-full flex items-center justify-center py-6">
                <Loader />
              </div>
              <div v-else-if="reviews.length === 0"
                class="w-full flex items-center justify-center py-6 text-text-secondaryDark">{{
                  t('pages.profile.noReviews')
                }}</div>
              <div v-else class="flex flex-col gap-4">
                <div v-for="review in reviews" :key="review.id"
                  class="p-4 rounded-lg bg-gray-800/20 border border-gray-700">
                  <div class="flex justify-between items-center">
                    <UserRating :rating="review.rating" />
                    <span class="text-xs text-gray-400">{{ formatFullDate(review.created_at) }}</span>
                  </div>
                  <p class="mt-2 text-sm">{{ review.body }}</p>
                </div>

                <div v-if="currentPageReviews < totalPagesReviews" class="flex justify-center mt-4">
                  <button class="px-6 py-2 bg-blue-600 rounded-lg text-white" :disabled="isLoadingMoreReviews"
                    @click="loadMoreReviews">
                    {{ isLoadingMoreReviews ? t('common.loading') : t('common.loadMore') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Purchases Tab -->
            <div v-if="activeTab === 'purchases'">
              <div v-if="isLoadingPurchases && !purchases.length" class="w-full flex items-center justify-center py-6">
                <Loader />
              </div>
              <div v-else-if="purchases.length === 0"
                class="w-full flex items-center justify-center py-6 text-text-secondaryDark">{{
                  t('pages.profile.noPurchases')
                }}</div>
              <div v-else class="flex flex-col gap-4">
                <div v-for="deal in purchases" :key="deal.id"
                  class="border border-dark-600 rounded-lg p-4 hover:bg-dark-700 transition">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-green-400 font-bold">{{ formatPrice(deal.price) }}</span>
                    <span class="text-xs text-gray-400">{{ formatFullDate(deal.created_at) }}</span>
                  </div>
                  <div @click="goToProduct(deal.product.id)" class="flex gap-4 mb-2 cursor-pointer">
                    <img :src="deal.product.images[0] ? `${API_HOST}${deal.product.images[0].image_url}` : ''" alt=""
                      class="w-16 h-16 rounded-lg object-cover" />
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-semibold truncate cursor-pointer">{{
                        deal.product.title }}</h3>
                      <p class="text-xs text-text-secondary line-clamp-2">{{ deal.product.description }}</p>
                    </div>
                  </div>
                  <div class="flex gap-4 text-xs text-text-secondary">
                    <div @click="goToProfile(deal.seller.username)" class="cursor-pointer hover:underline">🛒 {{
                      t('common.seller') }}: {{ deal.seller.username }}</div>
                    <div @click="goToProfile(deal.buyer.username)" class="cursor-pointer hover:underline">🧑 {{
                      t('common.buyer') }}: {{ deal.buyer.username }}</div>
                  </div>
                </div>

                <div v-if="currentPagePurchases < totalPagesPurchases" class="flex justify-center mt-4">
                  <button class="px-6 py-2 bg-blue-600 rounded-lg text-white" :disabled="isLoadingMorePurchases"
                    @click="loadMorePurchases">
                    {{ isLoadingMorePurchases ? t('common.loading') : t('common.loadMore') }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showShareModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer">
        <div class="relative w-full max-w-md border border-dark-600 rounded-lg bg-dark-800 p-6 cursor-default"
          ref="shareModalRef" @click.stop>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">{{ t('pages.profile.shareProfile') }}</h3>
            <button class="text-gray-400 hover:text-white transition-colors" @click="closeShareModal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <div class="flex flex-col items-center mb-6">
            <div class="bg-white p-4 rounded-lg mb-4">
              <QrcodeVue :value="profileUrl" :size="200" level="H" />
            </div>
            <p class="text-sm text-gray-300 text-center">{{ t('pages.profile.scanQR') }}</p>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2">{{ t('pages.profile.profileLink') }}</label>
            <div class="flex flex-col gap-2">
              <input type="text" :value="profileUrl" readonly
                class="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm text-white focus:outline-none focus:border-blue-500" />
              <button @click="copyProfileLink"
                class="px-4 py-2 w-[max-content] self-end bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                :class="{ 'bg-green-600 hover:bg-green-700': isCopied }">
                <Check v-if="isCopied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                {{ isCopied ? t('common.copied') : t('common.copy') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>