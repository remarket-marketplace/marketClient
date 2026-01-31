<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Wallet as WalletIcon,
  CreditCard,
  Banknote,
  History,
  Loader2
} from 'lucide-vue-next'
import { walletService } from '@/api/wallet/walletService'
import type { Balance, WalletHistoryItem } from '@/validation/wallet/wallet'
import BackButton from '@/components/navigation/BackButton.vue'

const { t } = useI18n()

const balance = ref(0)
const isLoading = ref(false)

const historyItems = ref<WalletHistoryItem[]>([])
const page = ref(1)
const perPage = 10
const totalPages = ref(1)
const isFetchingTransactions = ref(false)

const depositAmount = ref('')
const withdrawAmount = ref('')

// New states for modals
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)

onMounted(async () => {
  isLoading.value = true

  const userBalance: Balance | null = await walletService.getUserBalance()
  if (userBalance) {
    balance.value = userBalance.balance
  }

  await loadHistory()
  isLoading.value = false
})

const loadHistory = async () => {
  if (isFetchingTransactions.value) return
  if (page.value > totalPages.value) return

  isFetchingTransactions.value = true

  const response = await walletService.getHistory(page.value, perPage)

  if (response) {
    historyItems.value.push(...response.items)
    totalPages.value = response.total_pages
    page.value++
  }

  isFetchingTransactions.value = false
}

const handleScroll = async (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    await loadHistory()
  }
}

const handleDeposit = async () => {
  if (!depositAmount.value || parseFloat(depositAmount.value) <= 0) return

  isLoading.value = true
  const paymentUrl = await walletService.TopUpUserBalance(
    parseInt(depositAmount.value)
  )

  if (paymentUrl) {
    window.location.href = paymentUrl.payment_url
  }

  isLoading.value = false
  showDepositModal.value = false
}

const handleWithdraw = () => {
  if (!withdrawAmount.value) return

  const amount = parseFloat(withdrawAmount.value)
  if (amount <= 0 || amount > balance.value) return

  isLoading.value = true

  setTimeout(() => {
    balance.value -= amount
    withdrawAmount.value = ''
    isLoading.value = false
    showWithdrawModal.value = false
  }, 1000)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'confirmed':
      return CheckCircle
    case 'pending':
      return Clock
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return XCircle
    default:
      return Clock
  }
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'confirmed':
      return 'text-green-400'
    case 'pending':
      return 'text-yellow-400'
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

const getStatusText = (status: string, type: string) => {
  const map: Record<string, string> = {
    completed: 'Завершено',
    confirmed: 'Завершено',
    pending: 'В обработке',
    rejected: 'Отклонено',
    cancelled: 'Отменено',
    canceled: 'Отменено',
    refunded: 'Возврат',
  }
  if (type === 'purchase' && status === 'pending') return 'Заморожено'
  return map[status.toLowerCase()] ?? status
}

const getTypeIcon = (item: WalletHistoryItem) => {
  return (item.amount ?? 0) >= 0 ? Plus : Minus
}

const getTypeColor = (item: WalletHistoryItem) => {
  return (item.amount ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
}

const formatSigned = (amount: number) => {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${formatCurrency(amount)}`
}

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    top_up: t('pages.walletTypes.top_up'),
    purchase: t('pages.walletTypes.purchase'),
    sale: t('pages.walletTypes.sale'),
    refund: t('pages.walletTypes.refund'),
    withdrawal: t('pages.walletTypes.withdrawal'),
    adjustment: t('pages.walletTypes.adjustment'),
  }
  return map[type] ?? type
}
</script>

<template>
  <div class="w-full h-full overflow-scroll  lg:overflow-hidden pb-16 md:pb-0">
    <!-- Mobile header -->
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-white">
          {{ $t('pages.wallet.title') }}
        </h1>
      </div>
    </div>

    <!-- Desktop layout -->
    <div class="lg:flex lg:h-full">
      <!-- Left column - Wallet info -->
      <div class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-full lg:border-r border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pr-6">
        <div class="pt-6 lg:pt-0">
          <div class="space-y-6">
            <!-- Desktop header -->
            <div class="hidden lg:block">
              <div class="flex gap-2">
                <BackButton />
                <h1 class="text-2xl font-bold text-white">
                  {{ $t('pages.wallet.title') }}
                </h1>
              </div>
            </div>

            <!-- Balance card -->
            <div class="rounded-xl border border-dark-700 bg-dark-600/40 p-6 space-y-6">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <div class="text-sm text-gray-300 font-medium">{{ $t('pages.wallet.currentBalance') }}</div>
                  <div class="text-3xl font-bold text-green-400">{{ formatCurrency(balance) }}</div>
                </div>
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <WalletIcon class="w-6 h-6 text-white" />
                </div>
              </div>

              <!-- Quick actions -->
              <div class="grid grid-cols-2 gap-3">
                <button 
                  @click="showDepositModal = true"
                  class="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-all duration-200"
                >
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <ArrowDownToLine class="w-5 h-5 text-white" />
                  </div>
                  <span class="text-sm font-medium text-white">{{ $t('pages.wallet.deposit') }}</span>
                </button>

                <button 
                  @click="showWithdrawModal = true"
                  class="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-all duration-200"
                >
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <ArrowUpFromLine class="w-5 h-5 text-white" />
                  </div>
                  <span class="text-sm font-medium text-white">{{ $t('pages.wallet.withdraw') }}</span>
                </button>
              </div>
            </div>

            <!-- Info cards -->
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-4 rounded-lg border border-dark-600 bg-dark-700/30">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <CreditCard class="w-4 h-4 text-blue-400" />
                </div>
                <div class="space-y-1">
                  <div class="text-sm font-medium text-gray-300">{{ $t('pages.wallet.instantDeposit') }}</div>
                  <div class="text-xs text-gray-400">{{ $t('pages.wallet.instantDepositHint') }}</div>
                </div>
              </div>

              <div class="flex items-center gap-3 p-4 rounded-lg border border-dark-600 bg-dark-700/30">
                <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Banknote class="w-4 h-4 text-green-400" />
                </div>
                <div class="space-y-1">
                  <div class="text-sm font-medium text-gray-300">{{ $t('pages.wallet.fastWithdrawal') }}</div>
                  <div class="text-xs text-gray-400">{{ $t('pages.wallet.fastWithdrawalHint') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column - Transactions -->
      <div class="lg:flex-1 overflow-y-auto  mt-6 lg:mt-0 lg:pt-6 lg:pl-6">
        <div class="px-4 lg:px-0 lg:pb-6 space-y-6">
          <!-- Transactions header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <History class="w-5 h-5 text-gray-400" />
              <h2 class="text-xl font-bold text-white">{{ $t('pages.wallet.transactionHistory') }}</h2>
            </div>
            <div class="text-sm text-gray-400">
              {{ $t('pages.wallet.totalTransactions', { count: historyItems.length }) }}
            </div>
          </div>

          <!-- Transactions list -->
          <div 
            class="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-2"
            @scroll="handleScroll"
          >
            <div v-if="isLoading && historyItems.length === 0" class="flex items-center justify-center py-12">
              <Loader2 class="w-6 h-6 animate-spin text-blue-500" />
            </div>

            <div v-else-if="historyItems.length === 0" class="text-center py-12">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
                <History class="w-8 h-8 text-gray-500" />
              </div>
              <h3 class="text-lg font-semibold text-gray-300 mb-2">{{ $t('pages.wallet.noTransactions') }}</h3>
              <p class="text-sm text-gray-400 max-w-md mx-auto">
                {{ $t('pages.wallet.noTransactionsHint') }}
              </p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="tx in historyItems"
                :key="tx.id"
                class="group border border-dark-700 rounded-xl bg-dark-600/40 hover:bg-dark-600/60 hover:border-blue-500/30 transition-all duration-200 p-4"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div class="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                        <component
                          :is="getTypeIcon(tx)"
                          :class="`w-5 h-5 ${getTypeColor(tx)}`"
                        />
                      </div>
                      <div class="absolute -bottom-1 -right-1">
                        <component
                          :is="getStatusIcon(tx.status)"
                          :class="`w-4 h-4 ${getStatusColor(tx.status)}`"
                        />
                      </div>
                    </div>
                    
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-white">
                        {{ formatSigned(tx.amount) }}
                      </div>
                      <div class="text-xs text-gray-400">
                        {{ formatDate(tx.created_at) }}
                      </div>
                      <div class="text-xs text-gray-500" v-if="tx.title">
                        <router-link v-if="tx.product_id" :to="`/product/${tx.product_id}`" class="text-blue-400 hover:underline">
                          {{ tx.title }}
                        </router-link>
                        <span v-else>{{ tx.title }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-sm px-2 py-1 rounded-full bg-dark-700 text-gray-300">
                      {{ getStatusText(tx.status, tx.type) }}
                    </span>
                    <span class="text-xs px-2 py-1 rounded-full bg-dark-700/60 text-gray-400 border border-dark-600">
                      {{ typeLabel(tx.type) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="isFetchingTransactions"
              class="flex items-center justify-center py-4"
            >
              <Loader2 class="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span class="text-sm text-gray-400">{{ $t('common.loading') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Deposit Modal -->
    <Teleport to="body">
      <div 
        v-if="showDepositModal" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      >
        <div class="relative w-full max-w-md border border-dark-600 rounded-2xl bg-dark-800/95 backdrop-blur-sm p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <ArrowDownToLine class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-xl font-bold text-white">{{ $t('pages.wallet.deposit') }}</h3>
            </div>
            <button 
              @click="showDepositModal = false"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-colors"
            >
              <XCircle class="w-4 h-4 text-gray-300" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">
                {{ $t('pages.wallet.depositAmount') }}
              </label>
              <div class="relative">
                <input
                  v-model="depositAmount"
                  type="number"
                  min="10"
                  max="100000"
                  placeholder="0"
                  class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  ₽
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-2">
                {{ $t('pages.wallet.depositMin', { amount: '10₽' }) }}
              </p>
            </div>

            <button
              @click="handleDeposit"
              :disabled="!depositAmount || parseFloat(depositAmount) < 1 || isLoading"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin text-white" />
                {{ $t('common.loading') }}
              </span>
              <span v-else>
                {{ $t('pages.wallet.proceedToPayment') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Withdraw Modal -->
    <Teleport to="body">
      <div 
        v-if="showWithdrawModal" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      >
        <div class="relative w-full max-w-md border border-dark-600 rounded-2xl bg-dark-800/95 backdrop-blur-sm p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <ArrowUpFromLine class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-xl font-bold text-white">{{ $t('pages.wallet.withdraw') }}</h3>
            </div>
            <button 
              @click="showWithdrawModal = false"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-colors"
            >
              <XCircle class="w-4 h-4 text-gray-300" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">
                {{ $t('pages.wallet.withdrawAmount') }}
              </label>
              <div class="relative">
                <input
                  v-model="withdrawAmount"
                  type="number"
                  :max="balance"
                  min="10"
                  placeholder="0"
                  class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  ₽
                </div>
              </div>
              <div class="flex items-center justify-between text-xs mt-2">
                <span class="text-gray-400">
                  {{ $t('pages.wallet.available') }}: <span class="text-green-400">{{ formatCurrency(balance) }}</span>
                </span>
                <button 
                  @click="withdrawAmount = balance.toString()"
                  class="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {{ $t('pages.wallet.useAll') }}
                </button>
              </div>
            </div>

            <button
              @click="handleWithdraw"
              :disabled="!withdrawAmount || parseFloat(withdrawAmount) < 1 || parseFloat(withdrawAmount) > balance || isLoading"
              class="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-3.5 text-white font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-red-500/20"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin text-white" />
                {{ $t('common.loading') }}
              </span>
              <span v-else>
                {{ $t('pages.wallet.confirmWithdrawal') }}
              </span>
            </button>
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

/* Custom scrollbar for transactions */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Ensure proper scrolling on mobile */
@media (max-width: 1023px) {
  .lg\:sticky {
    position: static;
  }
}
</style>
