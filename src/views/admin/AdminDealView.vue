<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import { useImages } from '@/composables/useImages'
import DealStatusTag from '@/components/DealStatusTag.vue'
import UserRating from '@/components/UserRating.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Данные
const deal = ref<Deal | null>(null)
const isLoading = ref(true)
const isActionLoading = ref(false)
const errorMessage = ref('')
const showConfirmModal = ref(false)
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve())
const confirmTitle = ref('')
const confirmMessage = ref('')

const { images } = useImages()
const API_HOST = import.meta.env.VITE_API_HOST || ''

// Форматирование
function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(price)
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

function goToChat(dealId: string) {
  router.push({ name: 'adminChatView', params: { dealId } })
}

// URL изображений
function getProductImageUrl() {
  if (!deal.value || deal.value.product.images.length === 0) return '/placeholder-product.jpg'
  return `${API_HOST}${deal.value.product.images[0]!.image_url}`
}

function getUserAvatarUrl(avatarUrl: string) {
  return avatarUrl ? `${API_HOST}${avatarUrl}` : images.avatars.default
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
function showConfirmDialog(title: string, message: string, action: () => Promise<void>) {
  confirmTitle.value = title
  confirmMessage.value = message
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

  const title = inFavorOf === 'buyer'
    ? t('common.resolveForBuyer')
    : t('common.resolveForSeller')

  const message = inFavorOf === 'buyer'
    ? t('pages.admin.dealPage.resolveForBuyerMessage')
    : t('pages.admin.dealPage.resolveForSellerMessage')

  showConfirmDialog(title, message, async () => {
    isActionLoading.value = true
    try {
      await adminService.resolveDealDispute(deal.value!.id, inFavorOf)
      await loadDeal()
    } catch (error) {
      console.error(error)
    } finally {
      isActionLoading.value = false
    }
  })
}

// Инициализация
onMounted(async () => {
  await loadDeal()
})
</script>

<template>
  <div class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex items-center gap-3 mb-4">
        <button @click="goBack" class="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors">
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
              <button @click="goBack" class="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors">
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
                  class="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
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
                  <img :src="getUserAvatarUrl(deal.seller.avatar_url)" :alt="deal.seller.username"
                    class="w-14 h-14 rounded-full object-cover border-2 border-green-500/30 cursor-pointer"
                    @click="goToProfile(deal.seller.username)" />
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
                  <img :src="getUserAvatarUrl(deal.buyer.avatar_url)" :alt="deal.buyer.username"
                    class="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30 cursor-pointer"
                    @click="goToProfile(deal.buyer.username)" />
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
                <!-- Pending deals -->
                <template v-if="deal.status === 'pending'">
                  <button @click="confirmDealAction" :disabled="isActionLoading"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors">
                    <CheckCircle class="w-5 h-5" />
                    <span>{{ $t('common.confirmDeal') }}</span>
                  </button>

                  <button @click="refundDealAction" :disabled="isActionLoading"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors">
                    <Undo2 class="w-5 h-5" />
                    <span>{{ $t('pages.admin.dealsPage.refund') }}</span>
                  </button>
                </template>

                <!-- Disputed deals -->
                <template v-else-if="deal.status === 'disputed'">
                  <button @click="resolveDispute('buyer')" :disabled="isActionLoading"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors">
                    <UserCheck class="w-5 h-5" />
                    <span>{{ $t('common.resolveForBuyer') }}</span>
                  </button>

                  <button @click="resolveDispute('seller')" :disabled="isActionLoading"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors">
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
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors">
                  <XCircle class="w-5 h-5" />
                  <span>{{ $t('common.cancelDeal') }}</span>
                </button>

                <button @click="goToChat(deal.id)"
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-green-800 text-white rounded-lg transition-colors">
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
  <ConfirmWindow :is-open="showConfirmModal" :title="confirmTitle" :message="confirmMessage"
    :is-loading="isActionLoading" @confirm="async () => {
      await confirmAction()
      showConfirmModal = false
    }" @cancel="showConfirmModal = false" />
</template>

<style>
. {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.::-webkit-scrollbar {
  display: none;
}

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
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
    margin: 10px 0;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .lg\:overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>