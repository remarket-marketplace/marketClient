<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import BackButton from '@/components/navigation/BackButton.vue'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import { getErrorMessage } from '@/utils/errorsMap'
import {
  adminService,
  type AdminPromoCode,
  type CreateAdminPromoCodePayload,
} from '@/api/admin/AdminService'

type LifetimeUnit = 'minutes' | 'hours' | 'days'

const promos = ref<AdminPromoCode[]>([])
const { t } = useI18n()
const isLoading = ref(false)
const isSubmitting = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 20

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const appliesToFilter = ref<'all' | 'wallet_topup' | 'marketplace_purchase'>('all')

const code = ref('')
const discountType = ref<'percent' | 'fixed'>('percent')
const discountValue = ref('')
const maxDiscountAmount = ref('')
const minOrderAmount = ref('')
const totalUsageLimit = ref('')
const perUserUsageLimit = ref('1')
const appliesTo = ref<'wallet_topup' | 'marketplace_purchase'>('wallet_topup')
const isActive = ref(true)
const hasLifetime = ref(false)
const lifetimeValue = ref('1')
const lifetimeUnit = ref<LifetimeUnit>('days')

const errorMessage = ref('')
const successMessage = ref('')

const statusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
]

const discountTypeOptions = [
  { value: 'percent', label: 'Процент' },
  { value: 'fixed', label: 'Фиксированная сумма' },
]

const appliesToOptions = [
  { value: 'all', label: 'Все сценарии' },
  { value: 'wallet_topup', label: 'Кошелек' },
  { value: 'marketplace_purchase', label: 'Покупка товара' },
]

const createAppliesToOptions = computed(() => appliesToOptions.filter(item => item.value !== 'all'))
const lifetimeUnitOptions = [
  { value: 'minutes', label: 'Минуты' },
  { value: 'hours', label: 'Часы' },
  { value: 'days', label: 'Дни' },
]
const lifetimePresets: Array<{ label: string; value: number; unit: LifetimeUnit }> = [
  { label: '15 мин', value: 15, unit: 'minutes' },
  { label: '1 час', value: 1, unit: 'hours' },
  { label: '24 часа', value: 24, unit: 'hours' },
  { label: '7 дней', value: 7, unit: 'days' },
]
const showMaxDiscount = computed(() => discountType.value === 'percent')

function normalizeNumericInput(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }
  if (typeof value === 'string') {
    return value.trim().replace(',', '.')
  }
  return String(value).trim().replace(',', '.')
}

function toPositiveInt(value: unknown): number | null {
  const normalized = normalizeNumericInput(value)
  if (!normalized) return null
  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function toPositiveFloat(value: unknown): number | null {
  const normalized = normalizeNumericInput(value)
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function toNonNegativeFloat(value: unknown): number | null {
  const normalized = normalizeNumericInput(value)
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function formatScenario(value: string): string {
  if (value === 'wallet_topup') return 'Кошелек'
  if (value === 'marketplace_purchase') return 'Покупка товара'
  return value
}

function formatDiscountType(value: string): string {
  if (value === 'percent') return 'Процент'
  if (value === 'fixed') return 'Фиксированная сумма'
  return value
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
}

function formatDiscountValue(value: number, type: string): string {
  if (type === 'percent') return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`
  return formatMoney(value)
}

function formatLifetimeUnit(value: number, unit: LifetimeUnit): string {
  const mod10 = value % 10
  const mod100 = value % 100
  const isSingle = mod10 === 1 && mod100 !== 11
  const isFew = mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)

  if (unit === 'minutes') {
    if (isSingle) return 'минута'
    if (isFew) return 'минуты'
    return 'минут'
  }
  if (unit === 'hours') {
    if (isSingle) return 'час'
    if (isFew) return 'часа'
    return 'часов'
  }
  if (isSingle) return 'день'
  if (isFew) return 'дня'
  return 'дней'
}

function applyLifetimePreset(value: number, unit: LifetimeUnit) {
  hasLifetime.value = true
  lifetimeValue.value = String(value)
  lifetimeUnit.value = unit
}

const promoPreview = computed(() => {
  const normalizedCode = code.value.trim().toUpperCase() || 'НОВЫЙКОД'
  const discount = toPositiveFloat(discountValue.value)
  const totalLimit = toPositiveInt(totalUsageLimit.value)
  const perUserLimit = toPositiveInt(perUserUsageLimit.value) ?? 1
  const minAmount = toNonNegativeFloat(minOrderAmount.value)
  const maxDiscount = toPositiveFloat(maxDiscountAmount.value)
  const scenario = formatScenario(appliesTo.value)
  const discountPart = discount
    ? (discountType.value === 'percent'
      ? `${discount}%`
      : formatMoney(discount))
    : 'скидка не указана'
  const maxDiscountPart = showMaxDiscount.value && maxDiscount
    ? `, максимум ${formatMoney(maxDiscount)}`
    : ''
  const minAmountPart = minAmount !== null ? `, от ${formatMoney(minAmount)}` : ''
  const totalLimitPart = totalLimit ? `, всего ${totalLimit} раз` : ', без общего лимита'
  const lifetimeAmount = toPositiveInt(lifetimeValue.value)
  const lifetimePart = hasLifetime.value && lifetimeAmount
    ? `, срок ${lifetimeAmount} ${lifetimeUnit.value === 'minutes' ? 'мин.' : lifetimeUnit.value === 'hours' ? 'ч.' : 'дн.'}`
    : ', без срока'
  const statusPart = isActive.value ? ', активен' : ', не активен'

  return `${normalizedCode}: ${discountPart}${maxDiscountPart}${minAmountPart}, ${scenario}, на пользователя ${perUserLimit}${totalLimitPart}${lifetimePart}${statusPart}`
})

const lifetimeSummary = computed(() => {
  if (!hasLifetime.value) return 'Промокод действует без ограничения по времени.'
  const amount = toPositiveInt(lifetimeValue.value)
  if (!amount) return 'Укажите срок больше 0.'
  return `Промокод будет активен ${amount} ${formatLifetimeUnit(amount, lifetimeUnit.value)}.`
})

const lifetimeEndsPreview = computed(() => {
  if (!hasLifetime.value) return 'Бессрочно'
  const lifetime = getLifetimeDates()
  if (!lifetime?.ends_at) return 'Укажите корректный срок'

  const parsed = new Date(lifetime.ends_at)
  if (Number.isNaN(parsed.getTime())) return 'Проверьте срок'

  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const activationSummary = computed(() => {
  if (isActive.value) {
    return 'Промокод станет доступен сразу после создания.'
  }
  return 'Промокод создастся выключенным. Его можно включить позже в списке.'
})

function getApiErrorDetail(error: unknown): unknown {
  if (!error || typeof error !== 'object') return error
  const response = (error as { response?: { data?: { detail?: unknown } } }).response
  return response?.data?.detail ?? error
}

function getLifetimeDates() {
  if (!hasLifetime.value) return null

  const parsedLifetime = Number.parseInt(lifetimeValue.value, 10)
  if (!Number.isFinite(parsedLifetime) || parsedLifetime <= 0) return null

  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime())

  if (lifetimeUnit.value === 'minutes') {
    endsAt.setMinutes(endsAt.getMinutes() + parsedLifetime)
  } else if (lifetimeUnit.value === 'hours') {
    endsAt.setHours(endsAt.getHours() + parsedLifetime)
  } else {
    endsAt.setDate(endsAt.getDate() + parsedLifetime)
  }

  if (endsAt.getTime() <= startsAt.getTime()) return null

  return {
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  }
}

function formatPromoLifetime(endsAt: string | null | undefined) {
  if (!endsAt) return 'Без срока'
  const parsed = new Date(endsAt)
  if (Number.isNaN(parsed.getTime())) return endsAt
  return parsed.toLocaleString('ru-RU')
}

async function loadPromos() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getPromoCodes(currentPage.value, perPage, {
      search: searchQuery.value || undefined,
      is_active: statusFilter.value,
      applies_to: appliesToFilter.value,
    })
    promos.value = response.promos
    total.value = response.total
    totalPages.value = response.totalPages
  } catch {
    errorMessage.value = 'Не удалось загрузить промокоды'
  } finally {
    isLoading.value = false
  }
}

function buildPayload(): CreateAdminPromoCodePayload | null {
  const normalizedCode = code.value.trim().toUpperCase()
  const parsedDiscount = toPositiveFloat(discountValue.value)
  const parsedMaxDiscount = toPositiveFloat(maxDiscountAmount.value)
  const parsedMinOrder = toNonNegativeFloat(minOrderAmount.value)
  const parsedTotalUsage = toPositiveInt(totalUsageLimit.value)
  const parsedPerUser = toPositiveInt(perUserUsageLimit.value) ?? 1
  const lifetime = getLifetimeDates()

  if (!normalizedCode || !parsedDiscount || !parsedPerUser) {
    return null
  }
  if (hasLifetime.value && !lifetime) {
    return null
  }

  return {
    code: normalizedCode,
    discount_type: discountType.value,
    discount_value: parsedDiscount,
    max_discount_amount: showMaxDiscount.value && parsedMaxDiscount ? parsedMaxDiscount : null,
    min_order_amount: parsedMinOrder,
    total_usage_limit: parsedTotalUsage,
    per_user_usage_limit: parsedPerUser,
    is_active: isActive.value,
    applies_to: appliesTo.value,
    starts_at: lifetime?.starts_at,
    ends_at: lifetime?.ends_at,
  }
}

async function createPromo() {
  if (isSubmitting.value) return
  const payload = buildPayload()
  if (!payload) {
    errorMessage.value = 'Проверьте обязательные поля: код, скидка и лимиты'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await adminService.createPromoCode(payload)
    successMessage.value = 'Промокод создан'
    code.value = ''
    discountValue.value = ''
    maxDiscountAmount.value = ''
    minOrderAmount.value = ''
    totalUsageLimit.value = ''
    perUserUsageLimit.value = '1'
    hasLifetime.value = false
    lifetimeValue.value = '1'
    lifetimeUnit.value = 'days'
    await loadPromos()
  } catch (e) {
    console.error('Create promo submit error:', e)
    errorMessage.value = getErrorMessage(getApiErrorDetail(e), t)
  } finally {
    isSubmitting.value = false
  }
}

async function togglePromo(promo: AdminPromoCode) {
  const updated = await adminService.updatePromoCode(promo.id, { is_active: !promo.is_active })
  if (!updated) {
    errorMessage.value = 'Не удалось обновить промокод'
    return
  }
  const idx = promos.value.findIndex(item => item.id === promo.id)
  if (idx !== -1) promos.value[idx] = updated
}

watch(discountType, (nextType) => {
  if (nextType !== 'percent') {
    maxDiscountAmount.value = ''
  }
})

watch([searchQuery, statusFilter, appliesToFilter], () => {
  currentPage.value = 1
  void loadPromos()
})

onMounted(async () => {
  await loadPromos()
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-y-auto pt-3 pb-4 pr-1 md:pt-4">
    <div class="flex items-center gap-2">
      <BackButton />
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-mainText">Промокоды</h1>
        <p class="text-xs sm:text-sm text-gray-400">Универсальные промокоды для платежных сценариев</p>
      </div>
    </div>

    <div class="rounded-xl border border-dark-700 bg-dark-700/30 p-4 sm:p-5 space-y-4">
      <h2 class="text-base font-semibold text-mainText">Создать промокод</h2>

      <div class="rounded-lg border border-dark-700/80 bg-dark-600/40 p-3 space-y-3">
        <h3 class="text-sm font-semibold text-mainText">1. Основное</h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Код промокода</label>
            <input
              v-model.trim="code"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Например, CODE2026"
            />
            <p class="text-xs text-gray-500">Уникальный код без пробелов по краям.</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Сценарий</label>
            <CustomSelect v-model="appliesTo" :options="createAppliesToOptions" />
            <p class="text-xs text-gray-500">Где можно применить промокод.</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Тип скидки</label>
            <CustomSelect v-model="discountType" :options="discountTypeOptions" />
            <p class="text-xs text-gray-500">Процент от суммы или фиксированная сумма.</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Скидка</label>
            <input
              v-model.trim="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Введите значение"
            />
            <p class="text-xs text-gray-500">Число больше 0.</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-dark-700/80 bg-dark-600/40 p-3 space-y-3">
        <h3 class="text-sm font-semibold text-mainText">2. Ограничения</h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Минимальная сумма заказа</label>
            <input
              v-model.trim="minOrderAmount"
              type="number"
              step="0.01"
              min="0"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Например, 500"
            />
            <p class="text-xs text-gray-500">От какой суммы код будет работать.</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Всего использований</label>
            <input
              v-model.trim="totalUsageLimit"
              type="number"
              step="1"
              min="1"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Оставьте пустым без лимита"
            />
            <p class="text-xs text-gray-500">Общий лимит для всех пользователей.</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">На 1 пользователя</label>
            <input
              v-model.trim="perUserUsageLimit"
              type="number"
              step="1"
              min="1"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Минимум 1"
            />
            <p class="text-xs text-gray-500">Сколько раз один человек может применить код.</p>
          </div>

          <div v-if="showMaxDiscount" class="space-y-1.5">
            <label class="text-xs font-medium text-gray-300">Максимальная скидка</label>
            <input
              v-model.trim="maxDiscountAmount"
              type="number"
              step="0.01"
              min="0.01"
              class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
              placeholder="Например, 300"
            />
            <p class="text-xs text-gray-500">Потолок скидки при процентном типе.</p>
          </div>
        </div>
        <p v-if="!showMaxDiscount" class="text-xs text-gray-500">
          Для фиксированной скидки максимум не нужен.
        </p>
      </div>

      <div class="rounded-lg border border-dark-700/80 bg-dark-600/40 p-3 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-mainText">3. Срок действия</h3>
          <span
            class="rounded-full border px-2 py-0.5 text-[11px]"
            :class="hasLifetime ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-dark-700 bg-dark-700/60 text-gray-400'"
          >
            {{ hasLifetime ? 'Ограничен' : 'Бессрочный' }}
          </span>
        </div>

        <div class="rounded-lg border border-dark-700 bg-dark-700/35 px-3 py-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-0.5">
              <p class="text-sm text-mainText">Ограничить сроком</p>
              <p class="text-xs text-gray-500">Промокод выключится автоматически после срока.</p>
            </div>
            <div class="segmented-toggle segmented-toggle-blue" role="group" aria-label="Ограничение срока">
              <span class="segmented-toggle__thumb" :class="!hasLifetime ? 'segmented-toggle__thumb--right' : ''" />
              <button
                type="button"
                class="segmented-toggle__button"
                :class="hasLifetime ? 'segmented-toggle__button--active' : ''"
                :aria-pressed="hasLifetime"
                @click="hasLifetime = true"
              >
                Вкл
              </button>
              <button
                type="button"
                class="segmented-toggle__button"
                :class="!hasLifetime ? 'segmented-toggle__button--active' : ''"
                :aria-pressed="!hasLifetime"
                @click="hasLifetime = false"
              >
                Выкл
              </button>
            </div>
          </div>
        </div>

        <div v-if="hasLifetime" class="space-y-3">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-300">Срок жизни</label>
              <input
                v-model.trim="lifetimeValue"
                type="number"
                step="1"
                min="1"
                class="h-10 w-full rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText"
                placeholder="Например, 1"
              />
              <p class="text-xs text-gray-500">Целое число больше 0.</p>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-300">Единица срока</label>
              <CustomSelect v-model="lifetimeUnit" :options="lifetimeUnitOptions" />
              <p class="text-xs text-gray-500">Минуты, часы или дни.</p>
            </div>
          </div>

          <div class="space-y-1.5">
            <p class="text-xs font-medium text-gray-300">Быстрый выбор</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in lifetimePresets"
                :key="preset.label"
                type="button"
                class="rounded-md border border-dark-600 bg-dark-700/45 px-2.5 py-1 text-xs text-gray-200 transition hover:border-blue-400/45 hover:text-mainText"
                :class="Number(lifetimeValue) === preset.value && lifetimeUnit === preset.unit
                  ? 'border-blue-500/60 bg-blue-500/12 text-blue-200'
                  : ''"
                @click="applyLifetimePreset(preset.value, preset.unit)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div class="rounded-lg border border-dark-700 bg-dark-700/30 px-3 py-2">
            <p class="text-xs text-gray-400">{{ lifetimeSummary }}</p>
            <p class="text-sm text-mainText">
              Истечет:
              <span class="font-medium text-blue-200">{{ lifetimeEndsPreview }}</span>
            </p>
          </div>
        </div>

        <p v-else class="text-xs text-gray-500">
          Если не ограничивать сроком, промокод действует бессрочно.
        </p>
      </div>

      <div class="rounded-lg border border-dark-700/80 bg-dark-600/40 p-3 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-mainText">4. Статус и создание</h3>
          <span
            class="rounded-full border px-2 py-0.5 text-[11px]"
            :class="isActive ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-dark-700 bg-dark-700/60 text-gray-400'"
          >
            {{ isActive ? 'Активен' : 'Выключен' }}
          </span>
        </div>

        <div class="rounded-lg border border-dark-700 bg-dark-700/35 px-3 py-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-0.5">
              <p class="text-sm text-mainText">Сделать промокод активным</p>
              <p class="text-xs text-gray-500">{{ activationSummary }}</p>
            </div>
            <div class="segmented-toggle segmented-toggle-emerald" role="group" aria-label="Статус промокода">
              <span class="segmented-toggle__thumb" :class="!isActive ? 'segmented-toggle__thumb--right' : ''" />
              <button
                type="button"
                class="segmented-toggle__button"
                :class="isActive ? 'segmented-toggle__button--active' : ''"
                :aria-pressed="isActive"
                @click="isActive = true"
              >
                Вкл
              </button>
              <button
                type="button"
                class="segmented-toggle__button"
                :class="!isActive ? 'segmented-toggle__button--active' : ''"
                :aria-pressed="!isActive"
                @click="isActive = false"
              >
                Выкл
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div class="rounded-lg border border-blue-500/35 bg-blue-500/10 px-3 py-2">
            <p class="text-[11px] uppercase tracking-wide text-blue-200/90">Предпросмотр</p>
            <p class="text-sm text-mainText">{{ promoPreview }}</p>
          </div>

          <div class="rounded-lg border border-dark-700 bg-dark-700/35 p-3 space-y-2">
            <p class="text-xs text-gray-400">Действие</p>
            <button
              type="button"
              class="admin-btn admin-btn-primary admin-btn-sm w-full justify-center"
              :disabled="isSubmitting"
              @click="createPromo"
            >
              {{ isSubmitting ? 'Создаем...' : 'Создать' }}
            </button>
            <p class="text-[11px] text-gray-500">Обязательные поля: код, тип и значение скидки.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-dark-700 bg-dark-700/30 p-4 sm:p-5 space-y-3">
      <div>
        <h2 class="text-sm font-semibold text-mainText">Список промокодов</h2>
        <p class="text-xs text-gray-400">Поиск и фильтры</p>
      </div>
      <SearchField v-model="searchQuery" placeholder="Поиск по коду" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CustomSelect v-model="statusFilter" :options="statusOptions" />
        <CustomSelect v-model="appliesToFilter" :options="appliesToOptions" />
      </div>
    </div>

    <p v-if="errorMessage" class="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{{ errorMessage }}</p>
    <p v-else-if="successMessage" class="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{{ successMessage }}</p>

    <div class="space-y-3">
      <div v-if="isLoading" class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
      </div>
      <article v-for="promo in promos" :key="promo.id" class="rounded-xl border border-dark-700 bg-dark-600 p-3 sm:p-4">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-mainText">{{ promo.code }}</div>
          <button class="admin-btn admin-btn-outline admin-btn-sm" @click="togglePromo(promo)">
            {{ promo.is_active ? 'Деактивировать' : 'Активировать' }}
          </button>
        </div>
        <div class="mt-2 text-sm text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-1">
          <p>Тип: {{ formatDiscountType(promo.discount_type) }}</p>
          <p>Скидка: {{ formatDiscountValue(promo.discount_value, promo.discount_type) }}</p>
          <p>Сценарий: {{ formatScenario(promo.applies_to) }}</p>
          <p>На 1 пользователя: {{ promo.per_user_usage_limit }}</p>
          <p>Мин. сумма: {{ formatMoney(promo.min_order_amount) }}</p>
          <p>Всего использований: {{ promo.total_usage_limit ?? 'Без лимита' }}</p>
          <p>Действует до: {{ formatPromoLifetime(promo.ends_at) }}</p>
        </div>
      </article>
      <p class="text-xs text-gray-500">Всего: {{ total }} | Страниц: {{ totalPages }}</p>
    </div>
  </section>
</template>

<style scoped>
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.segmented-toggle {
  position: relative;
  width: min(100%, 210px);
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px;
  border-radius: 14px;
  border: 1px solid rgba(71, 85, 105, 0.55);
  background: linear-gradient(120deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9));
  overflow: hidden;
}

.segmented-toggle__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  border-radius: 10px;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease, background 240ms ease;
}

.segmented-toggle__thumb--right {
  transform: translateX(100%);
}

.segmented-toggle__button {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.74);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 10px;
  transition: color 180ms ease;
}

.segmented-toggle__button--active {
  color: #fff;
}

.segmented-toggle-blue .segmented-toggle__thumb {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(29, 78, 216, 0.95));
  box-shadow: 0 8px 26px rgba(59, 130, 246, 0.4);
}

.segmented-toggle-emerald .segmented-toggle__thumb {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
  box-shadow: 0 8px 26px rgba(16, 185, 129, 0.38);
}
</style>
