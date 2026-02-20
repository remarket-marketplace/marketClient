<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Eye,
  Calendar,
  Image,
  Check,
  Undo2,
  UserCheck,
  CheckCircle,
  XCircle,
  Folder,
  Loader2,
  MessageCircleMore
} from 'lucide-vue-next'
import { adminService } from '@/api/admin/AdminService'
import type { Deal, DealsList } from '@/validation/deal/deal'
import DealStatusTag from '@/components/DealStatusTag.vue'
import UserRating from '@/components/UserRating.vue'
import SearchField from '@/components/SearchField.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const { t } = useI18n()
const router = useRouter()

// Данные
const deals = ref<Deal[]>([])
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = ref(20)
const searchQuery = ref('')
const sortBy = ref('created_desc')
const statusFilter = ref('all')
const isLoading = ref(true)
const processingDealId = ref<string | null>(null)
const isMobile = ref(false)
const isFetchingMore = ref(false)
const totalCount = ref(0)
const listRef = ref<HTMLElement | null>(null)

// Confirm dialog
const showConfirmModal = ref(false)
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve())
const confirmTitle = ref('')
const confirmMessage = ref('')
const isActionLoading = ref(false)
const showReasonField = ref(false)
const disputeReason = ref('')
const reasonError = ref('')

// Навигация
function goToDeal(id: string) {
  router.push({ path: `/admin/deal/${id}` })
}

function goToChat(chatId: string) {
  router.push({ name: 'adminChatView', params: { chatId } })
}

function goToProfile(username: string) {
  router.push(`/user/${username}`)
}

function goToProduct(productId: string) {
  router.push(`/product/${productId}`)
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

const filteredDeals = computed(() => {
  return deals.value.filter(deal => {
    const matchesQuery = normalizedQuery.value
      ? [
          deal.product.title,
          deal.product.description,
          deal.product.category.name,
          deal.seller.username,
          deal.buyer.username,
          deal.id,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery.value)
      : true

    const matchesStatus =
      statusFilter.value === 'all' ? true : deal.status === statusFilter.value

    return matchesQuery && matchesStatus
  })
})

const sortedDeals = computed(() => {
  const data = [...filteredDeals.value]
  switch (sortBy.value) {
    case 'created_asc':
      return data.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    case 'price_desc':
      return data.sort((a, b) => b.price - a.price)
    case 'price_asc':
      return data.sort((a, b) => a.price - b.price)
    case 'status_asc':
      return data.sort((a, b) => a.status.localeCompare(b.status))
    case 'status_desc':
      return data.sort((a, b) => b.status.localeCompare(a.status))
    default:
      return data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }
})

const displayTotal = computed(() => {
  if (normalizedQuery.value || statusFilter.value !== 'all') {
    return filteredDeals.value.length
  }
  return totalCount.value || deals.value.length
})

// ===== Пагинация =====
async function loadDeals(reset = false) {
  if (reset) {
    currentPage.value = 1
    deals.value = []
    totalCount.value = 0
  }

  isLoading.value = true
  try {
    const response: DealsList | false = await adminService.getAllDeals(currentPage.value, perPage.value)
    if (response !== false) {
      const dealsData = response.deals || []
      if (reset) {
        deals.value = dealsData
      } else {
        deals.value = [...deals.value, ...dealsData]
      }
      totalPages.value = response.total_pages || Math.ceil((response.total || 0) / perPage.value)
      totalCount.value = response.total ?? totalCount.value
    } else {
      deals.value = []
      totalCount.value = 0
    }
  } catch (error) {
    console.error('Ошибка при загрузке сделок:', error)
    if (reset) {
      deals.value = []
      totalCount.value = 0
    }
  } finally {
    isLoading.value = false
    isFetchingMore.value = false
  }
}

async function loadMoreDeals() {
  if (isFetchingMore.value || currentPage.value >= totalPages.value) return
  isFetchingMore.value = true
  currentPage.value += 1
  await loadDeals(false)
}

// ===== Helpers =====
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

function getProductImageUrl(deal: Deal) {
  const API_HOST = import.meta.env.VITE_API_HOST || ''
  if (deal.product.images.length > 0 && deal.product.images[0]!.image_url) {
    return `${API_HOST}${deal.product.images[0]!.image_url}`
  }
  return '/placeholder-product.jpg'
}

// ===== Управление сделками =====
async function confirmDeal(dealId: string) {
  processingDealId.value = dealId
  try {
    await adminService.confirmDeal(dealId)
    await loadDeals(true)
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
    await loadDeals(true)
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
    await loadDeals(true)
  } catch (error) {
    console.error(error)
  } finally {
    processingDealId.value = null
  }
}

function showConfirmDialog(
  title: string,
  message: string,
  action: () => Promise<void>,
  options?: { showReason?: boolean }
) {
  confirmTitle.value = title
  confirmMessage.value = message
  showReasonField.value = options?.showReason ?? false
  if (!showReasonField.value) {
    disputeReason.value = ''
    reasonError.value = ''
  }
  confirmAction.value = action
  showConfirmModal.value = true
}

async function resolveDispute(dealId: string, inFavorOf: 'buyer' | 'seller') {
  processingDealId.value = dealId
  disputeReason.value = ''
  reasonError.value = ''
  
  const title = inFavorOf === 'buyer'
    ? t('common.resolveForBuyer')
    : t('common.resolveForSeller')

  const message = inFavorOf === 'buyer'
    ? t('pages.admin.dealPage.resolveForBuyerMessage')
    : t('pages.admin.dealPage.resolveForSellerMessage')

  showConfirmDialog(title, message, async () => {
    isActionLoading.value = true
    try {
      const trimmedReason = disputeReason.value.trim()
      if (trimmedReason.length < 5) {
        reasonError.value = t('pages.admin.dealPage.reasonRequired')
        return
      }
      await adminService.resolveDealDispute(dealId, inFavorOf, trimmedReason)
      await loadDeals(true)
      showConfirmModal.value = false
    } catch (error) {
      console.error('Ошибка при решении спора:', error)
    } finally {
      isActionLoading.value = false
      processingDealId.value = null
    }
  }, { showReason: true })
}

let observer: IntersectionObserver
const sentinel = ref<HTMLElement | null>(null)

function setupIntersectionObserver() {
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]!.isIntersecting && !isFetchingMore.value && currentPage.value < totalPages.value) {
        loadMoreDeals()
      }
    },
    { root: null, rootMargin: '0px', threshold: 1.0 }
  )
  observer.observe(sentinel.value)
}

onMounted(async () => {
  await loadDeals(true)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  nextTick(() => setupIntersectionObserver())
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (observer && sentinel.value) observer.unobserve(sentinel.value)
})

watch([searchQuery, sortBy, statusFilter], () => {
  if (listRef.value) listRef.value.scrollTop = 0
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-lg sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.dealsPage.title') }}</h1>
      </div>
      <div class="text-xs sm:text-base text-text-secondary">
        {{ $t('common.total') }} {{ displayTotal }}
      </div>
    </div>

    <!-- Поиск -->
    <div class="w-full flex flex-col gap-2">
      <SearchField v-model="searchQuery" :placeholder="$t('pages.index.searchPlaceholder')" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CustomSelect
          v-model="sortBy"
          :options="[
            { value: 'created_desc', label: t('common.sortOptions.newest') },
            { value: 'created_asc', label: t('common.sortOptions.oldest') },
            { value: 'price_desc', label: t('common.sortOptions.priceHigh') },
            { value: 'price_asc', label: t('common.sortOptions.priceLow') },
            { value: 'status_asc', label: t('common.sortOptions.statusAsc') },
            { value: 'status_desc', label: t('common.sortOptions.statusDesc') },
          ]"
          :placeholder="$t('common.sortBy')"
        />
        <CustomSelect
          v-model="statusFilter"
          :options="[
            { value: 'all', label: t('common.all') },
            { value: 'pending', label: t('common.dealStatuses.pending') },
            { value: 'confirmed', label: t('common.dealStatuses.confirmed') },
            { value: 'disputed', label: t('common.dealStatuses.disputed') },
            { value: 'completed', label: t('common.dealStatuses.completed') },
            { value: 'cancelled', label: t('common.dealStatuses.cancelled') },
            { value: 'refunded', label: t('common.dealStatuses.refunded') },
          ]"
          :placeholder="$t('common.filters.status')"
        />
      </div>
    </div>

    <!-- Список сделок -->
    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 text-sm sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="sortedDeals.length === 0" class="flex items-center justify-center h-32">
        <div class="text-center">
          <div class="h-6 w-6 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-1 flex items-center justify-center">
            <span class="text-2xl">🤝</span>
          </div>
          <p class="text-text-secondary text-xs sm:text-base">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div ref="listRef" v-else class="h-full overflow-y-auto space-y-4">
        <!-- Карточка сделки -->
        <div v-for="deal in sortedDeals" :key="deal.id"
          class="bg-dark-600 border border-dark-700 rounded-xl p-4 hover:border-dark-500 transition-all duration-200">
          <div class="flex flex-col gap-4">
            <!-- Заголовок и статус -->
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <DealStatusTag :deal-status="deal.status" />
                <span class="text-xl font-bold text-green-400">{{ formatPrice(deal.price) }}</span>
              </div>
              <div class="flex gap-2">
                <button @click="goToChat(deal.chat_room_id)"
                  class="admin-btn admin-btn-primary admin-btn-sm"
                  :title="$t('common.viewDeal')">
                  <MessageCircleMore class="w-4 h-4" />
                  <span class="hidden sm:inline">{{ $t('common.toChat') }}</span>
                </button>

                <button @click="goToDeal(deal.id)"
                  class="admin-btn admin-btn-primary admin-btn-sm"
                  :title="$t('common.viewDeal')">
                  <Eye class="w-4 h-4" />
                  <span class="hidden sm:inline">{{ $t('common.view') }}</span>
                </button>
              </div>
            </div>

            <!-- Основная информация о товаре -->
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <img :src="getProductImageUrl(deal)" :alt="deal.product.title"
                  class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-dark-400 cursor-pointer"
                  @click="goToProduct(deal.product.id)" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg sm:text-xl font-semibold text-mainText line-clamp-2 mb-2 cursor-pointer"
                  @click="goToProduct(deal.product.id)">
                  {{ deal.product.title }}
                </h3>
                <div class="flex items-center gap-2 text-sm text-text-secondary mb-2">
                  <Folder class="w-4 h-4" />
                  <span>{{ deal.product.category.name }}</span>
                </div>
                <p class="text-sm text-text-secondary line-clamp-2 hidden sm:block">{{ deal.product.description }}</p>
              </div>
            </div>

            <!-- Участники сделки -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div @click="goToProfile(deal.seller.username)"
                class="bg-dark-700 hover:bg-dark-700/80 transition rounded-lg p-3 cursor-pointer">
                <div class="flex items-center gap-3">
                  <UserAvatar
                    :avatar-url="deal.seller.avatar_url"
                    :alt="deal.seller.username"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-text-secondary text-xs mb-1">{{ $t('common.seller') }}</div>
                    <div class="flex items-center gap-2">
                      <span class="text-mainText font-light truncate">{{ deal.seller.username }}</span>
                      <UserRating :rating="deal.seller.rating" />
                    </div>
                  </div>
                </div>
              </div>

              <div @click="goToProfile(deal.buyer.username)"
                class="bg-dark-700 hover:bg-dark-700/80 transition rounded-lg p-3 cursor-pointer">
                <div class="flex items-center gap-3">
                  <UserAvatar
                    :avatar-url="deal.buyer.avatar_url"
                    :alt="deal.buyer.username"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-text-secondary text-xs mb-1">{{ $t('common.buyer') }}</div>
                    <div class="flex items-center gap-2">
                      <span class="text-mainText font-light truncate">{{ deal.buyer.username }}</span>
                      <UserRating :rating="deal.buyer.rating" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Доп. информация -->
            <div class="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-text-secondary">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  <span>{{ $t('common.created') }}: {{ formatDate(deal.created_at) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Image class="w-3 h-3" />
                  <span>{{ $t('common.images') }}: {{ deal.product.images.length }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span>ID: {{ deal.id }}</span>
              </div>
            </div>

            <!-- Кнопки управления -->
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2 border-t border-dark-700">
              <template v-if="deal.status === 'pending'">
                <button @click="confirmDeal(deal.id)" :disabled="processingDealId === deal.id"
                  class="admin-btn admin-btn-success flex-1 sm:flex-none min-w-[140px]">
                  <Check class="w-4 h-4" />
                  <span>{{ $t('common.confirmDeal') }}</span>
                </button>
                <button @click="refundDeal(deal.id)" :disabled="processingDealId === deal.id"
                  class="admin-btn admin-btn-accent flex-1 sm:flex-none min-w-[140px]">
                  <Undo2 class="w-4 h-4" />
                  <span>{{ $t('pages.admin.dealsPage.refund') }}</span>
                </button>
              </template>

              <template v-else-if="deal.status === 'disputed'">
                <button @click="resolveDispute(deal.id, 'buyer')" :disabled="processingDealId === deal.id"
                  class="admin-btn admin-btn-success flex-1 sm:flex-none min-w-[160px]">
                  <UserCheck class="w-4 h-4" />
                  <span>{{ $t('common.resolveForBuyer') }}</span>
                </button>
                <button @click="resolveDispute(deal.id, 'seller')" :disabled="processingDealId === deal.id"
                  class="admin-btn admin-btn-primary flex-1 sm:flex-none min-w-[160px]">
                  <UserCheck class="w-4 h-4" />
                  <span>{{ $t('common.resolveForSeller') }}</span>
                </button>
              </template>

              <template v-else-if="deal.status === 'completed'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm">
                  <CheckCircle class="w-4 h-4" />
                  <span>{{ $t('common.dealCompleted') }}</span>
                </div>
              </template>

              <template v-else-if="deal.status === 'cancelled'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm">
                  <XCircle class="w-4 h-4" />
                  <span>{{ $t('common.dealCancelled') }}</span>
                </div>
              </template>

              <template v-else-if="deal.status === 'refunded'">
                <div class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-purple-300 rounded-lg text-sm">
                  <Undo2 class="w-4 h-4" />
                  <span>{{ $t('common.refundCompleted') }}</span>
                </div>
              </template>

              <button v-if="['pending', 'disputed'].includes(deal.status)" @click="cancelDeal(deal.id)" :disabled="processingDealId === deal.id"
                class="admin-btn admin-btn-danger flex-1 sm:flex-none min-w-[140px] sm:ml-auto">
                <XCircle class="w-4 h-4" />
                <span>{{ $t('common.cancelDeal') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sentinel для infinity scroll -->
        <div ref="sentinel" class="h-4 w-full"></div>

        <!-- Спиннер при подгрузке -->
        <div v-if="isFetchingMore" class="flex items-center justify-center py-4">
          <Loader2 class="w-5 h-5 animate-spin text-blue-500" />
        </div>
      </div>
    </div>
  </section>

  <!-- Confirm Modal -->
  <ConfirmWindow
    :is-open="showConfirmModal"
    :title="confirmTitle"
    :message="confirmMessage"
    :is-loading="isActionLoading"
    @confirm="confirmAction"
    @cancel="() => { showConfirmModal = false; processingDealId = null }"
  >
    <template #body>
      <div v-if="showReasonField" class="space-y-2">
        <label class="block text-sm text-gray-300">
          {{ $t('pages.admin.dealPage.disputeReasonLabel') }}
        </label>
        <textarea
          v-model="disputeReason"
          class="w-full rounded-lg bg-dark-900 border border-dark-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[110px]"
          :placeholder="$t('pages.admin.dealPage.disputeReasonPlaceholder')"
        />
        <p v-if="reasonError" class="text-red-400 text-sm">
          {{ reasonError }}
        </p>
      </div>
    </template>
  </ConfirmWindow>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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
