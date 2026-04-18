<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowUpFromLine, Check, Copy, Loader2 } from 'lucide-vue-next'
import {
  adminService,
  type AdminWithdrawalOrder,
  type WithdrawalOrderStatus,
} from '@/api/admin/AdminService'
import BackButton from '@/components/navigation/BackButton.vue'
import SearchField from '@/components/SearchField.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import { formatCurrencyAmount, preferredCurrency } from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()

const orders = ref<AdminWithdrawalOrder[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const errorMessage = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 20

const searchQuery = ref('')
const statusFilter = ref<'all' | WithdrawalOrderStatus>('all')
const sortFilter = ref<'newest' | 'oldest' | 'user_asc' | 'user_desc' | 'amount_desc' | 'amount_asc' | 'status_asc' | 'status_desc'>('newest')
type WithdrawalColumn = 'user' | 'amount' | 'payout' | 'balance' | 'status' | 'created'
const hoveredColumn = ref<WithdrawalColumn | null>(null)

const moderationModalOpen = ref(false)
const orderToModerate = ref<AdminWithdrawalOrder | null>(null)
const moderationTargetStatus = ref<'confirmed' | 'canceled' | null>(null)
const moderationReason = ref('')
const isModerating = ref(false)
const copiedOrderId = ref<string | null>(null)

let filterDebounce: ReturnType<typeof setTimeout> | null = null

const selectedCurrency = computed(() => preferredCurrency.value)
const hasMore = computed(() => currentPage.value < totalPages.value)
const pendingCount = computed(() => orders.value.filter((order) => order.status === 'pending').length)
const hasActiveFilters = computed(() => (
  Boolean(searchQuery.value.trim())
  || statusFilter.value !== 'all'
  || sortFilter.value !== 'newest'
))

function buildFilters() {
  return {
    status: statusFilter.value,
    user_query: searchQuery.value.trim() || undefined,
    sort: sortFilter.value,
  }
}

function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  sortFilter.value = 'newest'
}

function setHoveredColumn(column: WithdrawalColumn | null) {
  hoveredColumn.value = column
}

function getColumnHighlightClass(column: WithdrawalColumn): string {
  return hoveredColumn.value === column
    ? 'rounded-lg bg-sky-400/10 ring-1 ring-sky-400/25'
    : ''
}

function formatMoney(amount: number): string {
  return formatCurrencyAmount(amount, {
    fromCurrency: 'RUB',
    currency: selectedCurrency.value,
    minimumFractionDigits: selectedCurrency.value === 'USD' ? 2 : 0,
    maximumFractionDigits: selectedCurrency.value === 'USD' ? 2 : 0,
  })
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: WithdrawalOrderStatus): string {
  const map: Record<WithdrawalOrderStatus, string> = {
    pending: t('pages.admin.withdrawalsPage.statusPending'),
    confirmed: t('pages.admin.withdrawalsPage.statusConfirmed'),
    canceled: t('pages.admin.withdrawalsPage.statusCanceled'),
  }
  return map[status]
}

function getStatusBadgeClass(status: WithdrawalOrderStatus): string {
  const map: Record<WithdrawalOrderStatus, string> = {
    pending: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    confirmed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    canceled: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  }
  return map[status]
}

function openUserProfile(username: string) {
  router.push(`/user/${username}`)
}

async function copyCardNumber(order: AdminWithdrawalOrder) {
  try {
    await navigator.clipboard.writeText(order.card_number)
    copiedOrderId.value = order.id
    setTimeout(() => {
      if (copiedOrderId.value === order.id) copiedOrderId.value = null
    }, 1400)
  } catch {
    copiedOrderId.value = null
  }
}

async function copyOrderId(order: AdminWithdrawalOrder) {
  try {
    await navigator.clipboard.writeText(order.id)
    copiedOrderId.value = `id-${order.id}`
    setTimeout(() => {
      if (copiedOrderId.value === `id-${order.id}`) copiedOrderId.value = null
    }, 1400)
  } catch {
    copiedOrderId.value = null
  }
}

function formatShortId(value: string): string {
  if (!value) return '-'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}…${value.slice(-8)}`
}

function openModerationModal(order: AdminWithdrawalOrder, status: 'confirmed' | 'canceled') {
  orderToModerate.value = order
  moderationTargetStatus.value = status
  moderationReason.value = ''
  moderationModalOpen.value = true
}

function closeModerationModal() {
  moderationModalOpen.value = false
  orderToModerate.value = null
  moderationTargetStatus.value = null
  moderationReason.value = ''
}

async function loadOrders(reset = false) {
  if (reset) {
    isLoading.value = true
    currentPage.value = 1
  } else {
    if (!hasMore.value || isLoadingMore.value) return
    isLoadingMore.value = true
  }

  errorMessage.value = ''
  const page = reset ? 1 : currentPage.value + 1

  const response = await adminService.getAdminWithdrawalOrders(page, perPage, buildFilters())
  if (reset) {
    orders.value = response.orders
  } else {
    orders.value.push(...response.orders)
  }

  currentPage.value = response.currentPage
  totalPages.value = response.totalPages
  total.value = response.total
  isLoading.value = false
  isLoadingMore.value = false
}

async function submitModeration() {
  if (!orderToModerate.value || !moderationTargetStatus.value) return

  isModerating.value = true
  const updated = await adminService.updateAdminWithdrawalOrderStatus(
    orderToModerate.value.id,
    moderationTargetStatus.value,
    moderationReason.value,
  )
  isModerating.value = false

  if (!updated) return

  orders.value = orders.value.map((order) => order.id === updated.id ? updated : order)
  closeModerationModal()
}

onMounted(async () => {
  await loadOrders(true)
})

onUnmounted(() => {
  if (filterDebounce) clearTimeout(filterDebounce)
})

watch(
  () => [searchQuery.value, statusFilter.value, sortFilter.value],
  () => {
    if (filterDebounce) clearTimeout(filterDebounce)
    filterDebounce = setTimeout(() => {
      loadOrders(true)
    }, 300)
  },
)
</script>

<template>
  <section class="flex h-full w-full flex-col gap-4 overflow-hidden pt-3 md:pt-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <BackButton />
        <div>
          <h1 class="text-xl font-bold text-mainText sm:text-2xl">{{ $t('pages.admin.withdrawalsPage.title') }}</h1>
          <p class="text-xs text-gray-400 sm:text-sm">{{ $t('pages.admin.withdrawalsPage.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
          <ArrowUpFromLine class="h-4 w-4" />
          <span>{{ $t('common.total') }} {{ total }}</span>
        </div>
        <span class="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-100">
          {{ $t('pages.admin.withdrawalsPage.statusPending') }}: {{ pendingCount }}
        </span>
      </div>
    </div>

    <div class="grid gap-2 rounded-[1.5rem] border border-white/8 p-3">
      <div class="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="statusFilter === 'all' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="statusFilter = 'all'"
        >
          {{ $t('common.all') }}
        </button>
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="statusFilter === 'pending' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="statusFilter = 'pending'"
        >
          {{ $t('pages.admin.withdrawalsPage.statusPending') }}
        </button>
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="statusFilter === 'confirmed' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="statusFilter = 'confirmed'"
        >
          {{ $t('pages.admin.withdrawalsPage.statusConfirmed') }}
        </button>
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="statusFilter === 'canceled' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="statusFilter = 'canceled'"
        >
          {{ $t('pages.admin.withdrawalsPage.statusCanceled') }}
        </button>
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="sortFilter === 'amount_asc' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="sortFilter = 'amount_asc'"
        >
          {{ $t('pages.admin.withdrawalsPage.amountShort') }} ↑
        </button>
        <button
          type="button"
          class="admin-btn admin-btn-sm shrink-0 text-xs"
          :class="sortFilter === 'amount_desc' ? 'admin-btn-primary' : 'admin-btn-ghost'"
          @click="sortFilter = 'amount_desc'"
        >
          {{ $t('pages.admin.withdrawalsPage.amountShort') }} ↓
        </button>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="admin-btn admin-btn-sm admin-btn-ghost shrink-0 text-xs"
          @click="resetFilters"
        >
          {{ $t('common.reset') }}
        </button>
      </div>

      <SearchField
        v-model="searchQuery"
        :placeholder="$t('pages.admin.withdrawalsPage.searchPlaceholder')"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <div class="sticky top-0 z-10 grid grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr] gap-4 border-b border-white/8 bg-[#0b0f19]/95 px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-gray-500 backdrop-blur max-lg:hidden">
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('user')]">{{ $t('common.username') }}</span>
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('amount')]">{{ $t('pages.admin.withdrawalsPage.amount') }}</span>
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('payout')]">{{ $t('pages.admin.withdrawalsPage.payoutAmount') }}</span>
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('balance')]">{{ $t('pages.admin.withdrawalsPage.balance') }}</span>
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('status')]">{{ $t('common.status') }}</span>
        <span :class="['px-2 py-1 transition-colors', getColumnHighlightClass('created')]">{{ $t('pages.admin.withdrawalsPage.createdAt') }}</span>
      </div>

      <div v-if="isLoading" class="flex h-40 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-blue-400" />
      </div>

      <div v-else-if="errorMessage" class="flex h-40 items-center justify-center px-6 text-sm text-rose-300">
        {{ errorMessage }}
      </div>

      <div v-else-if="orders.length === 0" class="flex h-40 items-center justify-center px-6 text-sm text-gray-400">
        {{ $t('pages.admin.withdrawalsPage.empty') }}
      </div>

      <div v-else class="h-full overflow-y-auto px-3 py-3">
        <article
          v-for="order in orders"
          :key="order.id"
          class="group mb-3 rounded-[1.4rem] border border-white/8 p-4 transition-all duration-200 hover:border-white/12 sm:p-5"
          @mouseleave="setHoveredColumn(null)"
        >
          <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr] lg:items-center">
            <div
              :class="['min-w-0 px-2 py-1 transition-colors', getColumnHighlightClass('user')]"
              @mouseenter="setHoveredColumn('user')"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/18 bg-sky-400/10 text-sky-100">
                  <ArrowUpFromLine class="h-4.5 w-4.5" />
                </div>
                <div class="min-w-0">
                  <button
                    type="button"
                    class="truncate text-left text-sm font-semibold text-white transition-colors hover:text-sky-200"
                    @click="openUserProfile(order.username)"
                  >
                    {{ order.username }}
                  </button>
                  <div class="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                    <span class="min-w-0 truncate" :title="order.id">ID {{ formatShortId(order.id) }}</span>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                      @click="copyOrderId(order)"
                      :title="copiedOrderId === `id-${order.id}` ? $t('common.copied') : $t('common.copy')"
                    >
                      <component :is="copiedOrderId === `id-${order.id}` ? Check : Copy" class="h-3 w-3" />
                    </button>
                  </div>
                  <div class="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                    <span class="min-w-0 truncate">{{ order.masked_card_number }}</span>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition-colors hover:border-white/20 hover:text-white"
                      @click="copyCardNumber(order)"
                      :title="copiedOrderId === order.id ? $t('common.copied') : $t('common.copy')"
                    >
                      <component :is="copiedOrderId === order.id ? Check : Copy" class="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              :class="['px-2 py-1 transition-colors', getColumnHighlightClass('amount')]"
              @mouseenter="setHoveredColumn('amount')"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 lg:hidden">{{ $t('pages.admin.withdrawalsPage.amount') }}</div>
              <div class="text-base font-semibold text-white">{{ formatMoney(order.amount) }}</div>
            </div>

            <div
              :class="['px-2 py-1 transition-colors', getColumnHighlightClass('payout')]"
              @mouseenter="setHoveredColumn('payout')"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 lg:hidden">{{ $t('pages.admin.withdrawalsPage.payoutAmount') }}</div>
              <div class="text-base font-semibold text-emerald-200">
                {{ formatMoney(order.payout_amount ?? order.amount) }}
              </div>
              <div
                v-if="typeof order.commission_amount === 'number' && order.commission_amount > 0"
                class="mt-1 text-xs text-gray-500"
              >
                {{ $t('pages.admin.withdrawalsPage.commissionShort', {
                  amount: formatMoney(order.commission_amount),
                  percent: order.commission_percent ?? 0,
                }) }}
              </div>
            </div>

            <div
              :class="['px-2 py-1 transition-colors', getColumnHighlightClass('balance')]"
              @mouseenter="setHoveredColumn('balance')"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 lg:hidden">{{ $t('pages.admin.withdrawalsPage.balance') }}</div>
              <div class="text-base font-medium text-gray-100">{{ formatMoney(order.current_balance) }}</div>
            </div>

            <div
              :class="['px-2 py-1 transition-colors', getColumnHighlightClass('status')]"
              @mouseenter="setHoveredColumn('status')"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 lg:hidden">{{ $t('common.status') }}</div>
              <span :class="['inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm font-medium', getStatusBadgeClass(order.status)]">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>

            <div
              :class="['px-2 py-1 transition-colors', getColumnHighlightClass('created')]"
              @mouseenter="setHoveredColumn('created')"
            >
              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 lg:hidden">{{ $t('pages.admin.withdrawalsPage.createdAt') }}</div>
              <div class="text-sm text-gray-200">{{ formatDate(order.created_at) }}</div>
            </div>
          </div>

          <div v-if="order.status === 'pending'" class="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="admin-btn admin-btn-success admin-btn-sm text-xs"
              @click="openModerationModal(order, 'confirmed')"
            >
              {{ $t('pages.admin.withdrawalsPage.actionConfirm') }}
            </button>
            <button
              type="button"
              class="admin-btn admin-btn-danger admin-btn-sm text-xs"
              @click="openModerationModal(order, 'canceled')"
            >
              {{ $t('pages.admin.withdrawalsPage.actionCancel') }}
            </button>
          </div>
        </article>

        <div class="flex justify-center pt-2">
          <button
            v-if="hasMore && !isLoadingMore"
            type="button"
            class="admin-btn admin-btn-ghost w-full justify-center"
            @click="loadOrders(false)"
          >
            {{ $t('common.loadMore') }}
          </button>

          <div v-else-if="isLoadingMore" class="flex items-center justify-center py-2">
            <Loader2 class="h-5 w-5 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <ConfirmWindow
    :is-open="moderationModalOpen"
    :title="$t('pages.admin.withdrawalsPage.moderationTitle')"
    :message="$t('pages.admin.withdrawalsPage.moderationMessage')"
    :confirm-text="$t('common.confirm')"
    :cancel-text="$t('common.cancel')"
    :is-loading="isModerating"
    @confirm="submitModeration"
    @cancel="closeModerationModal"
  >
    <template #body>
      <div class="space-y-3">
        <div class="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
          <div>{{ orderToModerate?.username }}</div>
          <div class="mt-1 text-xs text-gray-500">{{ orderToModerate?.masked_card_number }}</div>
        </div>
        <textarea
          v-model="moderationReason"
          rows="3"
          class="admin-input-surface w-full rounded-2xl px-3 py-2 text-sm text-mainText"
          :placeholder="$t('pages.admin.withdrawalsPage.moderationReasonPlaceholder')"
        />
      </div>
    </template>
  </ConfirmWindow>
</template>

<style scoped>
.admin-withdrawals-filter-panel {
  background: var(--admin-filter-panel-bg);
  box-shadow: var(--admin-filter-panel-shadow);
}
</style>
