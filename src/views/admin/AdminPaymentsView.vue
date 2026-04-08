<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Loader2, SlidersHorizontal, WalletCards } from 'lucide-vue-next'
import {
  adminService,
  type AdminPayment,
  type PaymentModerationStatus,
  type PaymentStatus,
} from '@/api/admin/AdminService'
import BackButton from '@/components/navigation/BackButton.vue'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import { formatCurrencyAmount } from '@/utils/currency'

const { t } = useI18n()
const router = useRouter()

const payments = ref<AdminPayment[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isModerating = ref(false)
const errorMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 20
const isFiltersVisible = ref(false)

const searchQuery = ref('')
const providerTxIdQuery = ref('')
const statusFilter = ref<'all' | PaymentStatus>('all')
const dateFrom = ref('')
const dateTo = ref('')

const moderationModalOpen = ref(false)
const paymentToModerate = ref<AdminPayment | null>(null)
const moderationTargetStatus = ref<PaymentModerationStatus | null>(null)
const moderationReason = ref('')

let filterDebounce: ReturnType<typeof setTimeout> | null = null

const hasMore = computed(() => currentPage.value < totalPages.value)

const statusOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'PENDING', label: t('common.paymentStatuses.PENDING') },
  { value: 'CONFIRMED', label: t('common.paymentStatuses.CONFIRMED') },
  { value: 'CANCELED', label: t('common.paymentStatuses.CANCELED') },
  { value: 'CHARGEBACKED', label: t('common.paymentStatuses.CHARGEBACKED') },
])

const allowedTransitions: Record<PaymentStatus, PaymentModerationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CANCELED: ['CONFIRMED'],
  CONFIRMED: ['CANCELED'],
  CHARGEBACKED: [],
}

function buildFilters() {
  const normalizeIso = (value: string): string | undefined => {
    if (!value) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return undefined
    return parsed.toISOString()
  }

  return {
    status: statusFilter.value,
    user_query: searchQuery.value.trim() || undefined,
    provider_tx_id: providerTxIdQuery.value.trim() || undefined,
    date_from: normalizeIso(dateFrom.value),
    date_to: normalizeIso(dateTo.value),
  }
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getStatusLabel(status: PaymentStatus): string {
  return t(`common.paymentStatuses.${status}`)
}

function getStatusBadgeClass(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PENDING: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    CONFIRMED: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    CANCELED: 'border-gray-500/40 bg-gray-500/15 text-gray-200',
    CHARGEBACKED: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
  }
  return map[status]
}

function canSetStatus(payment: AdminPayment, targetStatus: PaymentModerationStatus): boolean {
  return allowedTransitions[payment.status].includes(targetStatus)
}

function openUserProfile(username: string) {
  router.push(`/user/${username}`)
}

function openModerationModal(payment: AdminPayment, status: PaymentModerationStatus) {
  paymentToModerate.value = payment
  moderationTargetStatus.value = status
  moderationReason.value = ''
  moderationModalOpen.value = true
}

function closeModerationModal() {
  moderationModalOpen.value = false
  paymentToModerate.value = null
  moderationTargetStatus.value = null
  moderationReason.value = ''
}

async function loadPayments(reset = false) {
  if (reset) {
    isLoading.value = true
    currentPage.value = 1
  } else {
    if (!hasMore.value || isLoadingMore.value) return
    isLoadingMore.value = true
  }

  errorMessage.value = ''
  const page = reset ? 1 : currentPage.value + 1

  try {
    const response = await adminService.getAdminPayments(page, perPage, buildFilters())

    if (reset) {
      payments.value = response.payments
    } else {
      payments.value.push(...response.payments)
    }

    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
    total.value = response.total
  } catch {
    errorMessage.value = t('pages.admin.paymentsPage.loadError')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function submitModeration() {
  if (!paymentToModerate.value || !moderationTargetStatus.value) return

  isModerating.value = true
  try {
    const result = await adminService.updateAdminPaymentStatus(
      paymentToModerate.value.id,
      moderationTargetStatus.value,
      moderationReason.value,
    )

    if (result) {
      await loadPayments(true)
      closeModerationModal()
    }
  } finally {
    isModerating.value = false
  }
}

onMounted(async () => {
  await loadPayments(true)
})

onUnmounted(() => {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
  }
})

const watchedFilters = computed(() => [
  searchQuery.value,
  providerTxIdQuery.value,
  statusFilter.value,
  dateFrom.value,
  dateTo.value,
])

watch(watchedFilters, () => {
  if (filterDebounce) clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => {
    loadPayments(true)
  }, 350)
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <BackButton />
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.paymentsPage.title') }}</h1>
          <p class="text-xs sm:text-sm text-gray-400">{{ $t('pages.admin.paymentsPage.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="admin-btn admin-btn-sm text-xs"
          @click="isFiltersVisible = !isFiltersVisible"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          {{ isFiltersVisible ? $t('pages.admin.activityLogs.hideFilters') : $t('pages.admin.activityLogs.showFilters') }}
        </button>

        <div class="inline-flex items-center gap-2 text-xs sm:text-base text-text-secondary">
          <WalletCards class="h-4 w-4" />
          <span>{{ $t('common.total') }} {{ total }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="isFiltersVisible"
      class="admin-filter-panel space-y-2 rounded-[1.5rem] p-3"
    >
      <SearchField
        v-model="searchQuery"
        :placeholder="$t('pages.admin.paymentsPage.searchPlaceholder')"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <CustomSelect
          v-model="statusFilter"
          :options="statusOptions"
          :placeholder="$t('pages.admin.paymentsPage.statusFilter')"
        />

        <input
          v-model="providerTxIdQuery"
          class="admin-input-surface h-10 rounded-lg px-3 text-sm text-mainText"
          :placeholder="$t('pages.admin.paymentsPage.providerTxIdPlaceholder')"
        />

        <input
          v-model="dateFrom"
          type="datetime-local"
          class="admin-input-surface h-10 rounded-lg px-3 text-sm text-mainText"
          :title="$t('pages.admin.paymentsPage.fromDate')"
        />

        <input
          v-model="dateTo"
          type="datetime-local"
          class="admin-input-surface h-10 rounded-lg px-3 text-sm text-mainText"
          :title="$t('pages.admin.paymentsPage.toDate')"
        />
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
        <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="errorMessage" class="flex h-32 items-center justify-center">
        <p class="text-red-400">{{ errorMessage }}</p>
      </div>

      <div v-else-if="payments.length === 0" class="flex h-32 items-center justify-center">
        <p class="text-gray-400">{{ $t('pages.admin.paymentsPage.empty') }}</p>
      </div>

      <div v-else class="h-full overflow-y-auto space-y-3 pr-1 pb-4">
        <article
          v-for="payment in payments"
          :key="payment.id"
          class="admin-surface-card rounded-[1.4rem] p-3 sm:p-4"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border px-2 py-1 text-xs" :class="getStatusBadgeClass(payment.status)">
                {{ getStatusLabel(payment.status) }}
              </span>
              <span class="text-xs text-gray-500">{{ $t('pages.admin.paymentsPage.paymentId') }}: {{ payment.id }}</span>
            </div>

            <div class="text-sm sm:text-base font-semibold text-mainText">
              {{ formatCurrencyAmount(payment.amount) }} {{ payment.currency }}
            </div>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-200 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span class="text-gray-400">{{ $t('common.username') }}:</span>
              <button
                type="button"
                class="ml-1 font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
                @click="openUserProfile(payment.username)"
              >
                {{ payment.username }}
              </button>
              <div class="mt-1 text-[11px] text-gray-500">
                {{ $t('pages.admin.paymentsPage.userId') }}: {{ payment.user_id }}
              </div>
            </div>

            <div>
              <span class="text-gray-400">{{ $t('pages.admin.paymentsPage.createdAt') }}:</span>
              <span class="ml-1 font-medium">{{ formatDate(payment.created_at) }}</span>
            </div>

            <div>
              <span class="text-gray-400">{{ $t('pages.admin.paymentsPage.confirmedAt') }}:</span>
              <span class="ml-1 font-medium">{{ formatDate(payment.confirmed_at) }}</span>
            </div>

            <div>
              <span class="text-gray-400">{{ $t('pages.admin.paymentsPage.updatedAt') }}:</span>
              <span class="ml-1 font-medium">{{ formatDate(payment.updated_at) }}</span>
            </div>

            <div>
              <span class="text-gray-400">{{ $t('pages.admin.paymentsPage.provider') }}:</span>
              <span class="ml-1 font-medium">{{ payment.provider }}</span>
            </div>

            <div>
              <span class="text-gray-400">{{ $t('pages.admin.paymentsPage.transactionId') }}:</span>
              <span class="ml-1 font-medium break-all">{{ payment.provider_tx_id || '-' }}</span>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-if="canSetStatus(payment, 'CONFIRMED')"
              type="button"
              class="admin-btn admin-btn-success admin-btn-sm text-xs"
              @click="openModerationModal(payment, 'CONFIRMED')"
            >
              {{ $t('pages.admin.paymentsPage.actionConfirm') }}
            </button>

            <button
              v-if="canSetStatus(payment, 'CANCELED')"
              type="button"
              class="admin-btn admin-btn-danger admin-btn-sm text-xs"
              @click="openModerationModal(payment, 'CANCELED')"
            >
              {{ $t('pages.admin.paymentsPage.actionCancel') }}
            </button>

          </div>
        </article>

        <div class="flex justify-center pt-2">
          <button
            v-if="hasMore && !isLoadingMore"
            type="button"
            class="admin-btn admin-btn-ghost w-full justify-center"
            @click="loadPayments(false)"
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
    :title="$t('pages.admin.paymentsPage.moderationTitle')"
    :message="$t('pages.admin.paymentsPage.moderationMessage')"
    :confirm-text="$t('common.confirm')"
    :cancel-text="$t('common.cancel')"
    :is-loading="isModerating"
    @confirm="submitModeration"
    @cancel="closeModerationModal"
  >
    <template #body>
      <div class="space-y-2">
        <p class="text-xs text-gray-400">
          {{ paymentToModerate?.id }} ->
          {{ moderationTargetStatus ? getStatusLabel(moderationTargetStatus) : '' }}
        </p>
        <label class="block text-sm text-gray-300">
          {{ $t('pages.admin.paymentsPage.moderationReasonLabel') }}
        </label>
        <textarea
          v-model="moderationReason"
          rows="3"
          class="admin-input-surface w-full rounded-lg px-3 py-2 text-sm text-mainText"
          :placeholder="$t('pages.admin.paymentsPage.moderationReasonPlaceholder')"
        />
      </div>
    </template>
  </ConfirmWindow>
</template>
