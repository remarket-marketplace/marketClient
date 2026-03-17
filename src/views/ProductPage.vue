<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import MainProductCard from '@/components/mainProductCard.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import type { Product, ProductImage } from '@/validation/product/product'
import type { Category } from '@/validation/category/category'
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, X, Heart, Trash2, Percent, ShoppingBag } from 'lucide-vue-next'
import UserRating from '@/components/UserRating.vue'
import TrustComponent from './TrustComponent.vue'
import { useUserStore } from '@/stores/user'
import BackButton from '@/components/navigation/BackButton.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { formatCurrencyAmount, getCurrencySymbol, resolvePreferredCurrency } from '@/utils/currency'
import { storeToRefs } from 'pinia'
import { buildCategoryKey, buildProductKey } from '@/utils/urlKeys'
import { calculateDiscountPercent, calculateOfferedPriceByPercent } from '@/utils/priceOffer'
import {
  PRICE_OFFER_MESSAGE_TEMPLATE_KEYS,
  encodePriceOfferTemplateMessage,
  type PriceOfferMessageTemplateKey,
} from '@/utils/priceOfferMessageTemplate'

const API_HOST = import.meta.env.VITE_API_HOST
const NORMALIZED_API_HOST = String(API_HOST || '').replace(/\/$/, '')
const RAIKA_BOT_URL = 'https://raika.gg'
const RAIKA_LOGO_URL = `${NORMALIZED_API_HOST}/assets/raika-logo.png`
const route = useRoute('/product/[productId]')
const router = useRouter()
const { locale, t } = useI18n()
const PRODUCT_PAGE_ROUTE_NAME = 'product page'
const productKey = computed(() => {
  if (route.name !== PRODUCT_PAGE_ROUTE_NAME) {
    return ''
  }
  return String(route.params.productId ?? '')
})


const store = useUserStore()
const { user } = storeToRefs(store)

const product = ref<Product | null>(null)
const parentCategory = ref<Category | null>(null)
const similarProducts = ref<Product[]>([])
const isSimilarProductsLoading = ref(false)
const selectedImage = ref<ProductImage | null>(null)
const openImageModal = ref(false)
const showDeleteConfirm = ref(false)
const showBuyConfirm = ref(false)
const showOfferConfirm = ref(false)
const buyError = ref<string | null>(null)
const offerError = ref<string | null>(null)
const isOfferSubmitting = ref(false)
const offeredPrice = ref<number | null>(null)
const offerMessage = ref('')
const selectedOfferMessageTemplateKey = ref<PriceOfferMessageTemplateKey | null>(null)
const showInsufficientBalanceModal = ref(false)
const insufficientBalanceDetails = ref<{
  balance: number
  price: number
  shortage: number
} | null>(null)

const canSeeModerationRejectReason = computed(() => {
  if (!product.value || product.value.status !== 'rejected') {
    return false
  }

  return Boolean(product.value.is_owner || user.value?.role === 'admin')
})

const moderationRejectReasonLabel = computed(() => {
  const reasonCode = product.value?.moderation_reject_reason_code
  if (!reasonCode) return null

  const translationKey = `common.productRejectReasons.${reasonCode}`
  const translatedValue = t(translationKey)

  return translatedValue === translationKey ? reasonCode : translatedValue
})

const offerCurrencyCode = computed(() => resolvePreferredCurrency())
const offerCurrencySymbol = computed(() => getCurrencySymbol(offerCurrencyCode.value))
const OFFER_DISCOUNT_PRESETS = [10, 20, 30, 40] as const
const SIMILAR_PRODUCTS_LIMIT = 8

const productOfferBasePrice = computed(() => Number(product.value?.price ?? 0))
const offerDiscountPercent = computed(() => calculateDiscountPercent(
  productOfferBasePrice.value,
  Number(offeredPrice.value),
))
function getOfferMessageTemplateText(templateKey: PriceOfferMessageTemplateKey): string {
  const offeredValue = Number(offeredPrice.value)
  const priceLabel = formatCurrencyAmount(
    Number.isFinite(offeredValue) && offeredValue > 0 ? offeredValue : productOfferBasePrice.value,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )

  switch (templateKey) {
    case 'price_offer_buy_now':
      return t('pages.product.offerPriceConfirm.messageTemplateBuyNow', { price: priceLabel })
  }
}

const offerMessageTemplates = computed(() => PRICE_OFFER_MESSAGE_TEMPLATE_KEYS.map(templateKey => ({
  id: templateKey,
  text: getOfferMessageTemplateText(templateKey),
})))

const displayedCategory = computed(() => {
  const currentCategory = product.value?.category
  if (!currentCategory) return null

  if (!currentCategory.parent_id) {
    return currentCategory
  }

  return parentCategory.value ?? currentCategory
})

const displayedSubcategory = computed(() => {
  const currentCategory = product.value?.category
  if (!currentCategory?.parent_id || !parentCategory.value) {
    return null
  }

  return currentCategory
})

async function loadCategoryBreadcrumb(category: Category | null | undefined) {
  if (!category?.parent_id) {
    parentCategory.value = null
    return
  }

  parentCategory.value = await categoryService.getCategoryById(category.parent_id)
}

async function loadSimilarProducts(baseProduct: Product) {
  const categoryKey = buildCategoryKey(baseProduct.category)
  if (!categoryKey) {
    similarProducts.value = []
    return
  }

  isSimilarProductsLoading.value = true
  const collected: Product[] = []
  const seenIds = new Set<string>()

  const collectProducts = (items: Product[]) => {
    for (const item of items) {
      if (item.id === baseProduct.id || seenIds.has(item.id)) {
        continue
      }
      seenIds.add(item.id)
      collected.push(item)
      if (collected.length >= SIMILAR_PRODUCTS_LIMIT) {
        break
      }
    }
  }

  const firstPageResponse = await productService.getProductsByCategory(
    categoryKey,
    1,
    SIMILAR_PRODUCTS_LIMIT + 1,
  )

  collectProducts(firstPageResponse.products)

  let nextPage = 2
  while (collected.length < SIMILAR_PRODUCTS_LIMIT && nextPage <= firstPageResponse.totalPages) {
    const nextPageResponse = await productService.getProductsByCategory(
      categoryKey,
      nextPage,
      SIMILAR_PRODUCTS_LIMIT + 1,
    )
    collectProducts(nextPageResponse.products)
    nextPage += 1
  }

  similarProducts.value = collected.slice(0, SIMILAR_PRODUCTS_LIMIT)
  isSimilarProductsLoading.value = false
}

async function loadProductData() {
  if (!productKey.value) return

  product.value = null
  selectedImage.value = null
  parentCategory.value = null
  similarProducts.value = []

  try {
    product.value = await productService.getProductById(productKey.value) ?? null
    selectedImage.value = product.value?.images?.[0] ?? null
    if (!product.value) {
      return
    }

    const canonicalProductKey = buildProductKey(product.value)
    if (canonicalProductKey && canonicalProductKey !== productKey.value) {
      await router.replace({ path: `/product/${canonicalProductKey}` })
    }

    await Promise.all([
      loadCategoryBreadcrumb(product.value.category),
      loadSimilarProducts(product.value),
    ])
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await router.replace({ name: 'notAccess' })
      return
    }

    console.error('Failed to load product:', error)
  } finally {
    isSimilarProductsLoading.value = false
  }
}

onMounted(async () => {
  await loadProductData()
})

function goToCategoryPage(category: Category | null | undefined) {
  const categoryKey = buildCategoryKey(category)
  if (!categoryKey) return
  router.push({ path: `/category/${categoryKey}` })
}

function goToCategoryPageWithSubcategory(
  category: Category | null | undefined,
  subcategory: Category | null | undefined,
) {
  const categoryKey = buildCategoryKey(category)
  const subcategoryKey = buildCategoryKey(subcategory)
  if (!categoryKey || !subcategoryKey) return
  router.push({
    path: `/category/${categoryKey}`,
    query: { subcategory: subcategoryKey },
  })
}

function goToProductPage(nextProductKey: string) {
  if (!nextProductKey || nextProductKey === productKey.value) {
    return
  }
  router.push({ path: `/product/${nextProductKey}` })
}

function selectImage(image: ProductImage) {
  selectedImage.value = image
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function editProduct() {
  const currentProductId = product.value?.id
  if (!currentProductId) return
  await router.push({
    name: 'edit product',
    params: { productId: currentProductId },
  })
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
}

async function handleDeleteConfirm() {
  if (product.value) {
    const success = await productService.deleteProduct(product.value.id)
    if (success) {
      if (window.history.length > 1) {
        router.back()
      } else {
        const username = user.value?.username
        router.push(username ? `/user/${username}` : '/')
      }
    }
  }
  showDeleteConfirm.value = false
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
}

function openBuyConfirm() {
  showBuyConfirm.value = true
}

function openOfferConfirm() {
  if (!product.value) return
  const productPrice = Number(product.value.price)
  offeredPrice.value = calculateOfferedPriceByPercent(productPrice, OFFER_DISCOUNT_PRESETS[0])
    ?? Math.max(0.01, Math.round((productPrice - 0.01) * 100) / 100)
  offerMessage.value = ''
  selectedOfferMessageTemplateKey.value = null
  offerError.value = null
  showOfferConfirm.value = true
}

function closeOfferConfirm() {
  showOfferConfirm.value = false
  offerError.value = null
}

function getOfferPriceForDiscount(discountPercent: number): number | null {
  if (!product.value) return null

  const currentPrice = Number(product.value.price)
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  const discounted = currentPrice * (1 - discountPercent / 100)
  const rounded = Number(discounted.toFixed(2))
  const maxAllowed = Number((currentPrice - 0.01).toFixed(2))
  return Math.max(0.01, Math.min(rounded, maxAllowed))
}

function applyOfferDiscount(discountPercent: number) {
  const priceFromPreset = getOfferPriceForDiscount(discountPercent)
  if (priceFromPreset === null) return

  offeredPrice.value = priceFromPreset
  offerError.value = null
}

function isDiscountPresetActive(discountPercent: number): boolean {
  const currentOfferedPrice = Number(offeredPrice.value)
  const presetPrice = getOfferPriceForDiscount(discountPercent)
  if (!Number.isFinite(currentOfferedPrice) || presetPrice === null) return false

  return Math.abs(currentOfferedPrice - presetPrice) < 0.001
}

function applyOfferMessageTemplate(templateKey: PriceOfferMessageTemplateKey) {
  selectedOfferMessageTemplateKey.value = templateKey
  offerMessage.value = getOfferMessageTemplateText(templateKey)
}

function handleOfferMessageInput() {
  if (!selectedOfferMessageTemplateKey.value) return

  const selectedTemplateText = getOfferMessageTemplateText(selectedOfferMessageTemplateKey.value).trim()
  if (offerMessage.value.trim() !== selectedTemplateText) {
    selectedOfferMessageTemplateKey.value = null
  }
}

async function handleOfferConfirm() {
  if (!product.value || user.value === null) return

  const priceNumber = Number(offeredPrice.value)
  if (!Number.isFinite(priceNumber) || priceNumber <= 0 || priceNumber >= Number(product.value.price)) {
    offerError.value = t('errors.INVALID_PRICE_OFFER')
    return
  }

  const trimmedOfferMessage = offerMessage.value.trim()
  const selectedTemplateText = selectedOfferMessageTemplateKey.value
    ? getOfferMessageTemplateText(selectedOfferMessageTemplateKey.value).trim()
    : null
  const shouldSendTemplateKey = Boolean(
    selectedOfferMessageTemplateKey.value
    && selectedTemplateText
    && trimmedOfferMessage
    && trimmedOfferMessage === selectedTemplateText,
  )
  const offerMessageToSend = shouldSendTemplateKey
    ? encodePriceOfferTemplateMessage(selectedOfferMessageTemplateKey.value as PriceOfferMessageTemplateKey)
    : (trimmedOfferMessage || undefined)

  isOfferSubmitting.value = true
  offerError.value = null
  const result = await productService.createPriceOffer(
    product.value.id,
    priceNumber,
    offerMessageToSend,
  )
  isOfferSubmitting.value = false

  if (result.success) {
    showOfferConfirm.value = false
    if (result.chatId) {
      router.push({ name: 'chats', query: { chatId: result.chatId } })
    } else {
      router.push('/chats')
    }
    return
  }

  if (result.error) {
    offerError.value = getErrorMessage(result.error, t)
  }
}

async function handleBuyConfirm() {
  if (!product.value) return

  buyError.value = null

  const result = await productService.buyProduct(product.value.id)
  showBuyConfirm.value = false

  if (result.success) {
    if (result.chatId) {
      router.push({ name: 'chats', query: { chatId: result.chatId } })
    } else {
      router.push('/chats')
    }
    return
  }

  if (result.error?.error_code === 'NOT_ENOUGH_BALANCE') {
    await store.fetchUser()
    const balance = Number(user.value?.balance ?? 0)
    const price = Number(product.value.price ?? 0)
    const shortage = Math.max(0, price - balance)

    insufficientBalanceDetails.value = {
      balance,
      price,
      shortage,
    }
    showInsufficientBalanceModal.value = true
    return
  }

  if (result.error) {
    buyError.value = getErrorMessage(result.error, t)
  }
}


function closeBuyConfirm() {
  showBuyConfirm.value = false
}

function closeInsufficientBalanceModal() {
  showInsufficientBalanceModal.value = false
}

function goToWalletTopUp() {
  showInsufficientBalanceModal.value = false
  const shortageRub = Math.max(0, insufficientBalanceDetails.value?.shortage ?? 0)
  router.push({
    name: 'wallet',
    query: {
      open_deposit: '1',
      amount_rub: shortageRub.toFixed(2),
    },
  })
}

function nextImage() {
  if (!product.value?.images || product.value.images.length === 0 || !selectedImage.value) return

  const currentIndex = product.value.images.findIndex(img => img.image_url === selectedImage.value?.image_url)
  if (currentIndex === -1) return

  const nextIndex = (currentIndex + 1) % product.value.images.length
  const nextImage = product.value.images[nextIndex]
  if (nextImage) {
    selectedImage.value = nextImage
  }
}

function prevImage() {
  if (!product.value?.images || product.value.images.length === 0 || !selectedImage.value) return

  const currentIndex = product.value.images.findIndex(img => img.image_url === selectedImage.value?.image_url)
  if (currentIndex === -1) return

  const prevIndex = (currentIndex - 1 + product.value.images.length) % product.value.images.length
  const prevImage = product.value.images[prevIndex]
  if (prevImage) {
    selectedImage.value = prevImage
  }
}

async function likeProduct() {
  if (product.value) {
    const result = await productService.addProductLike(product.value.id)
    if (result) {
      product.value.is_liked = true
    }
  }
}

async function removeProductLike() {
  if (product.value) {
    const result = await productService.removeProductLike(product.value.id)
    if (result) {
      product.value.is_liked = false
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!openImageModal.value) return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      prevImage()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextImage()
      break
    case 'Escape':
      event.preventDefault()
      openImageModal.value = false
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

watch(productKey, async (newProductKey, oldProductKey) => {
  if (!newProductKey || newProductKey === oldProductKey) {
    return
  }
  await loadProductData()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

watch(
  [offeredPrice, locale],
  () => {
    if (!selectedOfferMessageTemplateKey.value) return
    offerMessage.value = getOfferMessageTemplateText(selectedOfferMessageTemplateKey.value)
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

</script>

<template>
  <section v-if="product"
    class="h-full w-full mx-auto max-w-[1280px] flex flex-col items-start gap-2 lg:pt-2 overflow-x-hidden pb-36 text-mainText lg:px-0 lg:pb-6 px-4">
    <div class="pt-1">
      <BackButton />
    </div>

    <!-- Image gallery -->
    <div class="w-full grid grid-cols-1 gap-5 lg:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div class="w-full min-w-0 space-y-4">
        <div v-if="selectedImage" class="flex justify-center rounded-2xl border border-dark-700 bg-dark-700/40 overflow-hidden">
          <div class="relative w-full aspect-[4/3] sm:aspect-[5/4] lg:aspect-[4/3] max-h-[640px] flex items-center justify-center">
            <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
              class="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-55 select-none pointer-events-none"
              loading="lazy" aria-hidden="true" />
            <div
              class="absolute inset-0 product-image-overlay"
              aria-hidden="true" />
            <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
              class="relative z-10 w-full h-full object-contain p-2 sm:p-3 md:p-4 cursor-zoom-in transition-opacity hover:opacity-90"
              loading="lazy" @click="openImageModal = true" />
          </div>
        </div>

        <div v-if="product.images && product.images.length > 1" class="thumbnails-scroll flex gap-3 overflow-x-auto pb-2">
          <img v-for="image in product.images" :key="image.id" :src="`${API_HOST}${image.image_url}`"
            class="h-20 w-20 flex-shrink-0 cursor-pointer border-2 rounded-lg object-cover transition-all duration-200 hover:opacity-80"
            :alt="`Product image: ${product.title}`" :class="{
              'border-blue-500': image.image_url === selectedImage?.image_url,
              'border-dark-700': image.image_url !== selectedImage?.image_url,
            }" loading="lazy" @click="selectImage(image)">
        </div>

        <div v-else-if="!selectedImage && product.images?.length" class="py-4 text-center text-gray-400">
          {{ $t('pages.product.noImages') }}
        </div>

        <!-- Description -->
        <div class="py-4 space-y-4 hidden lg:block">
          <h1 class="text-xl font-bold text-white">{{ $t('pages.product.description') }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
            {{ product.description || $t('pages.product.descriptionMissing') }}
          </p>
        </div>
      </div>

      <!-- Product details -->
      <div class="w-full min-w-0 space-y-6 pt-4 lg:pt-0">
        <!-- Title and price -->
        <div class="flex justify-between">
          <div class="space-y-4">
            <h1 class="text-2xl lg:text-3xl font-bold text-white leading-tight break-words">
              {{ product.title }}
            </h1>
            <div class="flex items-center gap-4">
              <span class="text-2xl lg:text-3xl font-bold text-green-400">
                {{ formatCurrencyAmount(product.price) }}
              </span>
              <ProductStatusTag v-if="product.is_owner || user?.role === 'admin'" :product-status="product.status" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-4 lg:hidden">
          <h1 class="text-xl font-bold text-white">{{ $t('pages.product.description') }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-line text-sm lg:text-base">
            {{ product.description || $t('pages.product.descriptionMissing') }}
          </p>
        </div>

        <!-- Meta info -->
        <div class="space-y-3 py-4 border-t border-dark-700">
          <div class="flex items-center gap-3">
            <span class="text-gray-400 font-medium min-w-20">{{ $t('common.published') }}:</span>
            <span class="text-white">{{ formatFullDate(product.created_at) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-gray-400 font-medium min-w-20">{{ $t('common.category') }}:</span>
            <div
              v-if="displayedCategory"
              class="min-w-0 flex items-center gap-1 text-white"
            >
              <button
                type="button"
                class="truncate text-left text-white transition hover:text-blue-300 hover:underline"
                @click="goToCategoryPage(displayedCategory)"
              >
                {{ displayedCategory.name }}
              </button>
              <template v-if="displayedSubcategory">
                <span class="text-gray-500">/</span>
                <button
                  type="button"
                  class="truncate text-left text-white transition hover:text-blue-300 hover:underline"
                  @click="goToCategoryPageWithSubcategory(displayedCategory, displayedSubcategory)"
                >
                  {{ displayedSubcategory.name }}
                </button>
              </template>
            </div>
            <span v-else class="text-white">{{ $t('common.notSpecified') }}</span>
          </div>
        </div>

        <div
          v-if="product.is_raika_verified"
          class="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-xs text-emerald-200"
        >
          <p class="flex flex-wrap items-center gap-1.5">
            <img
              :src="RAIKA_LOGO_URL"
              alt="Raika logo"
              class="h-4 w-4 rounded-sm object-contain shrink-0"
              loading="lazy"
            />
            <span>
              {{ $t('pages.product.raikaVerifiedPrefix') }}
              <a
                :href="RAIKA_BOT_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="underline decoration-emerald-300/60 underline-offset-2 hover:text-emerald-100 transition-colors"
              >
                {{ $t('pages.product.raikaName') }}
              </a>
            </span>
          </p>
        </div>

        <div
          v-if="canSeeModerationRejectReason"
          class="rounded-lg border border-red-800/40 bg-red-950/20 p-3 text-sm text-red-100"
        >
          <p class="text-red-300 font-semibold">
            {{ $t('pages.product.moderationRejectedTitle') }}
          </p>
          <p class="mt-2 text-red-100/90">
            <span class="text-red-200">{{ $t('pages.product.moderationRejectReasonLabel') }}:</span>
            {{ moderationRejectReasonLabel ?? $t('common.notSpecified') }}
          </p>
          <p
            v-if="product.moderation_reject_reason_text"
            class="mt-2 whitespace-pre-line text-red-100/80"
          >
            {{ product.moderation_reject_reason_text }}
          </p>
        </div>

        <!-- Seller -->
        <div
          class="flex items-center gap-4 p-4 rounded-xl bg-dark-600 cursor-pointer transition-all duration-200 hover:bg-dark-600/80 group"
          @click="router.push(`/user/${product.seller.username}`)">
          <UserAvatar
            :avatar-url="product.seller.avatar_url"
            :alt="product.seller.username"
            class="w-12 h-12 rounded-full border border-dark-500 object-cover"
          />
          <div class="flex-1 flex flex-col gap-1">
            <StyledUsername
              :username="product.seller.username"
              :style-id="product.seller.nickname_style_id"
              class="text-base font-semibold"
            />
            <div class="flex">
              <UserRating :rating="product.seller.rating" />
            </div>
          </div>
          <div class="text-gray-400 text-xl transition-transform duration-200 group-hover:translate-x-1">
            →
          </div>
        </div>

        <!-- Action buttons -->
        <div class="pt-6 border-t border-gray-800">
          <div v-if="!product.is_sold" class="flex flex-col gap-3 sm:flex-row justify-end">
            <div class="w-full flex gap-6 pr-4 items-center justify-end" v-if="product.is_owner">
              <button
                type="button"
                class="rounded-lg flex-1 lg:flex-none bg-blue-600 px-4 py-4 text-sm text-white font-semibold transition hover:bg-blue-700 sm:px-6"
                @click.stop="editProduct">
                {{ $t('common.edit') }}
              </button>
              <Trash2 @click="openDeleteConfirm" class="cursor-pointer w-6 h-6" />
            </div>

            <div v-else class="w-full sm:pr-4">
              <span v-if="user === null" class="mb-2 block text-sm text-gray-400 sm:text-right">
                {{ $t('pages.product.authRequired') }}
              </span>

              <div v-if="product.status === 'active'" class="flex w-full items-center justify-end gap-3">
                <div class="flex min-w-0 flex-1 flex-nowrap items-stretch gap-2">
                  <button :disabled="user === null" @click="user !== null && openOfferConfirm()" class="h-12 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition
          bg-emerald-600 text-white hover:bg-emerald-700
          disabled:bg-emerald-600/40
          disabled:text-white/60
          disabled:cursor-not-allowed
          disabled:hover:bg-emerald-600/40">
                    <span class="inline-flex items-center justify-center gap-2">
                      <Percent class="h-4 w-4" />
                      {{ $t('pages.product.offerPrice') }}
                    </span>
                  </button>
                  <button :disabled="user === null" @click="user !== null && openBuyConfirm()" class="h-12 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition
          bg-blue-600 text-white hover:bg-blue-700
          disabled:bg-blue-600/40
          disabled:text-white/60
          disabled:cursor-not-allowed
          disabled:hover:bg-blue-600/40">
                    <span class="inline-flex items-center justify-center gap-2">
                      <ShoppingBag class="h-4 w-4" />
                      {{ $t('pages.product.buy') }}
                    </span>
                  </button>
                </div>

                <div class="shrink-0">
                  <Heart v-if="product.is_liked" @click="removeProductLike" class="w-8 h-8 text-red-500 cursor-pointer"
                    :style="{ fill: 'currentColor' }" />
                  <Heart v-else @click="likeProduct" class="cursor-pointer w-8 h-8" />
                </div>
              </div>
            </div>

            <div v-if="buyError" class="mt-2 text-sm text-red-400">
              {{ buyError }}
            </div>
          </div>

          <div v-else
            class="w-full py-4 text-center bg-dark-600/40 border border-dark-700 text-gray-400 rounded-2xl font-semibold">
            {{ $t('pages.product.sold') }}
          </div>

        </div>

        <TrustComponent v-if="!product.is_owner" />
        <div v-else class="w-full flex justify-end gap-2 text-gray-400">
          <Heart />
          <span>{{ product.likes }}</span>
        </div>
      </div>
    </div>

    <div v-if="product.reviews" class="w-full flex flex-col gap-4">
      <p class="text-3xl font-bold">{{ $t('pages.product.reviews') }}</p>
      <div class="flex flex-col gap-2">
        <div v-for="review in product.reviews" :key="review.id"
          class="p-4 rounded-lg bg-gray-800/20 border border-dark-700">
          <div class="flex justify-between items-center">
            <span class="font-medium">{{ review.rating }} ⭐</span>
            <span class="text-xs text-gray-400">{{ formatFullDate(review.created_at) }}</span>
          </div>
          <p class="mt-2 text-sm">{{ review.body }}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 w-full flex flex-col gap-4">
      <p class="text-xl sm:text-2xl font-bold">{{ $t('pages.product.similarProducts') }}</p>

      <div v-if="isSimilarProductsLoading" class="similar-products-grid grid gap-1 md:gap-2 w-full">
        <div v-for="n in 4" :key="`similar-skeleton-${n}`" class="h-64 bg-dark-600 animate-pulse rounded-2xl" />
      </div>

      <div v-else-if="similarProducts.length" class="similar-products-grid grid gap-1 md:gap-2 w-full">
        <MainProductCard
          v-for="similarProduct in similarProducts"
          :key="similarProduct.id"
          :product="similarProduct"
          @click="goToProductPage"
        />
      </div>

      <p v-else class="text-sm text-gray-400">{{ $t('pages.product.noSimilarProducts') }}</p>
    </div>

    <!-- Image modal -->
    <Teleport to="body">
      <div v-if="openImageModal && selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer"
        @click="openImageModal = false">
        <div class="relative w-full h-full flex items-center justify-center max-w-7xl mx-auto" @click.stop>
          <img :src="`${API_HOST}${selectedImage.image_url}`" class="max-w-full max-h-full object-contain rounded-lg"
            :alt="`Modal image: ${product.title}`" loading="lazy" />

          <button
            class="absolute top-4 right-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-2 hover:bg-black/70"
            @click="openImageModal = false">
            <X class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            class="absolute left-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-3 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="product.images.findIndex(img => img.image_url === selectedImage?.image_url) === 0"
            @click="prevImage">
            <ChevronLeft class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            class="absolute right-4 text-white hover:text-gray-300 transition-all duration-200 bg-black/50 rounded-full p-3 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="product.images.findIndex(img => img.image_url === selectedImage?.image_url) === product.images.length - 1"
            @click="nextImage">
            <ChevronRight class="w-6 h-6" />
          </button>

          <div v-if="product.images && product.images.length > 1"
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full px-3 py-1 text-white text-sm">
            {{product.images.findIndex(img => img.image_url === selectedImage?.image_url) + 1}} / {{
              product.images.length }}
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmWindow :is-open="showDeleteConfirm" :title="$t('pages.product.deleteConfirm.title')"
      :message="$t('pages.product.deleteConfirm.message')" :confirm-text="$t('pages.product.deleteConfirm.confirm')"
      :cancel-text="$t('pages.product.deleteConfirm.cancel')" @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm" />

    <ConfirmWindow :is-open="showBuyConfirm" :title="$t('pages.product.buyConfirm.title')"
      :message="$t('pages.product.buyConfirm.message')" :confirm-text="$t('pages.product.buyConfirm.confirm')"
      :cancel-text="$t('pages.product.buyConfirm.cancel')" @confirm="handleBuyConfirm" @cancel="closeBuyConfirm" />

    <ConfirmWindow
      :is-open="showOfferConfirm"
      :title="$t('pages.product.offerPriceConfirm.title')"
      :message="$t('pages.product.offerPriceConfirm.message')"
      :confirm-text="$t('pages.product.offerPriceConfirm.confirm')"
      :cancel-text="$t('pages.product.offerPriceConfirm.cancel')"
      :is-loading="isOfferSubmitting"
      @confirm="handleOfferConfirm"
      @cancel="closeOfferConfirm"
    >
      <template #body>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-300">{{ $t('pages.product.offerPriceConfirm.offeredPriceLabel') }}</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="discount in OFFER_DISCOUNT_PRESETS"
                :key="discount"
                type="button"
                class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                :class="isDiscountPresetActive(discount)
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                  : 'border-emerald-700/50 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-900/35'"
                @click="applyOfferDiscount(discount)"
              >
                -{{ discount }}%
              </button>
            </div>
            <div class="relative mt-1">
              <input
                v-model.number="offeredPrice"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-lg border border-dark-700 bg-dark-700/60 px-3 py-2 pr-20 text-sm text-white outline-none focus:border-emerald-500"
              />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-300">
                {{ offerCurrencySymbol }} {{ offerCurrencyCode }}
              </span>
            </div>
          </div>
          <div
            v-if="offerDiscountPercent !== null"
            class="rounded-lg border border-emerald-700/30 bg-emerald-900/15 p-3"
          >
            <p class="text-xs text-gray-300">{{ $t('pages.product.offerPriceConfirm.previewLabel') }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span class="text-xs text-gray-500 line-through">
                {{ formatCurrencyAmount(Number(product?.price ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
              <span class="text-sm font-semibold text-emerald-300">
                {{ formatCurrencyAmount(Number(offeredPrice ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
              <span class="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                {{ $t('pages.product.offerPriceConfirm.discountBadge', { percent: offerDiscountPercent }) }}
              </span>
            </div>
          </div>
          <div>
            <label class="text-xs text-gray-300">{{ $t('pages.product.offerPriceConfirm.messageLabel') }}</label>
            <textarea
              v-model="offerMessage"
              rows="3"
              maxlength="500"
              class="mt-1 w-full resize-none rounded-lg border border-dark-700 bg-dark-700/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              :placeholder="$t('pages.product.offerPriceConfirm.messagePlaceholder')"
              @input="handleOfferMessageInput"
            />
            <div class="mt-2">
              <p class="text-[11px] font-medium text-gray-400">
                {{ $t('pages.product.offerPriceConfirm.messageTemplatesLabel') }}
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  v-for="template in offerMessageTemplates"
                  :key="template.id"
                  type="button"
                  class="rounded-md border px-2.5 py-1 text-left text-[11px] leading-4 transition-colors"
                  :class="selectedOfferMessageTemplateKey === template.id
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                    : 'border-emerald-700/50 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-900/35'"
                  @click="applyOfferMessageTemplate(template.id)"
                >
                  {{ template.text }}
                </button>
              </div>
            </div>
          </div>
          <p v-if="offerError" class="text-xs text-red-400">{{ offerError }}</p>
        </div>
      </template>
    </ConfirmWindow>

    <ConfirmWindow
      :is-open="showInsufficientBalanceModal"
      :title="$t('pages.product.insufficientBalance.title')"
      :message="$t('pages.product.insufficientBalance.message')"
      :confirm-text="$t('pages.product.insufficientBalance.topUp')"
      :cancel-text="$t('common.cancel')"
      @confirm="goToWalletTopUp"
      @cancel="closeInsufficientBalanceModal"
    >
      <template #body>
        <div
          class="rounded-xl border border-amber-700/40 bg-amber-900/15 p-4"
        >
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-300">
                {{ $t('pages.product.insufficientBalance.balance') }}
              </span>
              <span class="font-semibold text-white">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.balance ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-300">
                {{ $t('pages.product.insufficientBalance.price') }}
              </span>
              <span class="font-semibold text-white">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.price ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
            <div class="h-px bg-dark-700"></div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-amber-200 font-medium">
                {{ $t('pages.product.insufficientBalance.shortage') }}
              </span>
              <span class="font-bold text-amber-300">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.shortage ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </ConfirmWindow>
  </section>

  <div v-else class="w-full min-h-[calc(100dvh-3.5rem)] flex items-center justify-center">
    <Loader />
  </div>
</template>

<style scoped>
/* Custom scrollbar for image thumbnails */
.thumbnails-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

.thumbnails-scroll::-webkit-scrollbar {
  height: 6px;
}

.thumbnails-scroll::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.thumbnails-scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.thumbnails-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.product-image-overlay {
  background-image: radial-gradient(circle at top, var(--overlay-white-12), transparent 45%),
    linear-gradient(to bottom, var(--product-image-overlay-top), var(--product-image-overlay-bottom));
}

.similar-products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 680px) {
  .similar-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .similar-products-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Button hover animations */
button {
  transition: all 0.2s ease-in-out;
}
</style>
