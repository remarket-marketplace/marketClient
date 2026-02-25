<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserCheck,
  Undo2,
  Calendar,
  User,
  Package,
  CreditCard,
  Shield,
  MessageSquare,
  Loader2,
  ExternalLink, 
  MessageCircleMore
} from 'lucide-vue-next'
import { adminService } from '@/api/admin/AdminService'
import type { Deal } from '@/validation/deal/deal'
import DealStatusTag from '@/components/DealStatusTag.vue'
import UserRating from '@/components/UserRating.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import { formatCurrencyAmount } from '@/utils/currency'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Данные
const deal = ref<Deal | null>(null)
const isLoading = ref(true)
const isActionLoading = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const actionSuccess = ref('')
const showConfirmModal = ref(false)
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve())
const confirmTitle = ref('')
const confirmMessage = ref('')
const showReasonField = ref(false)
const disputeReason = ref('')
const reasonError = ref('')
const selectedForcedStatus = ref<string>('pending')
const isForcedStatusUpdating = ref(false)

const API_HOST = import.meta.env.VITE_API_HOST || ''

const dealStatusOptions = computed(() => ([
  { value: 'pending', label: t('common.dealStatuses.pending') },
  { value: 'confirmed', label: t('common.dealStatuses.confirmed') },
  { value: 'disputed', label: t('common.dealStatuses.disputed') },
  { value: 'completed', label: t('common.dealStatuses.completed') },
  { value: 'cancelled', label: t('common.dealStatuses.cancelled') },
  { value: 'refunded', label: t('common.dealStatuses.refunded') },
]))

// Форматирование
function formatPrice(price: number) {
  return formatCurrencyAmount(price)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goToChat(chatId: string) {
  router.push({ name: 'adminChatView', params: { chatId } })
}

// URL изображений
function getProductImageUrl() {
  if (!deal.value || deal.value.product.images.length === 0) return '/placeholder-product.jpg'
  return `${API_HOST}${deal.value.product.images[0]!.image_url}`
}

// Навигация
function goBack() {
  router.push('/admin/deals')
}

function goToProfile(username: string) {
  router.push(`/user/${username}`)
}

function goToProduct(productId: string) {
  router.push(`/product/${productId}`)
}

// Загрузка данных
async function loadDeal() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const dealId = route.params.id as string
    const response = await adminService.getDealById(dealId)

    if (response) {
      deal.value = response
      selectedForcedStatus.value = response.status
    } else {
      errorMessage.value = t('common.notFound')
    }
  } catch (error) {
    console.error('Ошибка при загрузке сделки:', error)
    errorMessage.value = t('common.error')
  } finally {
    isLoading.value = false
  }
}

// Действия администратора
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

async function confirmDealAction() {
  if (!deal.value) return

  showConfirmDialog(
    t('common.confirmDeal'),
    t('pages.admin.dealPage.confirmDealMessage'),
    async () => {
      isActionLoading.value = true
      try {
        await adminService.confirmDeal(deal.value!.id)
        await loadDeal()
        showConfirmModal.value = false
      } catch (error) {
        console.error(error)
      } finally {
        isActionLoading.value = false
      }
    }
  )
}

async function refundDealAction() {
  if (!deal.value) return

  showConfirmDialog(
    t('pages.admin.dealsPage.refund'),
    t('pages.admin.dealPage.refundDealMessage'),
    async () => {
      isActionLoading.value = true
      try {
        await adminService.refundDeal(deal.value!.id)
        await loadDeal()
        showConfirmModal.value = false
      } catch (error) {
        console.error(error)
      } finally {
        isActionLoading.value = false
      }
    }
  )
}

async function cancelDealAction() {
  if (!deal.value) return

  showConfirmDialog(
    t('common.cancelDeal'),
    t('pages.admin.dealPage.cancelDealMessage'),
    async () => {
      isActionLoading.value = true
      try {
        await adminService.cancelDeal(deal.value!.id)
        await loadDeal()
        showConfirmModal.value = false
      } catch (error) {
        console.error(error)
      } finally {
        isActionLoading.value = false
      }
    }
  )
}

async function resolveDispute(inFavorOf: 'buyer' | 'seller') {
  if (!deal.value) return
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
    actionError.value = ''
    actionSuccess.value = ''
    try {
      const trimmedReason = disputeReason.value.trim()
      if (trimmedReason.length < 5) {
        reasonError.value = t('pages.admin.dealPage.reasonRequired')
        return
      }
      const res = await adminService.resolveDealDispute(deal.value!.id, inFavorOf, trimmedReason)
      if (!res) {
        actionError.value = t('errors.SERVER_ERROR')
      } else {
        actionSuccess.value = t('common.success')
        await loadDeal()
        showConfirmModal.value = false
      }
    } catch (error) {
      console.error(error)
      actionError.value = t('errors.SERVER_ERROR')
    } finally {
      isActionLoading.value = false
    }
  }, { showReason: true })
}

function forceUpdateDealStatus() {
  if (!deal.value) return

  const statusLabel = t(`common.dealStatuses.${selectedForcedStatus.value}`)

  showConfirmDialog(
    t('common.status'),
    `${t('common.status')}: ${statusLabel}`,
    async () => {
      isActionLoading.value = true
      isForcedStatusUpdating.value = true
      actionError.value = ''
      actionSuccess.value = ''
      try {
        const res = await adminService.updateDealStatus(
          deal.value!.id,
          selectedForcedStatus.value
        )
        if (!res) {
          actionError.value = t('errors.SERVER_ERROR')
          return
        }
        actionSuccess.value = t('common.saved')
        await loadDeal()
        showConfirmModal.value = false
      } catch (error) {
        console.error(error)
        actionError.value = t('errors.SERVER_ERROR')
      } finally {
        isActionLoading.value = false
        isForcedStatusUpdating.value = false
      }
    }
  )
}

// Инициализация
onMounted(async () => {
  await loadDeal()
})
</script>

<template>
  <div class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
    <div v-if="actionError" class="mx-4 mt-4 bg-red-500/15 border border-red-500/30 text-red-100 px-3 py-2 rounded-lg">
      {{ actionError }}
    </div>
    <div v-if="actionSuccess" class="mx-4 mt-2 bg-green-500/15 border border-green-500/30 text-green-100 px-3 py-2 rounded-lg">
      {{ actionSuccess }}
    </div>
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex items-center gap-3 mb-4">
        <button @click="goBack" class="admin-btn admin-btn-ghost admin-btn-icon">
          <ArrowLeft class="w-5 h-5 text-white" />
        </button>
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.admin.dealPage.title') }}
        </h1>
      </div>
      <div v-if="deal" class="flex items-center gap-3">
        <DealStatusTag :deal-status="deal.status" />
        <span class="text-xl font-bold text-green-400">
          {{ formatPrice(deal.price) }}
        </span>
      </div>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:h-full">
      <!-- Left column - Main information -->
      <div class="lg:flex-1 overflow-y-auto  lg:pr-6 lg:pt-6">
        <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
          <!-- Desktop header -->
          <div class="hidden lg:flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <button @click="goBack" class="admin-btn admin-btn-ghost admin-btn-icon">
                <ArrowLeft class="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 class="text-2xl font-bold text-white">
                  {{ $t('pages.admin.dealPage.title') }}
                </h1>
                <p class="mt-1 text-sm text-gray-400">
                  ID: {{ deal?.id }}
                </p>
              </div>
            </div>
            <div v-if="deal" class="flex items-center gap-4">
              <DealStatusTag :deal-status="deal.status" />
              <span class="text-2xl font-bold text-green-400">
                {{ formatPrice(deal.price) }}
              </span>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="isLoading" class="flex items-center justify-center h-64">
            <Loader2 class="h-8 w-8 animate-spin text-blue-500" />
            <span class="ml-3 text-lg text-gray-400">{{ $t('common.loading') }}</span>
          </div>

          <!-- Error state -->
          <div v-else-if="errorMessage" class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p class="text-red-400 text-center">{{ errorMessage }}</p>
          </div>

          <!-- Deal information -->
          <div v-else-if="deal" class="space-y-6">
            <!-- Product card -->
            <div class="bg-dark-600 border border-dark-700 rounded-xl p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                  <Package class="w-5 h-5 text-blue-400" />
                  {{ $t('pages.admin.dealPage.productInfo') }}
                </h2>
                <button @click="goToProduct(deal.product.id)"
                  class="admin-btn admin-btn-primary admin-btn-sm">
                  <ExternalLink class="w-4 h-4" />
                  {{ $t('common.view') }}
                </button>
              </div>

              <div class="flex gap-4">
                <!-- Product image -->
                <div class="flex-shrink-0">
                  <img :src="getProductImageUrl()" :alt="deal.product.title"
                    class="w-24 h-24 rounded-lg object-cover border border-dark-400 cursor-pointer"
                    @click="goToProduct(deal.product.id)" />
                </div>

                <!-- Product details -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-xl font-semibold text-white mb-2 line-clamp-2 cursor-pointer"
                    @click="goToProduct(deal.product.id)">
                    {{ deal.product.title }}
                  </h3>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                      <span class="font-medium text-gray-300">{{ $t('common.category') }}:</span>
                      <span>{{ deal.product.category.name }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                      <span class="font-medium text-gray-300">{{ $t('common.quantity') }}:</span>
                      <span>{{ deal.product.count }} {{ $t('common.items') }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                      <span class="font-medium text-gray-300">{{ $t('common.price') }}:</span>
                      <span>{{ formatPrice(deal.product.price) }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                      <span class="font-medium text-gray-300">{{ $t('common.status') }}:</span>
                      <ProductStatusTag :product-status="deal.product.status" />
                    </div>
                  </div>

                  <p class="text-sm text-gray-300 line-clamp-3">
                    {{ deal.product.description }}
                  </p>
                </div>
              </div>

              <!-- Product data -->
              <div v-if="deal.product.product_data_string" class="mt-4 pt-4 border-t border-dark-700">
                <h4 class="text-sm font-medium text-gray-300 mb-2">{{ $t('pages.forms.createProduct.productData') }}:
                </h4>
                <pre
                  class="text-sm text-gray-400 bg-dark-700/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
{{ deal.product.product_data_string }}
                </pre>
              </div>
            </div>

            <!-- Participants -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Seller -->
              <div class="bg-dark-600 border border-dark-700 rounded-xl p-5">
                <h3 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <User class="w-5 h-5 text-green-400" />
                  {{ $t('common.seller') }}
                </h3>

                <div class="flex items-center gap-3 mb-4">
                  <UserAvatar
                    :avatar-url="deal.seller.avatar_url"
                    :alt="deal.seller.username"
                    class="w-14 h-14 rounded-full object-cover border-2 border-green-500/30 cursor-pointer"
                    @click="goToProfile(deal.seller.username)"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-lg font-semibold text-white truncate cursor-pointer"
                        @click="goToProfile(deal.seller.username)">
                        {{ deal.seller.username }}
                      </span>
                      <UserRating :rating="deal.seller.rating" />
                    </div>
                    <p class="text-sm text-gray-400">
                      {{ deal.seller.email }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="space-y-1">
                    <span class="text-gray-400">{{ $t('common.memberSince') }}:</span>
                    <span class="text-white block">{{ formatDate(deal.seller.created_at.toString()) }}</span>
                  </div>
                  <div class="space-y-1">
                    <span class="text-gray-400">{{ $t('common.role') }}:</span>
                    <span class="text-white block">{{ deal.seller.role }}</span>
                  </div>
                </div>
              </div>

              <!-- Buyer -->
              <div class="bg-dark-600 border border-dark-700 rounded-xl p-5">
                <h3 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <User class="w-5 h-5 text-blue-400" />
                  {{ $t('common.buyer') }}
                </h3>

                <div class="flex items-center gap-3 mb-4">
                  <UserAvatar
                    :avatar-url="deal.buyer.avatar_url"
                    :alt="deal.buyer.username"
                    class="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30 cursor-pointer"
                    @click="goToProfile(deal.buyer.username)"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-lg font-semibold text-white truncate cursor-pointer"
                        @click="goToProfile(deal.buyer.username)">
                        {{ deal.buyer.username }}
                      </span>
                      <UserRating :rating="deal.buyer.rating" />
                    </div>
                    <p class="text-sm text-gray-400">
                      {{ deal.buyer.email }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="space-y-1">
                    <span class="text-gray-400">{{ $t('common.memberSince') }}:</span>
                    <span class="text-white block">{{ formatDate(deal.buyer.created_at.toString()) }}</span>
                  </div>
                  <div class="space-y-1">
                    <span class="text-gray-400">{{ $t('common.role') }}:</span>
                    <span class="text-white block">{{ deal.buyer.role }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deal details -->
            <div class="bg-dark-600 border border-dark-700 rounded-xl p-5">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <CreditCard class="w-5 h-5 text-yellow-400" />
                {{ $t('pages.admin.dealPage.dealDetails') }}
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="space-y-2">
                  <span class="text-sm text-gray-400">{{ $t('common.created') }}:</span>
                  <div class="flex items-center gap-2 text-white">
                    <Calendar class="w-4 h-4 text-gray-400" />
                    <span>{{ formatDate(deal.created_at) }}</span>
                  </div>
                </div>

                <div class="space-y-2 space-x-2">
                  <span class="text-sm text-gray-400">{{ $t('common.status') }}:</span>
                  <DealStatusTag :deal-status="deal.status" />
                </div>
              </div>
            </div>

            <!-- Report section (only for disputed deals) -->
            <div v-if="deal.status === 'disputed' && deal.refusal_reason"
              class="bg-dark-600 border border-red-500/30 rounded-xl p-5">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Shield class="w-5 h-5 text-red-400" />
                {{ $t('pages.admin.dealPage.reportInfo') }}
              </h3>

              <div class="space-y-4">
                <div>
                  <span class="text-sm text-gray-400">{{ $t('common.reason') }}:</span>
                  <p class="text-white mt-1 font-medium">
                    {{ $t(`common.refusalReasons.${deal.refusal_reason.refusal_reason_title}`) }}
                  </p>
                </div>

                <div v-if="deal.refusal_reason.refusal_reason_title === 'otherReason' && deal.refusal_reason.text">
                  <span class="text-sm text-gray-400">{{ $t('pages.admin.dealPage.customReason') }}:</span>
                  <div class="mt-2 p-3 bg-dark-700/50 rounded-lg border border-gray-700">
                    <p class="text-gray-300 whitespace-pre-wrap">{{ deal.refusal_reason.text }}</p>
                  </div>
                </div>

                <div class="pt-4 border-t border-dark-700">
                  <div class="flex items-center gap-2 text-sm text-gray-400">
                    <MessageSquare class="w-4 h-4" />
                    <span>{{ $t('pages.admin.dealPage.reportId') }}: {{ deal.id }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right sidebar - Admin actions -->
      <div
        class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-full lg:border-l border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pl-6">
        <div class="pt-6 lg:pt-0">
          <div class="space-y-6 pb-6 lg:pb-0">
            <!-- Admin actions -->
            <div v-if="deal" class="rounded-xl border border-dark-700 bg-dark-600/40 p-5 space-y-4">
              <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                <Shield class="w-4 h-4 text-blue-400" />
                {{ $t('pages.admin.dealPage.adminActions') }}
              </h3>

              <!-- Actions based on deal status -->
              <div class="space-y-3">
                <div class="space-y-2 pb-2 border-b border-dark-700">
                  <CustomSelect
                    v-model="selectedForcedStatus"
                    :options="dealStatusOptions"
                    :placeholder="$t('common.filters.status')"
                  />
                  <button
                    @click="forceUpdateDealStatus"
                    :disabled="isActionLoading || isForcedStatusUpdating"
                    class="admin-btn admin-btn-ghost w-full py-3"
                  >
                    <span>{{ $t('common.save') }}</span>
                  </button>
                </div>

                <!-- Pending deals -->
                <template v-if="deal.status === 'pending'">
                  <button @click="confirmDealAction" :disabled="isActionLoading"
                    class="admin-btn admin-btn-success w-full py-3">
                    <CheckCircle class="w-5 h-5" />
                    <span>{{ $t('common.confirmDeal') }}</span>
                  </button>

                  <button @click="refundDealAction" :disabled="isActionLoading"
                    class="admin-btn admin-btn-accent w-full py-3">
                    <Undo2 class="w-5 h-5" />
                    <span>{{ $t('pages.admin.dealsPage.refund') }}</span>
                  </button>
                </template>

                <!-- Disputed deals -->
                <template v-else-if="deal.status === 'disputed'">
                  <button @click="resolveDispute('buyer')" :disabled="isActionLoading"
                    class="admin-btn admin-btn-success w-full py-3">
                    <UserCheck class="w-5 h-5" />
                    <span>{{ $t('common.resolveForBuyer') }}</span>
                  </button>

                  <button @click="resolveDispute('seller')" :disabled="isActionLoading"
                    class="admin-btn admin-btn-primary w-full py-3">
                    <UserCheck class="w-5 h-5" />
                    <span>{{ $t('common.resolveForSeller') }}</span>
                  </button>
                </template>

                <!-- Other statuses - informational -->
                <template v-else>
                  <div class="text-center py-3 px-4 rounded-lg bg-gray-600 text-gray-300">
                    <div class="flex items-center justify-center gap-2">
                      <CheckCircle v-if="deal.status === 'completed'" class="w-5 h-5 text-green-400" />
                      <Undo2 v-else-if="deal.status === 'refunded'" class="w-5 h-5 text-purple-400" />
                      <XCircle v-else class="w-5 h-5 text-red-400" />
                      <span>
                        {{
                          deal.status === 'completed' ? $t('common.dealCompleted') :
                            deal.status === 'refunded' ? $t('common.refundCompleted') :
                              deal.status === 'cancelled' ? $t('common.dealCancelled') :
                                $t('common.status') + ': ' + deal.status
                        }}
                      </span>
                    </div>
                  </div>
                </template>

                <!-- Cancel button (for pending and disputed) -->
                <button v-if="['pending', 'disputed'].includes(deal.status)" @click="cancelDealAction"
                  :disabled="isActionLoading"
                  class="admin-btn admin-btn-danger w-full py-3">
                  <XCircle class="w-5 h-5" />
                  <span>{{ $t('common.cancelDeal') }}</span>
                </button>

                <button @click="goToChat(deal.chat_room_id)"
                  class="admin-btn admin-btn-primary w-full py-3">
                  <MessageCircleMore class="w-4 h-4" />
                  <span class="hidden sm:inline">{{ $t('common.toChat') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirm Modal -->
  <ConfirmWindow
    :is-open="showConfirmModal"
    :title="confirmTitle"
    :message="confirmMessage"
    :is-loading="isActionLoading"
    @confirm="confirmAction"
    @cancel="showConfirmModal = false"
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

<style>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>
