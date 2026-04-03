<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Clock,
  CheckCircle,
  Flame,
  X,
  XCircle,
  Plus,
  Minus,
  Wallet as WalletIcon,
  CreditCard,
  Banknote,
  History,
  Landmark,
  Loader2,
  Gamepad2,
} from 'lucide-vue-next'
import { walletService } from '@/api/wallet/walletService'
import type { Balance, WalletHistoryItem, WalletTopUpProvider } from '@/validation/wallet/wallet'
import BackButton from '@/components/navigation/BackButton.vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencySymbol,
  preferredCurrency,
} from '@/utils/currency'
import { getErrorMessage } from '@/utils/errorsMap'
import { buildSlugKey } from '@/utils/urlKeys'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const balance = ref(0)
const isLoading = ref(false)

const historyItems = ref<WalletHistoryItem[]>([])
const expandedTransactionId = ref<string | null>(null)
const page = ref(1)
const perPage = 10
const totalPages = ref(1)
const isFetchingTransactions = ref(false)
const minDepositRub = ref(10)
const maxDepositRub = ref(100000)
const defaultDepositProvider: WalletTopUpProvider = 'platega'
const availableDepositProviders = ref<WalletTopUpProvider[]>([defaultDepositProvider])
const selectedDepositProvider = ref<WalletTopUpProvider>(defaultDepositProvider)
const depositErrorMessage = ref<string | null>(null)

const depositAmount = ref('')
const withdrawAmount = ref('')
const withdrawCardNumber = ref('')
const withdrawErrorMessage = ref<string | null>(null)
const withdrawSuccessMessage = ref<string | null>(null)
const selectedCurrency = computed(() => preferredCurrency.value)
const currencySymbol = computed(() => getCurrencySymbol(selectedCurrency.value))
const currencyFractionDigits = computed(() => (selectedCurrency.value === 'USD' ? 2 : 0))
const currencyInputStep = computed(() => (selectedCurrency.value === 'USD' ? 0.01 : 1))

const parsedDepositAmount = computed(() => Number.parseFloat(depositAmount.value))
const parsedWithdrawAmount = computed(() => Number.parseFloat(withdrawAmount.value))

const depositAmountInRub = computed(() => {
  return convertCurrencyAmount(parsedDepositAmount.value, selectedCurrency.value, 'RUB')
})

const withdrawAmountInRub = computed(() => {
  return convertCurrencyAmount(parsedWithdrawAmount.value, selectedCurrency.value, 'RUB')
})
const withdrawCardDigits = computed(() => withdrawCardNumber.value.replace(/\D/g, ''))

const depositInputMin = computed(() => {
  const converted = convertCurrencyAmount(minDepositRub.value, 'RUB', selectedCurrency.value)
  return selectedCurrency.value === 'USD' ? Number(converted.toFixed(2)) : Math.ceil(converted)
})

const depositInputMax = computed(() => {
  const converted = convertCurrencyAmount(maxDepositRub.value, 'RUB', selectedCurrency.value)
  return selectedCurrency.value === 'USD' ? Number(converted.toFixed(2)) : Math.floor(converted)
})

const isDepositAmountValid = computed(() => {
  return (
    Number.isFinite(parsedDepositAmount.value)
    && parsedDepositAmount.value > 0
    && Number.isFinite(depositAmountInRub.value)
    && depositAmountInRub.value >= minDepositRub.value
    && depositAmountInRub.value <= maxDepositRub.value
  )
})
const canSubmitDeposit = computed(() => {
  return (
    isDepositAmountValid.value
    && Boolean(selectedDepositProvider.value)
    && depositProviderOptions.value.length > 0
  )
})

const depositProviderOptions = computed(() => {
  const options = [
    {
      id: 'platega' as WalletTopUpProvider,
      title: 'Platega',
      description: t('pages.wallet.paymentProviderPlategaHint'),
      icon: Landmark,
      surfaceClass: 'bg-gradient-to-br from-sky-400/22 via-sky-400/8 to-transparent',
      activeClass: 'border-sky-400/60 bg-sky-500/10',
      activeIconClass: 'border-sky-300/35 bg-sky-400/15 text-sky-50',
      activeIndicatorClass: 'border-sky-300/70 bg-sky-300/18',
      activeCopyClass: 'text-sky-100/88',
    },
    {
      id: 'lava' as WalletTopUpProvider,
      title: 'Lava',
      description: t('pages.wallet.paymentProviderLavaHint'),
      icon: Flame,
      surfaceClass: 'bg-gradient-to-br from-orange-400/22 via-amber-400/8 to-transparent',
      activeClass: 'border-orange-400/60 bg-orange-500/10',
      activeIconClass: 'border-orange-300/35 bg-orange-400/15 text-orange-50',
      activeIndicatorClass: 'border-orange-300/70 bg-orange-300/18',
      activeCopyClass: 'text-orange-100/88',
    },
  ]

  return options.filter((option) => availableDepositProviders.value.includes(option.id))
})

const availableBalanceInSelectedCurrency = computed(() =>
  convertCurrencyAmount(balance.value, 'RUB', selectedCurrency.value)
)

const withdrawInputMin = computed(() => (selectedCurrency.value === 'USD' ? 0.01 : 1))
const withdrawInputMax = computed(() => {
  return selectedCurrency.value === 'USD'
    ? Number(availableBalanceInSelectedCurrency.value.toFixed(2))
    : Math.max(0, Math.floor(availableBalanceInSelectedCurrency.value))
})

const isWithdrawAmountValid = computed(() => {
  return (
    Number.isFinite(parsedWithdrawAmount.value)
    && parsedWithdrawAmount.value > 0
    && Number.isFinite(withdrawAmountInRub.value)
    && withdrawAmountInRub.value <= balance.value
  )
})
const isWithdrawCardValid = computed(() => withdrawCardDigits.value.length >= 12 && withdrawCardDigits.value.length <= 19)
const canSubmitWithdrawal = computed(() => isWithdrawAmountValid.value && isWithdrawCardValid.value)

// New states for modals
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)

function getSingleQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  if (typeof value === 'string') return value
  return null
}

function resolveDepositAmountFromRub(amountRub: number): string {
  const converted = convertCurrencyAmount(amountRub, 'RUB', selectedCurrency.value)
  if (selectedCurrency.value === 'USD') {
    return converted.toFixed(2)
  }
  return Math.ceil(converted).toString()
}

function clearAutoDepositQuery() {
  const nextQuery = { ...route.query }
  delete nextQuery.open_deposit
  delete nextQuery.amount_rub
  router.replace({ query: nextQuery })
}

function ensureSelectedDepositProvider() {
  if (depositProviderOptions.value.some((option) => option.id === selectedDepositProvider.value)) {
    return
  }

  selectedDepositProvider.value = depositProviderOptions.value[0]?.id ?? defaultDepositProvider
}

function openDepositModal() {
  depositErrorMessage.value = null
  ensureSelectedDepositProvider()
  showDepositModal.value = true
}

function closeDepositModal() {
  depositErrorMessage.value = null
  showDepositModal.value = false
}

function openWithdrawModal() {
  withdrawErrorMessage.value = null
  withdrawSuccessMessage.value = null
  showWithdrawModal.value = true
}

function closeWithdrawModal() {
  showWithdrawModal.value = false
}

function applyAutoDepositFromQuery() {
  const shouldOpen = getSingleQueryValue(route.query.open_deposit) === '1'
  if (!shouldOpen) return

  const amountRubRaw = getSingleQueryValue(route.query.amount_rub)
  const amountRub = Number.parseFloat(amountRubRaw ?? '')

  openDepositModal()

  if (Number.isFinite(amountRub) && amountRub > 0) {
    depositAmount.value = resolveDepositAmountFromRub(amountRub)
  }

  clearAutoDepositQuery()
}

onMounted(async () => {
  isLoading.value = true

  const userBalance: Balance | null = await walletService.getUserBalance()
  if (userBalance) {
    balance.value = userBalance.balance
    minDepositRub.value = userBalance.top_up_min_amount
    maxDepositRub.value = userBalance.top_up_max_amount
    availableDepositProviders.value = userBalance.available_top_up_providers.length > 0
      ? userBalance.available_top_up_providers
      : [defaultDepositProvider]
    ensureSelectedDepositProvider()
  }

  await loadHistory()
  applyAutoDepositFromQuery()
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

const resetHistory = async () => {
  historyItems.value = []
  page.value = 1
  totalPages.value = 1
  await loadHistory()
}

const handleScroll = async (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    await loadHistory()
  }
}

const handleDeposit = async () => {
  if (!canSubmitDeposit.value) return
  depositErrorMessage.value = null

  const baseAmount = Math.round(depositAmountInRub.value)
  if (
    !Number.isFinite(baseAmount)
    || baseAmount < minDepositRub.value
    || baseAmount > maxDepositRub.value
  ) return

  isLoading.value = true
  const result = await walletService.TopUpUserBalance(
    baseAmount,
    selectedDepositProvider.value,
  )

  if (result.data) {
    window.location.href = result.data.payment_url
    return
  }

  depositErrorMessage.value = getErrorMessage(result.error, t)
  isLoading.value = false
}

const handleWithdraw = async () => {
  if (!canSubmitWithdrawal.value) return

  withdrawErrorMessage.value = null
  withdrawSuccessMessage.value = null
  isLoading.value = true

  const result = await walletService.createWithdrawalOrder(
    Number(withdrawAmountInRub.value.toFixed(2)),
    withdrawCardDigits.value,
  )

  if (result.data) {
    balance.value = result.data.current_balance
    userStore.updateUserProfile({ balance: result.data.current_balance })
    withdrawAmount.value = ''
    withdrawCardNumber.value = ''
    withdrawSuccessMessage.value = t('pages.wallet.withdrawSuccess')
    await resetHistory()
    isLoading.value = false
    setTimeout(() => {
      closeWithdrawModal()
    }, 900)
    return
  }

  withdrawErrorMessage.value = getErrorMessage(result.error, t)
  isLoading.value = false
}

const formatCurrency = (amount: number) => {
  return formatCurrencyAmount(amount, {
    fromCurrency: 'RUB',
    currency: selectedCurrency.value,
    minimumFractionDigits: currencyFractionDigits.value,
    maximumFractionDigits: currencyFractionDigits.value,
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
      return 'text-emerald-300'
    case 'pending':
      return 'text-amber-300'
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return 'text-rose-300'
    case 'refunded':
      return 'text-sky-300'
    default:
      return 'text-gray-400'
  }
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'confirmed':
      return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-200'
    case 'pending':
      return 'border-amber-400/25 bg-amber-400/12 text-amber-200'
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return 'border-rose-400/25 bg-rose-400/12 text-rose-200'
    case 'refunded':
      return 'border-sky-400/25 bg-sky-400/12 text-sky-200'
    default:
      return 'border-dark-500 bg-dark-700/80 text-gray-200'
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
  if (item.type === 'steam_top_up') {
    return Gamepad2
  }
  return (item.amount ?? 0) >= 0 ? Plus : Minus
}

const getTypeColor = (item: WalletHistoryItem) => {
  if (item.type === 'steam_top_up') {
    return 'text-sky-300'
  }
  return (item.amount ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
}

const getTypeBadgeClass = (type: string) => {
  const accentMap: Record<string, string> = {
    top_up: 'text-blue-100/80',
    steam_top_up: 'text-sky-100',
    purchase: 'text-gray-300',
    sale: 'text-violet-200',
    refund: 'text-sky-200',
    withdrawal: 'text-orange-200',
    adjustment: 'text-gray-200',
  }

  if (type === 'steam_top_up') {
    return 'border-sky-400/20 bg-sky-400/10 text-sky-100'
  }

  return `border-dark-600/80 bg-dark-800/85 ${accentMap[type] ?? 'text-gray-300'}`
}

const formatSigned = (amount: number) => {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${formatCurrency(amount)}`
}

const toggleHistoryItem = (id: string) => {
  expandedTransactionId.value = expandedTransactionId.value === id ? null : id
}

const isHistoryItemExpanded = (id: string) => expandedTransactionId.value === id

const formatProviderName = (provider: string | null | undefined) => {
  const map: Record<string, string> = {
    platega: 'Platega',
    lava: 'Lava',
  }
  if (!provider) return null
  return map[provider.toLowerCase()] ?? provider
}

const formatPaymentMethod = (paymentMethod: string | null | undefined) => {
  const map: Record<string, string> = {
    sbp: t('pages.wallet.historyDetails.paymentMethodSbp'),
    bank_card: t('pages.wallet.historyDetails.paymentMethodBankCard'),
    card_acquiring: t('pages.wallet.historyDetails.paymentMethodCardAcquiring'),
    international_card: t('pages.wallet.historyDetails.paymentMethodInternationalCard'),
    crypto: t('pages.wallet.historyDetails.paymentMethodCrypto'),
  }

  if (!paymentMethod) return null
  return map[paymentMethod.toLowerCase()] ?? paymentMethod
}

const getTransactionRole = (item: WalletHistoryItem) => {
  if (item.type === 'purchase') return t('pages.wallet.historyDetails.buyerRole')
  if (item.type === 'sale') return t('pages.wallet.historyDetails.sellerRole')
  return null
}

const getTransactionStatusNote = (item: WalletHistoryItem) => {
  const normalizedStatus = item.status.toLowerCase()

  if (item.type === 'top_up') {
    if (normalizedStatus === 'confirmed' || normalizedStatus === 'completed') {
      return t('pages.wallet.historyDetails.notes.topUpConfirmed')
    }
    if (normalizedStatus === 'pending') {
      return t('pages.wallet.historyDetails.notes.topUpPending')
    }
    return t('pages.wallet.historyDetails.notes.topUpCanceled')
  }

  if (item.type === 'steam_top_up') {
    if (normalizedStatus === 'confirmed' || normalizedStatus === 'completed') {
      return t('pages.wallet.historyDetails.notes.steamTopUpConfirmed')
    }
    if (normalizedStatus === 'pending') {
      return t('pages.wallet.historyDetails.notes.steamTopUpPending')
    }
    return t('pages.wallet.historyDetails.notes.steamTopUpCanceled')
  }

  if (item.type === 'withdrawal') {
    if (normalizedStatus === 'confirmed' || normalizedStatus === 'completed') {
      return t('pages.wallet.historyDetails.notes.withdrawalConfirmed')
    }
    if (normalizedStatus === 'pending') {
      return t('pages.wallet.historyDetails.notes.withdrawalPending')
    }
    return t('pages.wallet.historyDetails.notes.withdrawalCanceled')
  }

  if (item.type === 'purchase') {
    if (normalizedStatus === 'pending') {
      return t('pages.wallet.historyDetails.notes.purchasePending')
    }
    if (normalizedStatus === 'refunded' || normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
      return t('pages.wallet.historyDetails.notes.purchaseRefunded')
    }
    return t('pages.wallet.historyDetails.notes.purchaseCompleted')
  }

  if (item.type === 'sale') {
    if (normalizedStatus === 'completed') {
      return t('pages.wallet.historyDetails.notes.saleCompleted')
    }
    if (normalizedStatus === 'pending' || normalizedStatus === 'confirmed') {
      return t('pages.wallet.historyDetails.notes.salePending')
    }
    return t('pages.wallet.historyDetails.notes.saleCanceled')
  }

  if (item.type === 'refund') {
    return t('pages.wallet.historyDetails.notes.refundProcessed')
  }

  return t('pages.wallet.historyDetails.notes.adjustmentApplied')
}

const getTransactionDetails = (item: WalletHistoryItem) => {
  const details: Array<{ label: string; value: string }> = [
    {
      label: t('pages.wallet.historyDetails.operationType'),
      value: typeLabel(item.type),
    },
    {
      label: t('pages.wallet.historyDetails.statusNote'),
      value: getTransactionStatusNote(item),
    },
  ]

  const role = getTransactionRole(item)
  if (role) {
    details.push({
      label: t('pages.wallet.historyDetails.role'),
      value: role,
    })
  }

  if (typeof item.gross_amount === 'number') {
    details.push({
      label: t('pages.wallet.historyDetails.dealAmount'),
      value: formatCurrency(item.gross_amount),
    })
  }

  const providerName = formatProviderName(item.payment_provider)
  if (providerName) {
    details.push({
      label: t('pages.wallet.historyDetails.provider'),
      value: providerName,
    })
  }

  const paymentMethod = formatPaymentMethod(item.payment_method)
  if (paymentMethod) {
    details.push({
      label: t('pages.wallet.historyDetails.paymentMethod'),
      value: paymentMethod,
    })
  }

  if (item.provider_tx_id) {
    details.push({
      label: t('pages.wallet.historyDetails.providerTransactionId'),
      value: item.provider_tx_id,
    })
  }

  if (item.confirmed_at) {
    details.push({
      label: t('pages.wallet.historyDetails.confirmedAt'),
      value: formatDateTime(item.confirmed_at),
    })
  }

  if (item.type === 'steam_top_up') {
    details.push({
      label: t('pages.wallet.historyDetails.destination'),
      value: t('pages.wallet.historyDetails.steamWalletDestination'),
    })
  }

  if (item.note) {
    details.push({
      label: t('pages.wallet.historyDetails.note'),
      value: item.note,
    })
  }

  return details
}

const minimumDepositText = computed(() => formatCurrencyAmount(minDepositRub.value, {
  fromCurrency: 'RUB',
  currency: selectedCurrency.value,
  minimumFractionDigits: currencyFractionDigits.value,
  maximumFractionDigits: currencyFractionDigits.value,
}))

const availableBalanceForInput = () => {
  const converted = availableBalanceInSelectedCurrency.value
  return selectedCurrency.value === 'USD'
    ? converted.toFixed(2)
    : Math.round(converted).toString()
}

const formatCardNumberInput = () => {
  const digits = withdrawCardDigits.value.slice(0, 19)
  withdrawCardNumber.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    top_up: t('pages.walletTypes.top_up'),
    steam_top_up: t('pages.walletTypes.steam_top_up'),
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
  <div
    class="w-full h-full overflow-x-hidden overflow-y-auto pb-16 md:pb-0 lg:overflow-hidden"
    @scroll.passive="handleScroll"
  >
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
    <div class="lg:flex lg:min-h-[calc(100dvh-3.5rem)]">
      <!-- Left column - Wallet info -->
      <div class="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-0 lg:min-h-[calc(100dvh-3.5rem)] lg:border-r border-dark-700 px-4 lg:px-0 lg:pt-6 lg:pr-6">
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
                  <div class="text-3xl font-bold text-blue-100">{{ formatCurrency(balance) }}</div>
                </div>
                <div class="w-12 h-12 rounded-full border border-dark-500 bg-dark-700/70 flex items-center justify-center">
                  <WalletIcon class="w-6 h-6 text-gray-200" />
                </div>
              </div>

              <!-- Quick actions -->
              <div class="grid grid-cols-2 gap-3">
                <button 
                  @click="openDepositModal"
                  class="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-all duration-200"
                >
                  <div class="w-10 h-10 rounded-full border border-dark-500 bg-dark-700/70 flex items-center justify-center">
                    <ArrowDownToLine class="w-5 h-5 text-gray-200" />
                  </div>
                  <span class="text-sm font-medium text-white">{{ $t('pages.wallet.deposit') }}</span>
                </button>

                <button 
                  @click="openWithdrawModal"
                  class="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dark-600 bg-dark-700/50 hover:bg-dark-700 transition-all duration-200"
                >
                  <div class="w-10 h-10 rounded-full border border-dark-500 bg-dark-700/70 flex items-center justify-center">
                    <ArrowUpFromLine class="w-5 h-5 text-gray-200" />
                  </div>
                  <span class="text-sm font-medium text-white">{{ $t('pages.wallet.withdraw') }}</span>
                </button>
              </div>
            </div>

            <!-- Info cards -->
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-4 rounded-lg border border-dark-600 bg-dark-700/30">
                <div class="w-8 h-8 rounded-full border border-dark-600 bg-dark-700/70 flex items-center justify-center">
                  <CreditCard class="w-4 h-4 text-gray-300" />
                </div>
                <div class="space-y-1">
                  <div class="text-sm font-medium text-gray-300">{{ $t('pages.wallet.instantDeposit') }}</div>
                  <div class="text-xs text-gray-400">{{ $t('pages.wallet.instantDepositHint') }}</div>
                </div>
              </div>

              <div class="flex items-center gap-3 p-4 rounded-lg border border-dark-600 bg-dark-700/30">
                <div class="w-8 h-8 rounded-full border border-dark-600 bg-dark-700/70 flex items-center justify-center">
                  <Banknote class="w-4 h-4 text-gray-300" />
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
      <div class="mt-6 lg:mt-0 lg:flex lg:min-h-[calc(100dvh-3.5rem)] lg:flex-1 lg:flex-col lg:overflow-hidden lg:pt-6 lg:pl-6">
        <div class="space-y-6 px-4 lg:flex lg:flex-1 lg:min-h-0 lg:flex-col lg:px-0 lg:pb-6">
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
            class="space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-1"
            @scroll.passive="handleScroll"
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
                :class="[
                  'group rounded-2xl border p-4 transition-all duration-300 sm:p-5',
                  isHistoryItemExpanded(tx.id)
                    ? 'wallet-history-item-active border-blue-400/35 bg-dark-500/70 shadow-[0_20px_60px_rgba(15,23,42,0.28)]'
                    : 'border-dark-700 bg-dark-600/40 hover:border-blue-500/20 hover:bg-dark-600/60',
                ]"
              >
                <div
                  class="cursor-pointer"
                  role="button"
                  tabindex="0"
                  :aria-expanded="isHistoryItemExpanded(tx.id)"
                  @click="toggleHistoryItem(tx.id)"
                  @keydown.enter.prevent="toggleHistoryItem(tx.id)"
                  @keydown.space.prevent="toggleHistoryItem(tx.id)"
                >
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start gap-3 sm:gap-4">
                        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dark-600 bg-dark-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-12 sm:w-12">
                          <component
                            :is="getTypeIcon(tx)"
                            :class="`h-5 w-5 ${getTypeColor(tx)}`"
                          />
                        </div>

                        <div class="min-w-0 flex-1 space-y-2">
                          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div class="text-xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                              {{ formatSigned(tx.amount) }}
                            </div>
                            <div class="inline-flex items-center gap-1.5 rounded-full border border-dark-600/80 bg-dark-800/80 px-2.5 py-1 text-xs font-medium text-gray-300">
                              <component
                                :is="getStatusIcon(tx.status)"
                                :class="`h-3.5 w-3.5 ${getStatusColor(tx.status)}`"
                              />
                              <span>{{ formatDate(tx.created_at) }}</span>
                            </div>
                            <div
                              v-if="tx.type === 'steam_top_up'"
                              class="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-100"
                            >
                              <Gamepad2 class="h-3.5 w-3.5" />
                              <span>{{ $t('pages.wallet.historyDetails.steamBadge') }}</span>
                            </div>
                          </div>

                        <template v-if="tx.title">
                          <div
                            class="max-w-2xl text-sm font-medium leading-5 text-gray-200/92"
                          >
                            <router-link
                              v-if="tx.product_id"
                              :to="`/product/${buildSlugKey(tx.title, tx.product_id, 'product')}`"
                              class="transition-colors duration-200 hover:text-blue-200"
                              style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                            >
                              {{ tx.title }}
                            </router-link>
                            <span
                              v-else
                              style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                            >
                              {{ tx.title }}
                            </span>
                          </div>

                          <div
                            v-if="tx.note"
                            class="max-w-2xl text-sm leading-5 text-gray-400/90"
                            style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"
                          >
                            {{ tx.note }}
                          </div>
                        </template>

                          <div v-else class="text-sm text-gray-500">
                            {{ typeLabel(tx.type) }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 lg:max-w-[18rem] lg:justify-end">
                      <span
                        :class="['inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm font-semibold tracking-tight', getStatusBadgeClass(tx.status)]"
                      >
                        {{ getStatusText(tx.status, tx.type) }}
                      </span>
                      <span
                        :class="['inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm font-medium', getTypeBadgeClass(tx.type)]"
                      >
                        {{ typeLabel(tx.type) }}
                      </span>
                      <span class="inline-flex min-h-9 items-center gap-2 rounded-full border border-dark-600/80 bg-dark-800/80 px-3 py-1.5 text-sm font-medium text-gray-300">
                        {{ isHistoryItemExpanded(tx.id) ? $t('pages.wallet.historyDetails.hide') : $t('pages.wallet.historyDetails.show') }}
                        <ChevronDown
                          :class="[
                            'h-4 w-4 transition-transform duration-200',
                            isHistoryItemExpanded(tx.id) ? 'rotate-180 text-blue-200' : 'text-gray-400',
                          ]"
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <Transition name="wallet-history-details">
                  <div
                    v-if="isHistoryItemExpanded(tx.id)"
                    class="mt-4 border-t border-white/8 pt-4"
                  >
                    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div
                        v-for="detail in getTransactionDetails(tx)"
                        :key="`${detail.label}-${detail.value}`"
                        class="rounded-2xl border border-dark-600/80 bg-dark-800/70 px-4 py-3"
                      >
                        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                          {{ detail.label }}
                        </div>
                        <div class="mt-2 break-all text-sm leading-6 text-gray-100">
                          {{ detail.value }}
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
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
        class="app-modal-overlay z-50 bg-black/90 backdrop-blur-sm"
      >
        <div class="app-modal-panel relative w-full max-w-md overflow-y-auto rounded-2xl border border-dark-600 bg-dark-800/95 p-6 backdrop-blur-sm space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full border border-dark-500 bg-dark-700/70 flex items-center justify-center">
                <ArrowDownToLine class="w-5 h-5 text-gray-200" />
              </div>
              <h3 class="text-xl font-bold text-white">{{ $t('pages.wallet.deposit') }}</h3>
            </div>
            <button 
              type="button"
              @click="closeDepositModal"
              class="rounded-full p-1 text-gray-400 transition-colors duration-150 hover:text-gray-300"
              aria-label="Close"
            >
              <X class="w-5 h-5" />
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
                  :min="depositInputMin"
                  :max="depositInputMax"
                  :step="currencyInputStep"
                  placeholder="0"
                  class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  {{ currencySymbol }}
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-2">
                {{ $t('pages.wallet.depositMin', { amount: minimumDepositText }) }}
              </p>
            </div>

            <div
              class="space-y-3"
              role="radiogroup"
              :aria-label="$t('pages.wallet.paymentProvider')"
            >
              <div class="flex items-center justify-between gap-3">
                <label class="block text-sm font-medium text-gray-300">
                  {{ $t('pages.wallet.paymentProvider') }}
                </label>
                <span class="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                  {{ $t('pages.wallet.paymentProviderEyebrow') }}
                </span>
              </div>

              <div
                v-if="depositProviderOptions.length > 0"
                class="grid gap-3"
              >
                <button
                  v-for="option in depositProviderOptions"
                  :key="option.id"
                  type="button"
                  :aria-pressed="selectedDepositProvider === option.id"
                  class="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5"
                  :class="selectedDepositProvider === option.id ? option.activeClass : 'border-dark-600 bg-dark-700/40 hover:border-dark-500 hover:bg-dark-700/70'"
                  @click="selectedDepositProvider = option.id"
                >
                  <div
                    class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200"
                    :class="[option.surfaceClass, selectedDepositProvider === option.id ? 'opacity-100' : 'group-hover:opacity-70']"
                  />

                  <div class="relative flex items-start gap-4">
                    <div
                      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200"
                      :class="selectedDepositProvider === option.id ? option.activeIconClass : 'border-dark-600 bg-dark-700/75 text-gray-300'"
                    >
                      <component :is="option.icon" class="h-5 w-5" />
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-base font-semibold text-white sm:text-lg">
                          {{ option.title }}
                        </div>
                        <span
                          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                          :class="selectedDepositProvider === option.id ? option.activeIndicatorClass : 'border-dark-500 bg-dark-700/80'"
                        >
                          <span
                            class="h-2 w-2 rounded-full transition-opacity duration-200"
                            :class="selectedDepositProvider === option.id ? 'bg-white opacity-100' : 'bg-transparent opacity-0'"
                          />
                        </span>
                      </div>

                      <p
                        class="mt-2 max-w-[20rem] text-sm leading-6 transition-colors duration-200"
                        :class="selectedDepositProvider === option.id ? option.activeCopyClass : 'text-gray-400'"
                      >
                        {{ option.description }}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              <div
                v-else
                class="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200"
              >
                {{ $t('pages.wallet.paymentProvidersUnavailable') }}
              </div>

              <p class="text-xs text-gray-400">
                {{ $t('pages.wallet.paymentProviderHint') }}
              </p>
            </div>

            <div
              v-if="depositErrorMessage"
              class="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200"
            >
              {{ depositErrorMessage }}
            </div>

            <button
              @click="handleDeposit"
              :disabled="!canSubmitDeposit || isLoading"
              class="market-btn market-btn-primary w-full rounded-xl py-3.5"
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
        class="app-modal-overlay z-50 bg-black/90 backdrop-blur-sm"
      >
        <div class="app-modal-panel relative w-full max-w-md overflow-y-auto rounded-2xl border border-dark-600 bg-dark-800/95 p-6 backdrop-blur-sm space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full border border-emerald-500/35 bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpFromLine class="w-5 h-5 text-emerald-300" />
              </div>
              <h3 class="text-xl font-bold text-white">{{ $t('pages.wallet.withdraw') }}</h3>
            </div>
            <button 
              type="button"
              @click="closeWithdrawModal"
              class="rounded-full p-1 text-gray-400 transition-colors duration-150 hover:text-gray-300"
              aria-label="Close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.24em] text-gray-500">
                {{ $t('pages.wallet.withdrawCard') }}
              </div>
              <input
                v-model="withdrawCardNumber"
                type="text"
                inputmode="numeric"
                autocomplete="cc-number"
                maxlength="23"
                :placeholder="$t('pages.wallet.withdrawCardPlaceholder')"
                class="mt-3 w-full border-none bg-transparent p-0 text-lg font-semibold tracking-[0.18em] text-white outline-none placeholder:text-gray-600"
                @input="formatCardNumberInput"
              />
              <p class="mt-2 text-xs text-gray-400">
                {{ $t('pages.wallet.withdrawCardHint') }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">
                {{ $t('pages.wallet.withdrawAmount') }}
              </label>
              <div class="relative">
                <input
                  v-model="withdrawAmount"
                  type="number"
                  :max="withdrawInputMax"
                  :min="withdrawInputMin"
                  :step="currencyInputStep"
                  placeholder="0"
                  class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-medium">
                  {{ currencySymbol }}
                </div>
              </div>
              <div class="flex items-center justify-between text-xs mt-2">
                <span class="text-gray-400">
                  {{ $t('pages.wallet.available') }}: <span class="text-green-400">{{ formatCurrency(balance) }}</span>
                </span>
                <button 
                  @click="withdrawAmount = availableBalanceForInput()"
                  class="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {{ $t('pages.wallet.useAll') }}
                </button>
              </div>
            </div>

            <div
              v-if="withdrawErrorMessage"
              class="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200"
            >
              {{ withdrawErrorMessage }}
            </div>

            <div
              v-if="withdrawSuccessMessage"
              class="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-200"
            >
              {{ withdrawSuccessMessage }}
            </div>

            <button
              @click="handleWithdraw"
              :disabled="!canSubmitWithdrawal || isLoading"
              class="market-btn market-btn-success w-full rounded-xl py-3.5"
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
  scrollbar-color: var(--overlay-white-20) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: var(--overlay-white-20);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: var(--overlay-white-30);
}

.wallet-history-item-active {
  transform: translateY(-4px);
}

.wallet-history-details-enter-active,
.wallet-history-details-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.wallet-history-details-enter-from,
.wallet-history-details-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Ensure proper scrolling on mobile */
@media (max-width: 1023px) {
  .lg\:sticky {
    position: static;
  }
}
</style>
