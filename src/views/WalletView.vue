<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Minus
} from 'lucide-vue-next'
import { walletService } from '@/api/wallet/walletService'
import type { Balance, Transaction } from '@/validation/wallet/wallet'
import type { z } from 'zod'

const { t } = useI18n()

const balance = ref(0)
const isLoading = ref(false)

const transactions = ref<Transaction[]>([])
const page = ref(1)
const perPage = 10
const totalPages = ref(1)
const isFetchingTransactions = ref(false)

const depositAmount = ref('')
const withdrawAmount = ref('')

onMounted(async () => {
  isLoading.value = true

  const userBalance: Balance | null = await walletService.getUserBalance()
  if (userBalance) {
    balance.value = userBalance.balance
  }

  await loadTransactions()
  isLoading.value = false
})

const loadTransactions = async () => {
  if (isFetchingTransactions.value) return
  if (page.value > totalPages.value) return

  isFetchingTransactions.value = true

  const response = await walletService.GetTransactionsList(page.value, perPage)

  if (response) {
    transactions.value.push(...response.transactions)
    totalPages.value = response.totalPages
    page.value++
  }

  isFetchingTransactions.value = false
}

const handleScroll = async (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
    await loadTransactions()
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
  switch (status) {
    case 'completed':
      return CheckCircle
    case 'pending':
      return Clock
    case 'rejected':
      return XCircle
    default:
      return Clock
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-400'
    case 'pending':
      return 'text-yellow-400'
    case 'rejected':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Завершено'
    case 'pending':
      return 'В обработке'
    case 'rejected':
      return 'Отклонено'
    default:
      return status
  }
}

const getTypeIcon = (amount: number) => {
  return amount > 0 ? Plus : Minus
}

const getTypeColor = (amount: number) => {
  return amount > 0 ? 'text-green-400' : 'text-red-400'
}
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto no-scrollbar">
      <div class="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <div class="text-center space-y-4">
          <h1 class="text-2xl md:text-3xl font-bold text-white">
            Управление балансом
          </h1>

          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-6 max-w-md mx-auto">
            <p class="text-gray-400 mb-2">Текущий баланс</p>
            <p class="text-4xl font-bold text-green-400">
              {{ formatCurrency(balance) }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-6 space-y-4">
            <h2 class="text-xl font-semibold text-white flex items-center gap-2">
              <ArrowDownToLine class="text-green-400" />
              Пополнение
            </h2>

            <input
              v-model="depositAmount"
              type="number"
              placeholder="0"
              class="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-xl text-white"
            />

            <button
              @click="handleDeposit"
              :disabled="isLoading"
              class="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold"
            >
              Пополнить
            </button>
          </div>

          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-6 space-y-4">
            <h2 class="text-xl font-semibold text-white flex items-center gap-2">
              <ArrowUpFromLine class="text-red-400" />
              Вывод
            </h2>

            <input
              v-model="withdrawAmount"
              type="number"
              :max="balance"
              placeholder="0"
              class="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-xl text-white"
            />

            <button
              @click="handleWithdraw"
              :disabled="isLoading"
              class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-semibold"
            >
              Вывести
            </button>
          </div>
        </div>

        <div class="bg-dark-800 border border-gray-700 rounded-2xl p-6">
          <h2 class="text-xl font-semibold text-white mb-4">
            История операций
          </h2>

          <div
            class="space-y-3 max-h-96 overflow-y-auto history-container"
            @scroll="handleScroll"
          >
            <div
              v-for="tx in transactions"
              :key="tx.id"
              class="flex items-center justify-between bg-dark-900 border border-gray-700 rounded-xl p-4"
            >
              <div class="flex items-center gap-3">
                <component
                  :is="getTypeIcon(tx.amount)"
                  :class="getTypeColor(tx.amount)"
                />
                <div>
                  <p class="text-white font-medium">
                    {{ formatCurrency(tx.amount) }}
                  </p>
                  <p class="text-gray-400 text-sm">
                    {{ formatDate(tx.created_at) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <component
                  :is="getStatusIcon(tx.status)"
                  :class="getStatusColor(tx.status)"
                />
                <span class="text-sm text-gray-300">
                  {{ getStatusText(tx.status) }}
                </span>
              </div>
            </div>

            <div
              v-if="isFetchingTransactions"
              class="text-center text-gray-400 py-4"
            >
              Загрузка...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-container {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #1F2937;
}

.history-container::-webkit-scrollbar {
  width: 4px;
}

.history-container::-webkit-scrollbar-thumb {
  background: #4B5563;
}
</style>
