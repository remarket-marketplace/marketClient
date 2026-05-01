<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import MainProductCard from '@/components/mainProductCard.vue'
import HomeProductListCard from '@/components/HomeProductListCard.vue'
import FortniteAccountSnapshot from '@/components/FortniteAccountSnapshot.vue'
import ReportComplaintModal from '@/components/complaints/ReportComplaintModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import type { Product, ProductImage } from '@/validation/product/product'
import type { Category } from '@/validation/category/category'
import { onMounted, ref, onUnmounted, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { BadgeCheck, Check, ChevronLeft, ChevronRight, X, Heart, Trash2, ShoppingBag, LayoutGrid, Rows3, ShieldCheck, ImageOff, Star } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getErrorMessage } from '@/utils/errorsMap'
import { formatCurrencyAmount, getCurrencySymbol, resolvePreferredCurrency } from '@/utils/currency'
import { storeToRefs } from 'pinia'
import { buildCategoryKey, buildProductKey } from '@/utils/urlKeys'
import { calculateDiscountPercent, calculateOfferedPriceByPercent } from '@/utils/priceOffer'
import {
  PRICE_OFFER_MESSAGE_TEMPLATE_KEYS,
  encodePriceOfferTemplateMessage,
  type PriceOfferMessageTemplateKey,
} from '@/utils/priceOfferMessageTemplate'
import { hasFortniteAccountDetails } from '@/utils/fortniteAccount'
import { buildAuthRedirectQuery } from '@/utils/authRedirect'

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
const officialProducts = ref<Product[]>([])
const isSimilarProductsLoading = ref(false)
const isOfficialProductsLoading = ref(false)
const officialCarouselRef = ref<HTMLElement | null>(null)
const isOfficialCarouselAtStart = ref(true)
const isOfficialCarouselAtEnd = ref(false)
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
const showComplaintModal = ref(false)
const isDescriptionExpanded = ref(false)
const visibleReviewsCount = ref(3)
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
const OFFER_DISCOUNT_PRESETS = [5, 10, 15] as const
const SIMILAR_PRODUCTS_LIMIT = 8
const OFFICIAL_PRODUCTS_LIMIT = 14
type ProductCardViewMode = 'grid' | 'list'
const PRODUCT_CARD_VIEW_MODE_STORAGE_KEY = 'home_product_card_view_mode'
const productCardViewMode = ref<ProductCardViewMode>('grid')
const similarProductsLoadingSkeletonCount = computed(() => (
  productCardViewMode.value === 'grid'
    ? 4
    : 3
))
const officialProductsLoadingSkeletonCount = 7
const shouldShowOfficialRemarketCarousel = computed(() =>
  isOfficialProductsLoading.value || officialProducts.value.length > 0
)

const productReviews = computed(() => product.value?.reviews ?? [])
const visibleReviews = computed(() => productReviews.value.slice(0, visibleReviewsCount.value))
const hasMoreReviews = computed(() => productReviews.value.length > visibleReviews.value.length)
const reviewCountLabel = computed(() => productReviews.value.length ? ` ${productReviews.value.length}` : '')
const similarProductsCountLabel = computed(() => (
  similarProducts.value.length ? ` ${similarProducts.value.length}` : ''
))

const shouldCollapseDescription = computed(() => {
  const description = product.value?.description ?? ''
  return description.length > 260 || description.split('\n').length > 5
})

const displayedDescription = computed(() => {
  const description = product.value?.description || t('pages.product.descriptionMissing')
  if (isDescriptionExpanded.value || !shouldCollapseDescription.value) {
    return description
  }

  return `${description.slice(0, 260).trim()}...`
})

const breadcrumbItems = computed(() => {
  const items: Array<{ label: string, action?: () => void }> = [
    { label: t('common.home'), action: () => router.push('/') },
    { label: 'Каталог', action: () => router.push('/') },
  ]

  if (displayedCategory.value) {
    items.push({
      label: displayedCategory.value.name,
      action: canNavigateToDisplayedCategory.value
        ? () => goToCategoryPage(displayedCategory.value)
        : undefined,
    })
  }

  if (displayedSubcategory.value) {
    items.push({
      label: displayedSubcategory.value.name,
      action: canNavigateToDisplayedSubcategory.value
        ? () => goToCategoryPageWithSubcategory(displayedCategory.value, displayedSubcategory.value)
        : undefined,
    })
  }

  return items
})

const additionalInfoItems = computed(() => {
  if (!product.value) return []

  return [
    {
      label: t('pages.product.remainingQuantity'),
      value: String(product.value.count),
    },
    {
      label: t('common.autoDelivery'),
      value: product.value.auto_delivery ? t('common.yes') : t('common.no'),
    },
  ]
})

const officialProductsCountText = computed(() => {
  const count = officialProducts.value.length
  return `${count} ${getProductWordFormRu(count)}`
})
const hasSingleOfficialProduct = computed(() => officialProducts.value.length === 1)

const productOfferBasePrice = computed(() => Number(product.value?.price ?? 0))
const maxOfferedPrice = computed(() => {
  const basePrice = productOfferBasePrice.value
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return null
  }

  return Math.max(0.01, Number((basePrice - 0.01).toFixed(2)))
})
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

const canNavigateToDisplayedCategory = computed(() => {
  const currentCategory = displayedCategory.value
  if (!currentCategory) return false
  return currentCategory.is_active
})

const canNavigateToDisplayedSubcategory = computed(() => {
  return Boolean(
    displayedCategory.value?.is_active
    && displayedSubcategory.value?.is_active,
  )
})

const shouldShowFortniteAccountDetails = computed(() => (
  hasFortniteAccountDetails(product.value?.fortnite_account_details)
))

const officialRootCategory = computed(() => {
  const currentCategory = product.value?.category
  if (!currentCategory) return null
  if (!currentCategory.parent_id) return currentCategory
  return product.value?.parent_category ?? parentCategory.value ?? null
})

const officialSubcategory = computed(() => {
  const currentCategory = product.value?.category
  if (!currentCategory?.parent_id) return null
  return currentCategory
})

function setProductCardViewMode(mode: ProductCardViewMode): void {
  if (productCardViewMode.value === mode) return
  productCardViewMode.value = mode
}

function restoreProductCardViewModeFromStorage(): void {
  if (typeof window === 'undefined') return
  const saved = window.localStorage.getItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY)
  productCardViewMode.value = saved === 'list' ? 'list' : 'grid'
}

function getProductWordFormRu(count: number): string {
  const normalizedCount = Math.abs(Math.trunc(count))
  const mod10 = normalizedCount % 10
  const mod100 = normalizedCount % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}

function formatOfficialPrice(price: number): string {
  return formatCurrencyAmount(price, {
    currency: 'RUB',
    fromCurrency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function resolveProductImageUrl(productValue: Product): string {
  const firstImage = productValue.images[0]?.image_url ?? ''
  if (!firstImage) return ''
  if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
    return firstImage
  }
  return `${API_HOST}${firstImage}`
}

function updateOfficialCarouselState() {
  const carouselElement = officialCarouselRef.value
  if (!carouselElement) {
    isOfficialCarouselAtStart.value = true
    isOfficialCarouselAtEnd.value = true
    return
  }

  const maxScrollLeft = Math.max(0, carouselElement.scrollWidth - carouselElement.clientWidth)
  const scrollLeft = Math.max(0, carouselElement.scrollLeft)
  const edgeThreshold = 8
  isOfficialCarouselAtStart.value = scrollLeft <= edgeThreshold
  isOfficialCarouselAtEnd.value = scrollLeft >= maxScrollLeft - edgeThreshold
}

function handleOfficialCarouselScroll() {
  updateOfficialCarouselState()
}

function scrollOfficialCarousel(direction: 'prev' | 'next') {
  const carouselElement = officialCarouselRef.value
  if (!carouselElement) return

  const firstCard = carouselElement.querySelector<HTMLElement>('[data-official-card]')
  const scrollStep = firstCard
    ? firstCard.offsetWidth + 16
    : Math.max(320, Math.round(carouselElement.clientWidth * 0.82))

  carouselElement.scrollBy({
    left: direction === 'next' ? scrollStep : -scrollStep,
    behavior: 'smooth',
  })

  window.setTimeout(updateOfficialCarouselState, 320)
}

function openOfficialStorePage() {
  const rootCategory = officialRootCategory.value
  if (!rootCategory) return

  const query: Record<string, string> = {}
  const rootCategoryKey = buildCategoryKey(rootCategory) || rootCategory.id
  if (rootCategoryKey) {
    query.gameCategoryId = rootCategoryKey
  }

  const subcategory = officialSubcategory.value
  if (subcategory) {
    const subcategoryKey = buildCategoryKey(subcategory) || subcategory.id
    if (subcategoryKey) {
      query.subcategoryId = subcategoryKey
    }
  }

  router.push({ path: '/official', query })
}

async function loadCategoryBreadcrumb(
  category: Category | null | undefined,
  productParentCategory: Category | null | undefined,
) {
  if (!category?.parent_id) {
    parentCategory.value = null
    return
  }

  if (productParentCategory) {
    parentCategory.value = productParentCategory
    return
  }

  parentCategory.value = await categoryService.getCategoryById(category.parent_id)
}

async function loadSimilarProducts(baseProduct: Product) {
  if (!baseProduct.category.is_active || baseProduct.parent_category?.is_active === false) {
    similarProducts.value = []
    return
  }

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
    { excludeOfficial: true },
  )

  collectProducts(firstPageResponse.products)

  let nextPage = 2
  while (collected.length < SIMILAR_PRODUCTS_LIMIT && nextPage <= firstPageResponse.totalPages) {
    const nextPageResponse = await productService.getProductsByCategory(
      categoryKey,
      nextPage,
      SIMILAR_PRODUCTS_LIMIT + 1,
      { excludeOfficial: true },
    )
    collectProducts(nextPageResponse.products)
    nextPage += 1
  }

  similarProducts.value = collected.slice(0, SIMILAR_PRODUCTS_LIMIT)
  isSimilarProductsLoading.value = false
}

async function loadOfficialProductsForCarousel(baseProduct: Product) {
  const categoryKey = buildCategoryKey(baseProduct.category)
  if (!categoryKey) {
    officialProducts.value = []
    isOfficialProductsLoading.value = false
    updateOfficialCarouselState()
    return
  }

  isOfficialProductsLoading.value = true

  try {
    const collected: Product[] = []
    const seenIds = new Set<string>()

    const collectProducts = (items: Product[]) => {
      for (const item of items) {
        if (item.id === baseProduct.id || seenIds.has(item.id)) {
          continue
        }
        seenIds.add(item.id)
        collected.push(item)
        if (collected.length >= OFFICIAL_PRODUCTS_LIMIT) {
          break
        }
      }
    }

    let page = 1
    let totalPages = 1
    while (collected.length < OFFICIAL_PRODUCTS_LIMIT && page <= totalPages) {
      const response = await productService.getProductsByCategory(
        categoryKey,
        page,
        OFFICIAL_PRODUCTS_LIMIT + 1,
        { isOfficialOnly: true },
      )

      totalPages = response.totalPages
      collectProducts(response.products)
      page += 1
    }

    officialProducts.value = collected.slice(0, OFFICIAL_PRODUCTS_LIMIT)
    await nextTick()
    updateOfficialCarouselState()
  } finally {
    isOfficialProductsLoading.value = false
  }
}

async function loadProductData() {
  if (!productKey.value) return

  product.value = null
  selectedImage.value = null
  parentCategory.value = null
  similarProducts.value = []
  officialProducts.value = []
  isOfficialProductsLoading.value = false

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
      loadCategoryBreadcrumb(product.value.category, product.value.parent_category),
      loadSimilarProducts(product.value),
      loadOfficialProductsForCarousel(product.value),
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
  restoreProductCardViewModeFromStorage()
  await loadProductData()
  window.addEventListener('resize', updateOfficialCarouselState, { passive: true })
  await nextTick()
  updateOfficialCarouselState()
})

watch(productCardViewMode, (mode) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_CARD_VIEW_MODE_STORAGE_KEY, mode)
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

function goToProductByModel(nextProduct: Product) {
  const nextProductKey = buildProductKey(nextProduct)
  if (!nextProductKey) return
  goToProductPage(nextProductKey)
}

function goToSellerProfile() {
  if (!product.value?.seller.username) return
  router.push(`/user/${product.value.seller.username}`)
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
  const deletedProduct = product.value
  if (deletedProduct) {
    const success = await productService.deleteProduct(deletedProduct.id)
    if (success) {
      const username = deletedProduct.seller?.username || user.value?.username
      await router.replace(username ? `/user/${username}` : '/')
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

function goToSignInFromProduct() {
  router.push({
    path: '/signin',
    query: buildAuthRedirectQuery(route.fullPath),
  })
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

function normalizeOfferedPrice() {
  const currentValue = Number(offeredPrice.value)
  if (!Number.isFinite(currentValue)) {
    return
  }

  const maxPrice = maxOfferedPrice.value
  if (maxPrice === null) {
    return
  }

  offeredPrice.value = Number(Math.min(Math.max(currentValue, 0.01), maxPrice).toFixed(2))
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

  normalizeOfferedPrice()
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

function openProductReport() {
  if (!product.value) return

  if (!user.value) {
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

function getProductReportUrl() {
  if (typeof window === 'undefined') return route.fullPath
  return `${window.location.origin}${route.fullPath}`
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

function closeImageModal() {
  openImageModal.value = false
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
      closeImageModal()
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
  window.removeEventListener('resize', updateOfficialCarouselState)
})

</script>

<template>
  <section v-if="product"
    class="product-page-shell h-full w-full mx-auto max-w-[1280px] flex flex-col items-start gap-6 overflow-x-hidden px-4 pb-36 pt-2 text-mainText lg:px-0 lg:pb-8">
    <div class="flex w-full flex-wrap items-center justify-between gap-3">
      <nav class="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-[var(--text-meta)] sm:text-[15px]">
        <template v-for="(breadcrumbItem, index) in breadcrumbItems" :key="`${breadcrumbItem.label}-${index}`">
          <button
            v-if="breadcrumbItem.action"
            type="button"
            class="max-w-[220px] truncate font-medium transition hover:text-[var(--text-title)]"
            @click="breadcrumbItem.action"
          >
            {{ breadcrumbItem.label }}
          </button>
          <span v-else class="max-w-[220px] truncate font-medium text-[var(--text-body)]">{{ breadcrumbItem.label }}</span>
          <span v-if="index < breadcrumbItems.length - 1" class="text-[var(--text-meta)]">›</span>
        </template>
      </nav>
    </div>

    <div class="product-detail-layout grid w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
      <main class="min-w-0 space-y-8">
        <div class="space-y-3">
          <div v-if="selectedImage" class="product-hero-media relative overflow-hidden rounded-lg bg-[rgb(var(--palette-dark-950)/0.92)]">
            <template v-if="product.images && product.images.length > 1">
              <button
                type="button"
                class="absolute inset-y-0 left-0 z-20 w-12 bg-[var(--transparent)] md:w-16"
                :aria-label="t('common.previous')"
                @click="prevImage"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 z-20 w-12 bg-[var(--transparent)] md:w-16"
                :aria-label="t('common.next')"
                @click="nextImage"
              />
              <button
                type="button"
                class="pointer-events-none absolute left-3 top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[rgb(var(--palette-white)/0.18)] bg-[rgb(var(--palette-black)/0.5)] text-[rgb(var(--text-title-rgb)/0.9)]"
              >
                <ChevronLeft class="h-5 w-5" />
              </button>
              <button
                type="button"
                class="pointer-events-none absolute right-3 top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[rgb(var(--palette-white)/0.18)] bg-[rgb(var(--palette-black)/0.5)] text-[rgb(var(--text-title-rgb)/0.9)]"
              >
                <ChevronRight class="h-5 w-5" />
              </button>
            </template>

            <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
              class="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-2xl select-none pointer-events-none"
              loading="lazy" aria-hidden="true" />
            <div class="absolute inset-0 product-image-overlay" aria-hidden="true" />
            <img :src="`${API_HOST}${selectedImage.image_url}`" :alt="product.title"
              class="relative z-10 h-full w-full cursor-zoom-in object-contain p-2 transition-opacity hover:opacity-95 sm:p-3"
              loading="lazy" @click="openImageModal = true" />
          </div>
          <div
            v-else
            class="product-hero-media flex flex-col items-center justify-center gap-3 rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-800)/0.28)] text-[var(--text-muted)]"
          >
            <ImageOff class="h-10 w-10" />
            <span class="text-sm">{{ $t('common.noImage') }}</span>
          </div>

          <div v-if="product.images && product.images.length > 1" class="thumbnails-scroll flex gap-2 overflow-x-auto pb-1">
            <img v-for="image in product.images" :key="image.id" :src="`${API_HOST}${image.image_url}`"
              class="h-16 w-16 flex-shrink-0 cursor-pointer rounded-lg border object-cover transition-all duration-200 hover:opacity-85 sm:h-20 sm:w-20"
              :alt="`Product image: ${product.title}`" :class="{
                'border-[rgb(var(--palette-blue-500))] opacity-100': image.image_url === selectedImage?.image_url,
                'border-[rgb(var(--palette-dark-700))] opacity-70': image.image_url !== selectedImage?.image_url,
              }" loading="lazy" @click="selectImage(image)">
          </div>
        </div>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-[var(--text-title)]">{{ $t('pages.product.description') }}</h2>
          <p class="product-description-text whitespace-pre-line break-words text-sm leading-relaxed text-[var(--text-body)] [overflow-wrap:anywhere] lg:text-base">
            {{ displayedDescription }}
          </p>
          <button
            v-if="shouldCollapseDescription"
            type="button"
            class="inline-flex h-9 items-center rounded-lg bg-[rgb(var(--palette-dark-700)/0.55)] px-4 text-sm font-semibold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-dark-600)/0.7)]"
            @click="isDescriptionExpanded = !isDescriptionExpanded"
          >
            {{ isDescriptionExpanded ? 'Скрыть' : 'Раскрыть' }}
          </button>
        </section>

        <section v-if="productReviews.length" class="space-y-3">
          <h2 class="text-xl font-bold text-[var(--text-title)]">
            {{ $t('pages.product.reviews') }}<span class="text-[var(--text-muted)]">{{ reviewCountLabel }}</span>
          </h2>
          <div class="reviews-strip -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <article
              v-for="review in visibleReviews"
              :key="review.id"
              class="review-card min-w-[220px] rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-900)/0.82)] p-3 sm:min-w-[250px]"
            >
              <div class="flex items-start gap-2.5">
                <UserAvatar
                  :avatar-url="review.reviewer?.avatar_url ?? ''"
                  :alt="review.reviewer?.username ?? 'reviewer'"
                  class="h-9 w-9 shrink-0 rounded-full border border-[rgb(var(--palette-dark-700))] object-cover"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <StyledUsername
                      v-if="review.reviewer"
                      :username="review.reviewer.username"
                      :style-id="review.reviewer.nickname_style_id"
                      class="truncate text-sm font-semibold"
                    />
                    <span v-else class="truncate text-sm font-semibold text-[var(--text-title)]">{{ $t('common.user') }}</span>
                    <span class="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[var(--text-title)]">
                      <Star class="h-3 w-3 fill-current text-[var(--text-title)]" />
                      {{ review.rating }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-[10px] text-[var(--text-meta)]">{{ formatFullDate(review.created_at) }}</p>
                </div>
              </div>
              <p class="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-body)]">{{ review.body }}</p>
            </article>
          </div>
          <button
            v-if="hasMoreReviews"
            type="button"
            class="inline-flex h-9 items-center rounded-lg bg-[rgb(var(--palette-dark-700)/0.55)] px-4 text-sm font-semibold text-[var(--text-title)] transition hover:bg-[rgb(var(--palette-dark-600)/0.7)]"
            @click="visibleReviewsCount += 6"
          >
            {{ 'Раскрыть' }}
          </button>
        </section>

        <section v-if="isSimilarProductsLoading || similarProducts.length" class="mt-6 w-full space-y-4">
          <h2 class="text-xl font-bold text-[var(--text-title)]">
            {{ $t('pages.product.similarProducts') }}<span class="text-[var(--text-muted)]">{{ similarProductsCountLabel }}</span>
          </h2>
          <div class="space-y-4">
            <div class="flex justify-end">
              <div
                class="inline-flex h-9 items-center gap-0.5 rounded-lg border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.4)] p-0.5"
                role="group"
                :aria-label="t('pages.index.viewSwitcherLabel')"
              >
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
                  :class="productCardViewMode === 'grid'
                    ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                    : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'"
                  :title="t('pages.index.viewGrid')"
                  @click="setProductCardViewMode('grid')"
                >
                  <LayoutGrid class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('pages.index.viewGrid') }}</span>
                </button>

                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs"
                  :class="productCardViewMode === 'list'
                    ? 'bg-[rgb(var(--palette-blue-600))] text-[var(--text-title)]'
                    : 'text-[var(--text-body)] hover:bg-[rgb(var(--palette-dark-700)/0.6)] hover:text-[var(--text-title)]'"
                  :title="t('pages.index.viewList')"
                  @click="setProductCardViewMode('list')"
                >
                  <Rows3 class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">{{ t('pages.index.viewList') }}</span>
                </button>
              </div>
            </div>

            <div
              v-if="isSimilarProductsLoading"
              class="w-full"
              :class="productCardViewMode === 'grid'
                ? 'similar-products-grid grid gap-2'
                : 'flex flex-col gap-2'"
            >
              <div
                v-for="n in similarProductsLoadingSkeletonCount"
                :key="`similar-skeleton-${n}`"
                class="animate-pulse rounded-lg bg-[rgb(var(--palette-dark-600))]"
                :class="productCardViewMode === 'grid' ? 'h-64' : 'h-[118px] sm:h-[134px]'"
              />
            </div>

            <div
              v-else-if="similarProducts.length && productCardViewMode === 'grid'"
              class="similar-products-grid grid w-full gap-2"
            >
              <MainProductCard
                v-for="similarProduct in similarProducts"
                :key="similarProduct.id"
                :product="similarProduct"
                @click="goToProductPage"
              />
            </div>
            <div v-else-if="similarProducts.length" class="w-full flex flex-col gap-2">
              <HomeProductListCard
                v-for="similarProduct in similarProducts"
                :key="similarProduct.id"
                :product="similarProduct"
                @click="goToProductPage"
              />
            </div>
          </div>
        </section>
      </main>

      <aside class="product-buy-sidebar min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div class="space-y-2">
          <h1 class="text-2xl font-extrabold uppercase leading-none text-[var(--text-title)] sm:text-3xl lg:text-[1.6rem]">
            {{ product.title }}
          </h1>
        </div>

        <section class="rounded-lg bg-[rgb(var(--palette-dark-900)/0.92)] p-4 shadow-[0_18px_50px_rgb(0_0_0/0.18)]">
          <div class="space-y-3">
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="text-3xl font-extrabold leading-none text-[var(--text-title)]">
                {{ formatCurrencyAmount(product.price) }}
              </span>
              <button
                v-if="!product.is_owner && !product.is_sold && product.status === 'active'"
                type="button"
                class="text-xs font-semibold text-[var(--text-muted)] underline decoration-[rgb(var(--palette-white)/0.28)] underline-offset-2 transition hover:text-[var(--text-title)]"
                @click="user === null ? goToSignInFromProduct() : openOfferConfirm()"
              >
                {{ $t('pages.product.offerPrice') }}
              </button>
            </div>

            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg bg-[rgb(var(--palette-dark-800)/0.58)] p-2 text-left transition hover:bg-[rgb(var(--palette-dark-800)/0.78)]"
              @click="goToSellerProfile"
            >
              <UserAvatar
                :avatar-url="product.seller.avatar_url"
                :alt="product.seller.username"
                class="h-11 w-11 shrink-0 rounded-full border border-[rgb(var(--palette-dark-700))] object-cover"
              />
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-1.5">
                  <StyledUsername
                    :username="product.seller.username"
                    :style-id="product.seller.nickname_style_id"
                    class="truncate text-sm font-semibold"
                  />
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    :class="product.seller.is_active ? 'bg-[rgb(var(--palette-green-500))]' : 'bg-[rgb(var(--palette-gray-500))]'"
                  />
                </div>
                <p class="mt-0.5 text-xs text-[var(--text-muted)]">
                  {{ product.seller.rating > 0 ? `${product.seller.rating.toFixed(1)} ★` : '—' }}
                  <span class="mx-1 text-[var(--text-meta)]">·</span>
                  {{ product.seller_trust?.completed_deals_count ?? 0 }} продаж
                </p>
              </div>
            </button>

            <span v-if="user === null && !product.is_owner" class="block text-sm text-[var(--text-muted)]">
              {{ $t('pages.product.authRequired') }}
            </span>

            <div v-if="!product.is_sold" class="space-y-2">
              <div v-if="product.is_owner" class="flex items-center gap-2">
                <button
                  type="button"
                  class="market-primary-surface market-primary-hover inline-flex h-11 flex-1 items-center justify-center rounded-lg px-5 text-sm font-semibold text-[var(--text-title)] transition"
                  @click.stop="editProduct">
                  {{ $t('common.edit') }}
                </button>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.35)] text-[var(--text-body)] transition hover:border-[rgb(var(--palette-red-700)/0.45)] hover:bg-[rgb(var(--palette-red-950)/0.16)] hover:text-[var(--text-danger-soft)]"
                  :aria-label="$t('common.delete')"
                  @click="openDeleteConfirm"
                >
                  <Trash2 class="h-5 w-5" />
                </button>
              </div>

              <template v-else-if="product.status === 'active'">
                <div class="flex items-stretch gap-2">
                  <button
                    type="button"
                    class="market-primary-surface market-primary-hover inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold text-[var(--text-title)] transition"
                    @click="user === null ? goToSignInFromProduct() : openBuyConfirm()"
                  >
                    <ShoppingBag class="mr-2 h-4 w-4" />
                    {{ $t('pages.product.buy') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-800)/0.72)] transition hover:border-[rgb(var(--palette-red-700)/0.45)]"
                    :class="product.is_liked ? 'text-[var(--text-danger)]' : 'text-[var(--text-body)]'"
                    aria-label="Избранное"
                    @click="user !== null && (product.is_liked ? removeProductLike() : likeProduct())"
                  >
                    <Heart class="h-5 w-5" :style="product.is_liked ? { fill: 'currentColor' } : undefined" />
                  </button>
                </div>
              </template>
            </div>

            <div v-else class="rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.35)] py-4 text-center font-semibold text-[var(--text-muted)]">
              {{ $t('pages.product.sold') }}
            </div>

            <div v-if="buyError" class="text-sm text-[var(--text-danger)]">
              {{ buyError }}
            </div>
          </div>
        </section>

        <section class="rounded-lg bg-[rgb(var(--palette-dark-900)/0.82)] p-4">
          <h2 class="mb-3 text-base font-semibold text-[var(--text-title)]">Дополнительная информация</h2>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="infoItem in additionalInfoItems"
              :key="infoItem.label"
              class="rounded-lg bg-[rgb(var(--palette-dark-800)/0.62)] px-3 py-3"
            >
              <p class="truncate text-[11px] text-[var(--text-meta)]">{{ infoItem.label }}</p>
              <p class="mt-1 truncate text-sm font-semibold text-[var(--text-title)]">{{ infoItem.value }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-lg bg-[rgb(var(--palette-dark-900)/0.82)] p-4">
          <div class="mb-2 flex items-center gap-2">
            <ShieldCheck class="h-4 w-4 text-[rgb(var(--palette-white)/0.95)]" />
            <h2 class="text-base font-semibold text-[var(--text-title)]">Гарантия безопасной сделки</h2>
          </div>
          <ul class="space-y-2 text-sm text-[var(--text-body)]">
            <li class="flex gap-2">
              <Check class="mt-1 h-3.5 w-3.5 shrink-0 text-[rgb(var(--palette-white)/0.78)]" />
              <span>Продавец получит средства после подтверждения</span>
            </li>
            <li class="flex gap-2">
              <Check class="mt-1 h-3.5 w-3.5 shrink-0 text-[rgb(var(--palette-white)/0.78)]" />
              <span>Возврат средств, если товар не будет получен</span>
            </li>
          </ul>
        </section>

        <div class="px-1 text-right text-xs text-[var(--text-meta)]">
          <span>{{ formatFullDate(product.created_at) }}</span>
          <button
            v-if="!product.is_owner"
            type="button"
            class="ml-3 inline-flex items-center text-xs font-medium text-[var(--text-meta)] underline decoration-[rgb(var(--palette-white)/0.28)] underline-offset-2 transition hover:text-[var(--text-danger-soft)]"
            :title="$t('pages.product.reportProduct')"
            :aria-label="$t('pages.product.reportProduct')"
            @click="openProductReport"
          >
            Пожаловаться
          </button>
        </div>

        <section v-if="product.is_raika_verified" class="rounded-lg border border-[rgb(var(--palette-emerald-700)/0.4)] bg-[rgb(var(--palette-emerald-900)/0.2)] p-3 text-xs text-[var(--text-success)]">
          <p class="flex flex-wrap items-center gap-1.5">
            <img :src="RAIKA_LOGO_URL" alt="Raika logo" class="h-4 w-4 shrink-0 rounded-sm object-contain" loading="lazy" />
            <span>
              {{ $t('pages.product.raikaVerifiedPrefix') }}
              <a :href="RAIKA_BOT_URL" target="_blank" rel="noopener noreferrer" class="underline decoration-[rgb(var(--palette-emerald-300)/0.6)] underline-offset-2 hover:text-[var(--text-success)] transition-colors">
                {{ $t('pages.product.raikaName') }}
              </a>
            </span>
          </p>
        </section>

        <section v-if="canSeeModerationRejectReason" class="rounded-lg border border-[rgb(var(--palette-red-800)/0.4)] bg-[rgb(var(--palette-red-950)/0.2)] p-3 text-sm text-[var(--text-danger-soft)]">
          <p class="font-semibold text-[var(--text-danger)]">{{ $t('pages.product.moderationRejectedTitle') }}</p>
          <p class="mt-2 text-[rgb(var(--text-danger-soft-rgb)/0.9)]">
            <span class="text-[var(--text-danger-soft)]">{{ $t('pages.product.moderationRejectReasonLabel') }}:</span>
            {{ moderationRejectReasonLabel ?? $t('common.notSpecified') }}
          </p>
          <p v-if="product.moderation_reject_reason_text" class="mt-2 whitespace-pre-line text-[rgb(var(--text-danger-soft-rgb)/0.8)]">
            {{ product.moderation_reject_reason_text }}
          </p>
        </section>

        <div
          v-if="shouldShowFortniteAccountDetails"
          class="space-y-4 rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-900)/0.82)] p-4"
        >
          <h2 class="text-lg font-semibold text-[var(--text-title)]">
            {{ $t('pages.product.fortniteAccountDetails') }}
          </h2>
          <FortniteAccountSnapshot
            :details="product.fortnite_account_details"
            variant="full"
          />
        </div>
      </aside>

      <div
        v-if="shouldShowOfficialRemarketCarousel"
        class="official-showcase mt-2 w-full rounded-3xl border border-[rgb(var(--palette-white)/0.12)] p-4 sm:p-5 lg:col-span-2"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--palette-blue-300)/0.7)] bg-[rgb(var(--palette-blue-500)/0.32)] px-3 py-1.5 text-sm font-semibold tracking-wide text-[var(--text-accent-strong)] shadow-[var(--official-showcase-badge-shadow)]">
            <BadgeCheck class="h-4 w-4" />
            <span>Официально от remarket</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="official-showcase__ghost-btn !hidden sm:!inline-flex"
              @click="openOfficialStorePage"
            >
              <span>{{ officialProductsCountText }}</span>
              <ChevronRight class="h-4 w-4" />
            </button>

            <div class="hidden items-center gap-1 rounded-full border border-[var(--official-showcase-control-border)] bg-[var(--official-showcase-control-bg)] p-1 sm:inline-flex">
              <button
                type="button"
                class="official-showcase__arrow-btn"
                :disabled="isOfficialCarouselAtStart || officialProducts.length <= 1"
                aria-label="Прокрутить влево"
                @click="scrollOfficialCarousel('prev')"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="official-showcase__arrow-btn"
                :disabled="isOfficialCarouselAtEnd || officialProducts.length <= 1"
                aria-label="Прокрутить вправо"
                @click="scrollOfficialCarousel('next')"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="mb-3 text-sm font-medium text-[rgb(var(--text-accent-strong-rgb)/0.85)] sm:hidden">
          {{ officialProductsCountText }}
        </div>

        <div v-if="isOfficialProductsLoading" class="official-carousel flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div
            v-for="n in officialProductsLoadingSkeletonCount"
            :key="`official-skeleton-${n}`"
            class="h-[234px] w-[188px] shrink-0 animate-pulse rounded-2xl bg-[rgb(var(--palette-dark-700)/0.7)] sm:h-[276px] sm:w-[232px]"
          ></div>
        </div>

        <div v-else-if="officialProducts.length > 0" class="official-carousel-wrap relative">
          <div
            ref="officialCarouselRef"
            class="official-carousel pb-2 pr-1 no-scrollbar"
            :class="hasSingleOfficialProduct
              ? 'block overflow-visible'
              : 'flex gap-4 overflow-x-auto snap-x snap-mandatory'"
            @scroll.passive="handleOfficialCarouselScroll"
          >
            <button
              v-for="officialProduct in officialProducts"
              :key="`official-${officialProduct.id}`"
              type="button"
              data-official-card
              class="official-card group h-[234px] shrink-0 overflow-hidden rounded-2xl border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-dark-900)/0.9)] text-left transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--palette-blue-300)/0.4)] hover:bg-[rgb(var(--palette-dark-900))] sm:h-[276px]"
              :class="hasSingleOfficialProduct ? 'w-full max-w-none' : 'w-[188px] snap-start sm:w-[232px]'"
              @click="goToProductByModel(officialProduct)"
            >
              <div class="official-card__media relative h-[140px] w-full overflow-hidden sm:h-[170px]">
                <img
                  v-if="resolveProductImageUrl(officialProduct)"
                  :src="resolveProductImageUrl(officialProduct)"
                  :alt="officialProduct.title"
                  class="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-xs text-[var(--text-body)]">
                  {{ t('common.noImage') }}
                </div>
                <div class="official-card__overlay absolute inset-0"></div>
              </div>
              <div class="space-y-2 px-3.5 py-3">
                <p class="official-card__price text-[1.3rem] font-bold leading-none tracking-tight text-[var(--text-accent-strong)] sm:text-[1.55rem]">
                  {{ formatOfficialPrice(officialProduct.price) }}
                </p>
                <p class="official-card__title min-h-[2.5rem] text-[0.93rem] leading-5 text-[rgb(var(--text-title-rgb)/0.95)] sm:text-[1.03rem] sm:leading-6">
                  {{ officialProduct.title }}
                </p>
              </div>
            </button>
          </div>

          <div class="official-carousel__edge official-carousel__edge--left" :class="isOfficialCarouselAtStart ? 'opacity-0' : 'opacity-100'"></div>
          <div class="official-carousel__edge official-carousel__edge--right" :class="isOfficialCarouselAtEnd ? 'opacity-0' : 'opacity-100'"></div>
        </div>

        <div class="mt-3 sm:hidden">
          <button type="button" class="official-showcase__ghost-btn w-full justify-center" @click="openOfficialStorePage">
            <span>Смотреть все</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Image modal -->
    <Teleport to="body">
      <div v-if="openImageModal && selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--palette-black)/0.9)] backdrop-blur-sm p-4 cursor-pointer"
        @click.self="closeImageModal">
        <div class="relative w-full h-full flex items-center justify-center max-w-7xl mx-auto" @click.stop>
          <template v-if="product.images && product.images.length > 1">
            <button
              type="button"
              class="absolute inset-y-0 left-0 z-20 w-14 md:w-20 bg-[var(--transparent)]"
              :aria-label="t('common.previous')"
              @click="prevImage"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 z-20 w-14 md:w-20 bg-[var(--transparent)]"
              :aria-label="t('common.next')"
              @click="nextImage"
            />
          </template>

          <img :src="`${API_HOST}${selectedImage.image_url}`" class="max-w-full max-h-full object-contain rounded-lg"
            :alt="`Modal image: ${product.title}`" loading="lazy" />

          <button
            type="button"
            class="absolute top-4 right-4 z-30 text-[var(--text-title)] hover:text-[var(--text-body)] transition-all duration-200 bg-[rgb(var(--palette-black)/0.5)] rounded-full p-2 hover:bg-[rgb(var(--palette-black)/0.7)]"
            @click.prevent.stop="closeImageModal">
            <X class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            type="button"
            class="absolute left-4 text-[var(--text-title)] hover:text-[var(--text-body)] transition-all duration-200 bg-[rgb(var(--palette-black)/0.5)] rounded-full p-3 hover:bg-[rgb(var(--palette-black)/0.7)] disabled:opacity-30 disabled:cursor-not-allowed"
            @click="prevImage">
            <ChevronLeft class="w-6 h-6" />
          </button>

          <button v-if="product.images && product.images.length > 1"
            type="button"
            class="absolute right-4 text-[var(--text-title)] hover:text-[var(--text-body)] transition-all duration-200 bg-[rgb(var(--palette-black)/0.5)] rounded-full p-3 hover:bg-[rgb(var(--palette-black)/0.7)] disabled:opacity-30 disabled:cursor-not-allowed"
            @click="nextImage">
            <ChevronRight class="w-6 h-6" />
          </button>

          <div v-if="product.images && product.images.length > 1"
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[rgb(var(--palette-black)/0.5)] rounded-full px-3 py-1 text-[var(--text-title)] text-sm">
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
            <label class="text-xs text-[var(--text-body)]">{{ $t('pages.product.offerPriceConfirm.offeredPriceLabel') }}</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="discount in OFFER_DISCOUNT_PRESETS"
                :key="discount"
                type="button"
                class="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                :class="isDiscountPresetActive(discount)
                  ? 'border-[rgb(var(--palette-blue-400))] bg-[rgb(var(--palette-blue-500)/0.25)] text-[var(--text-accent-strong)]'
                  : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]'"
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
                :max="maxOfferedPrice ?? undefined"
                step="0.01"
                class="price-offer-input w-full rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.6)] px-3 py-2 pr-20 text-sm text-[var(--text-title)] outline-none focus:border-[rgb(var(--palette-blue-500))]"
                @input="normalizeOfferedPrice"
                @blur="normalizeOfferedPrice"
              />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-[var(--text-body)]">
                {{ offerCurrencySymbol }} {{ offerCurrencyCode }}
              </span>
            </div>
          </div>
          <div
            v-if="offerDiscountPercent !== null"
            class="rounded-lg border border-[rgb(var(--palette-blue-500)/0.25)] bg-[rgb(var(--palette-blue-500)/0.1)] p-3"
          >
            <p class="text-xs text-[var(--text-body)]">{{ $t('pages.product.offerPriceConfirm.previewLabel') }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span class="text-xs text-[var(--text-meta)] line-through">
                {{ formatCurrencyAmount(Number(product?.price ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
              <span class="text-sm font-semibold text-[var(--text-accent)]">
                {{ formatCurrencyAmount(Number(offeredPrice ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
              <span class="inline-flex items-center rounded-full border border-[rgb(var(--palette-blue-400)/0.3)] bg-[rgb(var(--palette-blue-500)/0.15)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-accent)]">
                {{ $t('pages.product.offerPriceConfirm.discountBadge', { percent: offerDiscountPercent }) }}
              </span>
            </div>
          </div>
          <div>
            <label class="text-xs text-[var(--text-body)]">{{ $t('pages.product.offerPriceConfirm.messageLabel') }}</label>
            <textarea
              v-model="offerMessage"
              rows="3"
              maxlength="500"
              class="mt-1 w-full resize-none rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.6)] px-3 py-2 text-sm text-[var(--text-title)] outline-none focus:border-[rgb(var(--palette-emerald-500))]"
              :placeholder="$t('pages.product.offerPriceConfirm.messagePlaceholder')"
              @input="handleOfferMessageInput"
            />
            <div class="mt-2">
              <p class="text-[11px] font-medium text-[var(--text-muted)]">
                {{ $t('pages.product.offerPriceConfirm.messageTemplatesLabel') }}
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  v-for="template in offerMessageTemplates"
                  :key="template.id"
                  type="button"
                  class="rounded-md border px-2.5 py-1 text-left text-[11px] leading-4 transition-colors"
                  :class="selectedOfferMessageTemplateKey === template.id
                    ? 'border-[rgb(var(--palette-blue-400))] bg-[rgb(var(--palette-blue-500)/0.25)] text-[var(--text-accent-strong)]'
                    : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body)] hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]'"
                  @click="applyOfferMessageTemplate(template.id)"
                >
                  {{ template.text }}
                </button>
              </div>
            </div>
          </div>
          <p v-if="offerError" class="text-xs text-[var(--text-danger)]">{{ offerError }}</p>
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
          class="rounded-xl border border-[rgb(var(--palette-amber-700)/0.4)] bg-[rgb(var(--palette-amber-900)/0.15)] p-4"
        >
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-[var(--text-body)]">
                {{ $t('pages.product.insufficientBalance.balance') }}
              </span>
              <span class="font-semibold text-[var(--text-title)]">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.balance ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-[var(--text-body)]">
                {{ $t('pages.product.insufficientBalance.price') }}
              </span>
              <span class="font-semibold text-[var(--text-title)]">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.price ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
            <div class="h-px bg-[rgb(var(--palette-dark-700))]"></div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-[var(--text-warning)] font-medium">
                {{ $t('pages.product.insufficientBalance.shortage') }}
              </span>
              <span class="font-bold text-[var(--text-warning-strong)]">
                {{ formatCurrencyAmount(insufficientBalanceDetails?.shortage ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </ConfirmWindow>

    <ReportComplaintModal
      v-if="product"
      :is-open="showComplaintModal"
      target-type="product"
      :target-id="product.id"
      :target-label="product.title"
      :target-url="getProductReportUrl()"
      @close="closeComplaintModal"
    />
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

.product-price-label {
  color: var(--product-price-label);
}

.product-price-value {
  color: var(--product-price-value);
}

.product-hero-media {
  aspect-ratio: 16 / 11;
  min-height: 320px;
}

.reviews-strip {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

.reviews-strip::-webkit-scrollbar {
  height: 6px;
}

.reviews-strip::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.reviews-strip::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.similar-products-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.official-showcase {
  background: var(--official-showcase-bg);
}

.official-showcase__ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid var(--official-showcase-control-border);
  background: var(--official-showcase-control-bg);
  padding: 0.42rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--official-showcase-control-text);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.official-showcase__ghost-btn:hover {
  border-color: var(--official-showcase-control-border-hover);
  background: var(--official-showcase-control-bg-hover);
  color: var(--text-primary-strong);
}

.official-showcase__arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.85rem;
  width: 1.85rem;
  border-radius: 9999px;
  color: var(--official-showcase-arrow-text);
  background: var(--official-showcase-arrow-bg);
  border: 1px solid var(--official-showcase-arrow-border);
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.official-showcase__arrow-btn:hover:not(:disabled) {
  color: var(--text-primary-strong);
  border-color: var(--official-showcase-arrow-border-hover);
  background: var(--official-showcase-arrow-bg-hover);
}

.official-showcase__arrow-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.official-carousel {
  scroll-behavior: smooth;
}

.official-carousel__edge {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0.5rem;
  width: 2.3rem;
  transition: opacity 180ms ease;
}

.official-carousel__edge--left {
  left: 0;
  background: var(--official-carousel-fade-left);
}

.official-carousel__edge--right {
  right: 0;
  background: var(--official-carousel-fade-right);
}

.official-card__overlay {
  background: var(--official-carousel-card-glow);
}

.official-card__price {
  white-space: nowrap;
}

.official-card__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

@media (max-width: 640px) {
  .product-hero-media {
    aspect-ratio: 1 / 1;
    min-height: 260px;
  }
}

/* Button hover animations */
button {
  transition: all 0.2s ease-in-out;
}

.price-offer-input::-webkit-outer-spin-button,
.price-offer-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.price-offer-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
