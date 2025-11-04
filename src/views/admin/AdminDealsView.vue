<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { adminService } from '@/api/admin/AdminService'
import type { Deal, DealsList } from '@/validation/deal/deal'
import { useImages } from '@/composables/useImages'
import DealStatusTag from '@/components/DealStatusTag.vue'

const { t } = useI18n()
const router = useRouter()

// Данные
const fullDeals = ref<Deal[]>([])
const deals = ref<Deal[]>([])
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = ref(20)
const searchQuery = ref('')
const isLoadingMore = ref(false)
const isLoading = ref(true)
const processingDealId = ref<string | null>(null)

const isServerPagination = ref(true)
const isMobile = ref(false)

const { images } = useImages()

// Навигация
function goToDeal(id: string) {
  router.push({ path: `/deal/${id}` })
}

function goToProfile(username: string) {
  router.push(`/profile/${username}`)
}

function goToProduct(productId: string) {
  router.push(`/product/${productId}`)
}

const showDeleteConfirm = ref<boolean>(true)
const clickedChangeDealStatus = ref<string>('')

function closeConfirmWindow() {
  showDeleteConfirm.value = false
}

function clickChangeDealStatus(toDealStatus: string) {
  showDeleteConfirm.value = true
  clickedChangeDealStatus.value = toDealStatus
}

// ===== Поиск =====
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    currentPage.value = 1
    if (searchQuery.value.trim()) {
      const searchResults = fullDeals.value.filter(deal =>
        deal.product.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        deal.seller.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        deal.buyer.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        deal.product.category.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
      fullDeals.value = searchResults
      totalPages.value = Math.ceil(searchResults.length / perPage.value)
      isServerPagination.value = false
      updateDisplayedDeals()
    }
    else {
      loadDeals()
    }
  }, 300)
}

// ===== Пагинация =====
function updateDisplayedDeals() {
  if (isServerPagination.value)
    return
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  deals.value = fullDeals.value.slice(start, end)
}

async function loadDeals(page = 1, append = false) {
  if (!append) {
    isLoading.value = true
  }
  
  currentPage.value = page
  
  try {
    const response: DealsList | false = await adminService.getAllDeals(page, perPage.value)
    if (response !== false) {
      const dealsData = response.deals || []
      
      if (append) {
        deals.value = [...deals.value, ...dealsData]
        fullDeals.value = [...fullDeals.value, ...dealsData]
      } else {
        deals.value = dealsData
        fullDeals.value = dealsData
      }
      
      totalPages.value = response.total_pages || Math.ceil((response.total || 0) / perPage.value)
      isServerPagination.value = true
    } else {
      deals.value = []
      fullDeals.value = []
    }
  } catch (error) {
    console.error('Ошибка при загрузке сделок:', error)
    if (!append) {
      deals.value = []
      fullDeals.value = []
    }
  } finally {
    isLoading.value = false
  }
}

async function loadMoreDeals() {
  if (isLoadingMore.value)
    return
  isLoadingMore.value = true
  const nextPage = currentPage.value + 1
  if (nextPage > totalPages.value) {
    isLoadingMore.value = false
    return
  }
  await loadDeals(nextPage, true)
  currentPage.value = nextPage
  isLoadingMore.value = false
}

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(price)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU')
}

// Получение URL изображения товара
function getProductImageUrl(deal: Deal) {
  const API_HOST = import.meta.env.VITE_API_HOST || ''
  if (deal.product.images.length > 0 && deal.product.images[0]!.image_url) {
    return `${API_HOST}${deal.product.images[0]!.image_url}`
  }
  return '/placeholder-product.jpg'
}

// Получение аватара пользователя
function getUserAvatarUrl(avatarUrl: string) {
  const API_HOST = import.meta.env.VITE_API_HOST || ''
  return avatarUrl ? `${API_HOST}${avatarUrl}` : images.avatars.default
}

// ===== Управление сделками =====
async function confirmDeal(dealId: string) {
    processingDealId.value = dealId
  try {
    await adminService.confirmDeal(dealId)
    await loadDeals(currentPage.value, false)
  } catch (error) {
    console.error(error)
  } finally {
    processingDealId.value = null
  }
}

async function refundDeal(dealId: string) {
  processingDealId.value = dealId
  try {
    await adminService.refundDeal(dealId)
    await loadDeals(currentPage.value, false)
  } catch (error) {
    console.error(error)
  } finally {
    processingDealId.value = null
  }
}

async function cancelDeal(dealId: string) {
  processingDealId.value = dealId
  try {
    await adminService.cancelDeal(dealId)
    await loadDeals(currentPage.value, false)
  } catch (error) {
    console.error(error)
  } finally {
    processingDealId.value = null
  }
}

async function resolveDispute(dealId: string, inFavorOf: 'buyer' | 'seller') {
  processingDealId.value = dealId
  try {
    await adminService.resolveDealDispute(dealId, inFavorOf)
    await loadDeals(currentPage.value, false)
  } catch (error) {
    console.error('Ошибка при решении спора:', error)
  } finally {
    processingDealId.value = null
  }
}

onMounted(async () => {
  try {
    await loadDeals()
    checkMobile()
    window.addEventListener('resize', checkMobile)
  }
  catch (error) {
    console.error('Ошибка при загрузке сделок:', error)
    isLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden">
    <!-- Заголовок -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h1 class="text-lg sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.dealsPage.title') }}</h1>
      <div class="text-xs sm:text-base text-text-secondary">
        {{ $t('common.total') }} {{ fullDeals.length }}
      </div>
    </div>

    <!-- Поиск -->
    <div class="w-full">
      <SearchField
        v-model="searchQuery"
        :placeholder="$t('pages.deals.searchPlaceholder')"
        @search-change="debouncedSearch"
      />
    </div>

    <!-- Список сделок -->
    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Icon icon="eos-icons:loading" class="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 text-sm sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="deals.length === 0" class="flex items-center justify-center h-32">
        <div class="text-center">
          <Icon icon="mdi:handshake-outline" class="h-6 w-6 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-1" />
          <p class="text-text-secondary text-xs sm:text-base">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div v-else class="h-full overflow-y-auto no-scrollbar space-y-4">
        <!-- Карточка сделки -->
        <div
          v-for="deal in deals"
          :key="deal.id"
          class="bg-dark-600 border border-dark-700 rounded-xl p-4 hover:border-dark-500 transition-all duration-200"
        >
          <div class="flex flex-col gap-4">
            <!-- Заголовок и статус -->
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <DealStatusTag :deal-status="deal.status"/>
                <span class="text-xl font-bold text-green-400">
                  {{ formatPrice(deal.price) }}
                </span>
              </div>
              <button
                @click="goToDeal(deal.id)"
                class="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                :title="$t('common.viewDeal')"
              >
                <Icon icon="mdi:eye-outline" class="w-4 h-4" />
                <span class="hidden sm:inline">{{ $t('common.view') }}</span>
              </button>
            </div>

            <!-- Основная информация о товаре -->
            <div class="flex gap-4">
              <!-- Изображение товара -->
              <div class="flex-shrink-0">
                <img
                  :src="getProductImageUrl(deal)"
                  :alt="deal.product.title"
                  class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-dark-400 cursor-pointer"
                  @click="goToProduct(deal.product.id)"
                />
              </div>

              <!-- Информация о товаре -->
              <div class="flex-1 min-w-0">
                <h3 
                  class="text-lg sm:text-xl font-semibold text-mainText line-clamp-2 mb-2 cursor-pointer"
                  @click="goToProduct(deal.product.id)"
                >
                  {{ deal.product.title }}
                </h3>
                
                <div class="flex items-center gap-2 text-sm text-text-secondary mb-2">
                  <Icon icon="mdi:folder-outline" class="w-4 h-4" />
                  <span>{{ deal.product.category.name }}</span>
                </div>

                <p class="text-sm text-text-secondary line-clamp-2 hidden sm:block">
                  {{ deal.product.description }}
                </p>
              </div>
            </div>

            <!-- Участники сделки -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Продавец -->
              <div @click="goToProfile(deal.seller.username)" class="bg-dark-700 hover:bg-dark-700/80 transition rounded-lg p-3 cursor-pointer">
                <div class="flex items-center gap-3">
                  <img
                    :src="getUserAvatarUrl(deal.seller.avatar_url)"
                    :alt="deal.seller.username"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-text-secondary text-xs mb-1">{{ $t('common.seller') }}</div>
                    <div class="flex items-center gap-2">
                      <span 
                        class="text-mainText font-light truncate"
                      >
                        {{ deal.seller.username }}
                      </span>
                      <div class="flex items-center gap-1 text-yellow-400">
                        <Icon icon="mdi:star" class="w-3 h-3" />
                        <span class="text-xs">{{ deal.seller.rating }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Покупатель -->
              <div  @click="goToProfile(deal.buyer.username)" class="bg-dark-700 hover:bg-dark-700/80 transition rounded-lg p-3 cursor-pointer">
                <div class="flex items-center gap-3 bg-">
                  <img
                    :src="getUserAvatarUrl(deal.buyer.avatar_url)"
                    :alt="deal.buyer.username"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-text-secondary text-xs mb-1">{{ $t('common.buyer') }}</div>
                    <div class="flex items-center gap-2">
                      <span 
                        class="text-mainText font-light truncate"
                      >
                        {{ deal.buyer.username }}
                      </span>
                      <div class="flex items-center gap-1 text-yellow-400">
                        <Icon icon="mdi:star" class="w-3 h-3" />
                        <span class="text-xs">{{ deal.buyer.rating }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Дополнительная информация -->
            <div class="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-text-secondary">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <Icon icon="mdi:calendar" class="w-3 h-3" />
                  <span>{{ $t('common.created') }}: {{ formatDate(deal.created_at) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Icon icon="mdi:image-multiple" class="w-3 h-3" />
                  <span>{{ $t('common.images') }}: {{ deal.product.images.length }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span>ID: {{ deal.id }}</span>
              </div>
            </div>

            <!-- Кнопки управления -->
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2 border-t border-dark-700">
              <!-- Для сделок в статусе pending -->
              <template v-if="deal.status === 'pending'">
                <button
                  @click="confirmDeal(deal.id)"
                  :disabled="processingDealId === deal.id"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm min-w-[140px]"
                >
                  <Icon icon="mdi:check" class="w-4 h-4" />
                  <span>{{ $t('common.confirmDeal') }}</span>
                </button>
                
                <button
                  @click="refundDeal(deal.id)"
                  :disabled="processingDealId === deal.id"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors text-sm min-w-[140px]"
                >
                  <Icon icon="mdi:cash-refund" class="w-4 h-4" />
                  <span>{{ $t('pages.admin.dealsPage.refund') }}</span>
                </button>
              </template>

              <!-- Для сделок в статусе disputed -->
              <template v-else-if="deal.status === 'disputed'">
                <button
                  @click="resolveDispute(deal.id, 'buyer')"
                  :disabled="processingDealId === deal.id"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm min-w-[160px]"
                >
                  <Icon icon="mdi:account-check" class="w-4 h-4" />
                  <span>{{ $t('common.resolveForBuyer') }}</span>
                </button>
                
                <button
                  @click="resolveDispute(deal.id, 'seller')"
                  :disabled="processingDealId === deal.id"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors text-sm min-w-[160px]"
                >
                  <Icon icon="mdi:account-check" class="w-4 h-4" />
                  <span>{{ $t('common.resolveForSeller') }}</span>
                </button>
              </template>

              <!-- Для завершенных сделок -->
              <template v-else-if="deal.status === 'completed'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm">
                  <Icon icon="mdi:check-circle" class="w-4 h-4" />
                  <span>{{ $t('common.dealCompleted') }}</span>
                </div>
              </template>

              <!-- Для отмененных сделок -->
              <template v-else-if="deal.status === 'cancelled'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm">
                  <Icon icon="mdi:cancel" class="w-4 h-4" />
                  <span>{{ $t('common.dealCancelled') }}</span>
                </div>
              </template>

              <!-- Для возвратов -->
              <template v-else-if="deal.status === 'refunded'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-purple-300 rounded-lg text-sm">
                  <Icon icon="mdi:cash-refund" class="w-4 h-4" />
                  <span>{{ $t('common.refundCompleted') }}</span>
                </div>
              </template>

              <!-- Общая кнопка отмены -->
              <button
                v-if="['pending', 'disputed'].includes(deal.status)"
                @click="cancelDeal(deal.id)"
                :disabled="processingDealId === deal.id"
                class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-sm min-w-[140px] sm:ml-auto"
              >
                <Icon icon="mdi:cancel" class="w-4 h-4" />
                <span>{{ $t('common.cancelDeal') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Кнопка загрузки еще -->
        <div
          v-if="isServerPagination && currentPage < totalPages"
          class="flex items-center justify-center pt-4"
        >
          <button
            class="max-w-lg w-full rounded-lg bg-blue-500 px-6 py-3 text-lg text-mainText font-semibold shadow-lg transition-all duration-200 active:bg-blue-700 hover:bg-blue-600 disabled:bg-blue-800"
            :disabled="isLoadingMore"
            @click="loadMoreDeals"
          >
            <div class="flex items-center justify-center gap-2">
              <span v-if="!isLoadingMore">{{ $t('common.loadMore') }}</span>
              <span v-else>{{ $t('common.loading') }}</span>
              <Icon v-if="isLoadingMore" icon="eos-icons:loading" class="w-5 h-5 animate-spin" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Стили для скроллбара */
::-webkit-scrollbar {
  width: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}
</style>