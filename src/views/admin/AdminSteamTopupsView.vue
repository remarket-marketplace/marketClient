<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, TicketPercent } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import {
  adminService,
  type AdminSteamTopupPromo,
  type CreateAdminSteamTopupPromoPayload,
} from '@/api/admin/AdminService'
import { getErrorMessage } from '@/utils/errorsMap'
import axios from 'axios'

const { t } = useI18n()

const promos = ref<AdminSteamTopupPromo[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isSubmitting = ref(false)
const isUpdatingPromoId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 20

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
let filterDebounce: ReturnType<typeof setTimeout> | null = null

const promoCode = ref('')
const promoDiscountPercent = ref('')
const promoUsageLimit = ref('')
const promoExpiresAt = ref('')
const promoIsActive = ref(true)

const hasMore = computed(() => currentPage.value < totalPages.value)

const statusOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'active', label: t('pages.admin.steamTopupsPage.statusActive') },
  { value: 'inactive', label: t('pages.admin.steamTopupsPage.statusInactive') },
])

function resolveUiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return getErrorMessage(error.response?.data?.detail ?? error.message, t)
  }
  return getErrorMessage(error, t)
}

function resetCreateForm() {
  promoCode.value = ''
  promoDiscountPercent.value = ''
  promoUsageLimit.value = ''
  promoExpiresAt.value = ''
  promoIsActive.value = true
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function buildCreatePayload(): CreateAdminSteamTopupPromoPayload | null {
  const code = promoCode.value.trim().toUpperCase()
  if (code.length < 3) return null

  const discountPercent = Number.parseFloat(promoDiscountPercent.value)
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 99.99) {
    return null
  }

  let usageLimit: number | null | undefined = undefined
  const usageLimitRaw = promoUsageLimit.value.trim()
  if (usageLimitRaw) {
    const parsedLimit = Number.parseInt(usageLimitRaw, 10)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) return null
    usageLimit = parsedLimit
  }

  const expiresAtIso = toIsoDateTime(promoExpiresAt.value)

  return {
    code,
    discount_percent: discountPercent,
    usage_limit: usageLimit,
    expires_at: expiresAtIso ?? null,
    is_active: promoIsActive.value,
  }
}

async function loadPromos(reset = false) {
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
    const response = await adminService.getSteamTopupPromos(page, perPage, {
      search: searchQuery.value.trim() || undefined,
      is_active: statusFilter.value,
    })
    if (reset) {
      promos.value = response.promos
    } else {
      promos.value.push(...response.promos)
    }

    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
    total.value = response.total
  } catch (error) {
    errorMessage.value = resolveUiError(error)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function createPromo() {
  if (isSubmitting.value) return
  const payload = buildCreatePayload()
  if (!payload) {
    errorMessage.value = t('pages.admin.steamTopupsPage.validationError')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const created = await adminService.createSteamTopupPromo(payload)
    if (!created) {
      errorMessage.value = t('pages.admin.steamTopupsPage.createError')
      return
    }
    successMessage.value = t('pages.admin.steamTopupsPage.createSuccess')
    resetCreateForm()
    await loadPromos(true)
  } catch (error) {
    errorMessage.value = resolveUiError(error)
  } finally {
    isSubmitting.value = false
  }
}

async function togglePromoStatus(promo: AdminSteamTopupPromo) {
  if (isUpdatingPromoId.value) return
  isUpdatingPromoId.value = promo.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updated = await adminService.updateSteamTopupPromo(promo.id, {
      is_active: !promo.is_active,
    })
    if (!updated) {
      errorMessage.value = t('pages.admin.steamTopupsPage.updateError')
      return
    }

    successMessage.value = t('pages.admin.steamTopupsPage.updateSuccess')
    const index = promos.value.findIndex(item => item.id === promo.id)
    if (index !== -1) {
      promos.value[index] = updated
    }
  } catch (error) {
    errorMessage.value = resolveUiError(error)
  } finally {
    isUpdatingPromoId.value = null
  }
}

function formatDate(value: string | null): string {
  if (!value) return t('common.notSpecified')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.notSpecified')
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatUsageLimit(promo: AdminSteamTopupPromo): string {
  if (promo.usage_limit === null) {
    return t('pages.admin.steamTopupsPage.unlimited')
  }
  return `${promo.used_count}/${promo.usage_limit}`
}

watch([searchQuery, statusFilter], () => {
  if (filterDebounce) clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => {
    loadPromos(true)
  }, 300)
})

onMounted(async () => {
  await loadPromos(true)
})

onUnmounted(() => {
  if (filterDebounce) {
    clearTimeout(filterDebounce)
  }
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <BackButton />
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.steamTopupsPage.title') }}</h1>
          <p class="text-xs sm:text-sm text-gray-400">{{ $t('pages.admin.steamTopupsPage.subtitle') }}</p>
        </div>
      </div>

      <div class="inline-flex items-center gap-2 text-xs sm:text-base text-text-secondary">
        <TicketPercent class="h-4 w-4" />
        <span>{{ $t('common.total') }} {{ total }}</span>
      </div>
    </div>

    <div class="rounded-xl border border-dark-700 bg-dark-700/30 p-3 space-y-3">
      <h2 class="text-sm font-semibold text-mainText">{{ $t('pages.admin.steamTopupsPage.createTitle') }}</h2>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          v-model.trim="promoCode"
          class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText uppercase focus:border-blue-500 focus:outline-none"
          :placeholder="$t('pages.admin.steamTopupsPage.codePlaceholder')"
        />
        <input
          v-model.trim="promoDiscountPercent"
          type="number"
          min="0.01"
          max="99.99"
          step="0.01"
          class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
          :placeholder="$t('pages.admin.steamTopupsPage.discountPlaceholder')"
        />
        <input
          v-model.trim="promoUsageLimit"
          type="number"
          min="1"
          step="1"
          class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
          :placeholder="$t('pages.admin.steamTopupsPage.usageLimitPlaceholder')"
        />
        <input
          v-model="promoExpiresAt"
          type="datetime-local"
          class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
          :title="$t('pages.admin.steamTopupsPage.expiresAt')"
        />
        <label class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText flex items-center gap-2">
          <input
            v-model="promoIsActive"
            type="checkbox"
            class="h-4 w-4 rounded border-dark-600 bg-dark-800 text-blue-500 focus:ring-blue-500/40"
          />
          {{ $t('pages.admin.steamTopupsPage.activeOnCreate') }}
        </label>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="admin-btn admin-btn-primary admin-btn-sm"
          :disabled="isSubmitting"
          @click="createPromo"
        >
          {{ isSubmitting ? $t('common.sending') : $t('pages.admin.steamTopupsPage.createAction') }}
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-dark-700 bg-dark-700/30 p-3 space-y-3">
      <SearchField
        v-model="searchQuery"
        :placeholder="$t('pages.admin.steamTopupsPage.searchPlaceholder')"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CustomSelect
          v-model="statusFilter"
          :options="statusOptions"
          :placeholder="$t('pages.admin.steamTopupsPage.statusFilter')"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {{ errorMessage }}
    </p>
    <p v-else-if="successMessage" class="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
      {{ successMessage }}
    </p>

    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
        <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="promos.length === 0" class="flex h-32 items-center justify-center">
        <p class="text-gray-400">{{ $t('pages.admin.steamTopupsPage.empty') }}</p>
      </div>

      <div v-else class="h-full overflow-y-auto space-y-3 pr-1 pb-4">
        <article
          v-for="promo in promos"
          :key="promo.id"
          class="rounded-xl border border-dark-700 bg-dark-600 p-3 sm:p-4"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full border px-2 py-1 text-xs"
                :class="promo.is_active
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-gray-500/40 bg-gray-500/15 text-gray-200'"
              >
                {{ promo.is_active ? $t('pages.admin.steamTopupsPage.statusActive') : $t('pages.admin.steamTopupsPage.statusInactive') }}
              </span>
              <span class="font-mono text-sm text-mainText">{{ promo.code }}</span>
            </div>

            <button
              type="button"
              class="admin-btn admin-btn-sm"
              :class="promo.is_active ? 'admin-btn-danger' : 'admin-btn-success'"
              :disabled="isUpdatingPromoId === promo.id"
              @click="togglePromoStatus(promo)"
            >
              {{
                promo.is_active
                  ? $t('pages.admin.steamTopupsPage.deactivate')
                  : $t('pages.admin.steamTopupsPage.activate')
              }}
            </button>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span class="text-gray-400">{{ $t('pages.admin.steamTopupsPage.discount') }}:</span>
              <span class="ml-1 font-semibold">{{ promo.discount_percent }}%</span>
            </p>
            <p>
              <span class="text-gray-400">{{ $t('pages.admin.steamTopupsPage.usage') }}:</span>
              <span class="ml-1">{{ formatUsageLimit(promo) }}</span>
            </p>
            <p>
              <span class="text-gray-400">{{ $t('pages.admin.steamTopupsPage.expiresAt') }}:</span>
              <span class="ml-1">{{ formatDate(promo.expires_at) }}</span>
            </p>
            <p>
              <span class="text-gray-400">{{ $t('pages.admin.steamTopupsPage.createdAt') }}:</span>
              <span class="ml-1">{{ formatDate(promo.created_at) }}</span>
            </p>
          </div>
        </article>

        <div class="flex justify-center pt-2">
          <button
            v-if="hasMore && !isLoadingMore"
            type="button"
            class="admin-btn admin-btn-ghost w-full justify-center"
            @click="loadPromos(false)"
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
</template>
