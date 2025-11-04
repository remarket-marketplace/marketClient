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
import type { Balance } from '@/validation/wallet/wallet'

const { t } = useI18n()

// значения
const balance = ref<number>(0)

// Состояния
const isLoading = ref<boolean>(false)

onMounted(async () => {
  isLoading.value = true

  const userBalance: Balance | null = await walletService.getUserBalance()
  userBalance ? (balance.value = userBalance.balance, isLoading.value = false) : null
})


// Формы
const depositAmount = ref('')
const withdrawAmount = ref('')

// История транзакций
const transactions = ref([
  {
    id: 1,
    type: 'deposit',
    amount: 5000,
    status: 'completed',
    date: '2024-01-15T14:30:00Z',
    description: 'Пополнение через Сбербанк'
  },
  {
    id: 2,
    type: 'withdraw',
    amount: 2500,
    status: 'completed',
    date: '2024-01-14T11:20:00Z',
    description: 'Вывод на Tinkoff'
  },
  {
    id: 3,
    type: 'deposit',
    amount: 3000,
    status: 'pending',
    date: '2024-01-13T16:45:00Z',
    description: 'Пополнение через Тинькофф'
  },
  {
    id: 4,
    type: 'withdraw',
    amount: 1500,
    status: 'rejected',
    date: '2024-01-12T09:15:00Z',
    description: 'Вывод на Альфа-банк'
  }
])

// Методы
const handleDeposit = () => {
  if (!depositAmount.value || parseFloat(depositAmount.value) <= 0) return
  
  isLoading.value = true
  setTimeout(() => {
    const amount = parseFloat(depositAmount.value)
    balance.value += amount
    
    transactions.value.unshift({
      id: Date.now(),
      type: 'deposit',
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      description: 'Пополнение через систему'
    })
    
    depositAmount.value = ''
    isLoading.value = false
  }, 1000)
}

const handleWithdraw = () => {
  if (!withdrawAmount.value || parseFloat(withdrawAmount.value) <= 0) return
  if (parseFloat(withdrawAmount.value) > balance.value) return
  
  isLoading.value = true
  setTimeout(() => {
    const amount = parseFloat(withdrawAmount.value)
    balance.value -= amount
    
    transactions.value.unshift({
      id: Date.now(),
      type: 'withdraw',
      amount: amount,
      status: 'pending',
      date: new Date().toISOString(),
      description: 'Запрос на вывод средств'
    })
    
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
    case 'completed': return CheckCircle
    case 'pending': return Clock
    case 'rejected': return XCircle
    default: return Clock
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-400'
    case 'pending': return 'text-yellow-400'
    case 'rejected': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'Завершено'
    case 'pending': return 'В обработке'
    case 'rejected': return 'Отклонено'
    default: return status
  }
}

const getTypeIcon = (type: string) => {
  return type === 'deposit' ? Plus : Minus
}

const getTypeColor = (type: string) => {
  return type === 'deposit' ? 'text-green-400' : 'text-red-400'
}
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- Основной контент с прокруткой -->
    <div class="flex-1 overflow-auto no-scrollbar">
      <div class="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <!-- Заголовок и баланс -->
        <div class="text-center space-y-4">
          <h1 class="text-2xl md:text-3xl font-bold text-white px-2">Управление балансом</h1>
          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-6 md:p-8 backdrop-blur-sm mx-auto max-w-md">
            <p class="text-gray-400 text-base md:text-lg mb-2">Текущий баланс</p>
            <p class="text-3xl md:text-5xl font-bold text-green-400 break-all">
              {{ formatCurrency(balance) }}
            </p>
          </div>
        </div>

        <!-- Карточки пополнения и вывода -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <!-- Пополнение -->
          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-4 md:p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-green-500/20 rounded-lg">
                <ArrowDownToLine class="w-5 h-5 md:w-6 md:h-6 text-green-400" />
              </div>
              <h2 class="text-lg md:text-xl font-semibold text-white">Пополнение баланса</h2>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Сумма пополнения
                </label>
                <input
                  v-model="depositAmount"
                  type="number"
                  placeholder="0"
                  class="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors text-base"
                />
              </div>
              
              <button
                @click="handleDeposit"
                :disabled="isLoading || !depositAmount || parseFloat(depositAmount) <= 0"
                class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 md:px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <CreditCard class="w-4 h-4 md:w-5 md:h-5" />
                {{ isLoading ? 'Обработка...' : 'Пополнить' }}
              </button>
            </div>
          </div>

          <!-- Вывод -->
          <div class="bg-dark-800 border border-gray-700 rounded-2xl p-4 md:p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-red-500/20 rounded-lg">
                <ArrowUpFromLine class="w-5 h-5 md:w-6 md:h-6 text-red-400" />
              </div>
              <h2 class="text-lg md:text-xl font-semibold text-white">Вывод средств</h2>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Сумма вывода
                </label>
                <input
                  v-model="withdrawAmount"
                  type="number"
                  placeholder="0"
                  :max="balance"
                  class="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors text-base"
                />
              </div>
              
              <button
                @click="handleWithdraw"
                :disabled="isLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance"
                class="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 md:px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <CreditCard class="w-4 h-4 md:w-5 md:h-5" />
                {{ isLoading ? 'Обработка...' : 'Вывести' }}
              </button>
            </div>
          </div>
        </div>

        <!-- История транзакций -->
        <div class="bg-dark-800 border border-gray-700 rounded-2xl p-4 md:p-6">
          <h2 class="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">История операций</h2>
          
          <div class="space-y-3 md:space-y-4 max-h-96 overflow-y-auto history-container">
            <div
              v-for="transaction in transactions"
              :key="transaction.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-dark-700/50 rounded-xl border border-gray-600/50 hover:border-gray-500 transition-colors gap-3"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div 
                class="p-2 rounded-lg flex-shrink-0"
                  :class="transaction.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'"
                >
                  <component
                    :is="getTypeIcon(transaction.type)"
                    class="w-4 h-4 md:w-5 md:h-5"
                    :class="getTypeColor(transaction.type)"
                  />
                </div>
                
                <div class="flex-1 min-w-0">
                  <p class="text-white font-medium break-words text-sm md:text-base">
                    {{ transaction.description }}
                  </p>
                  <p class="text-gray-400 text-xs md:text-sm">
                    {{ formatDate(transaction.date) }}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                <div class="text-right sm:text-left">
                  <p 
                    class="font-semibold text-sm md:text-base text-end"
                    :class="transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ transaction.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </p>
                  <div class="flex items-center gap-1 text-xs md:text-sm justify-end sm:justify-start">
                    <component
                      :is="getStatusIcon(transaction.status)"
                      class="w-3 h-3 md:w-4 md:h-4"
                      :class="getStatusColor(transaction.status)"
                    />
                    <span :class="getStatusColor(transaction.status)">
                      {{ getStatusText(transaction.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Сообщение если нет транзакций -->
          <div
            v-if="transactions.length === 0"
            class="text-center py-6 md:py-8 text-gray-400"
          >
            <Clock class="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 opacity-50" />
            <p class="text-sm md:text-base">История операций пуста</p>
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

.history-container::-webkit-scrollbar-track {
  background: #1F2937;
  border-radius: 2px;
}

.history-container::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}

.history-container::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

/* Улучшенная поддержка очень маленьких экранов */
@media (max-width: 360px) {
  .text-3xl {
    font-size: 1.5rem;
  }
  
  .text-2xl {
    font-size: 1.25rem;
  }
}
</style>