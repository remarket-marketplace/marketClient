<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
const appliesToFilter = ref<'all' | 'wallet_topup' | 'marketplace_purchase' | 'steam_topup'>('all')

const code = ref('')
const discountType = ref<'percent' | 'fixed'>('percent')
const discountValue = ref('')
const maxDiscountAmount = ref('')
const minOrderAmount = ref('')
const totalUsageLimit = ref('')
const perUserUsageLimit = ref('1')
const appliesTo = ref<'wallet_topup' | 'marketplace_purchase' | 'steam_topup'>('wallet_topup')
const isActive = ref(true)
const hasLifetime = ref(false)
const lifetimeValue = ref('1')
const lifetimeUnit = ref<LifetimeUnit>('days')

const errorMessage = ref('')
const successMessage = ref('')
const submitAttempted = ref(false)
const basicSectionRef = ref<HTMLElement | null>(null)
const lifetimeSectionRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLInputElement | null>(null)
const discountInputRef = ref<HTMLInputElement | null>(null)
const lifetimeInputRef = ref<HTMLInputElement | null>(null)
const invalidSectionKey = ref<'basic' | 'lifetime' | null>(null)

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
  { value: 'steam_topup', label: 'Steam пополнение' },
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
  if (value === 'steam_topup') return 'Steam пополнение'
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

const normalizedCode = computed(() => code.value.trim())
const normalizedDiscountValue = computed(() => toPositiveFloat(discountValue.value))
const normalizedLifetimeValue = computed(() => toPositiveInt(lifetimeValue.value))

const requiredErrors = computed(() => ({
  code: submitAttempted.value && !normalizedCode.value,
  discountValue: submitAttempted.value && !normalizedDiscountValue.value,
  lifetimeValue: submitAttempted.value && hasLifetime.value && !normalizedLifetimeValue.value,
}))
const activeFiltersCount = computed(() => (
  Number(Boolean(searchQuery.value.trim()))
  + Number(statusFilter.value !== 'all')
  + Number(appliesToFilter.value !== 'all')
))

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

function resetPromoFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  appliesToFilter.value = 'all'
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

function focusAndScroll(target: HTMLElement | null, input?: HTMLInputElement | null) {
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (input) {
    window.setTimeout(() => input.focus(), 220)
  }
}

function scrollToFirstInvalidField() {
  if (requiredErrors.value.code) {
    invalidSectionKey.value = 'basic'
    focusAndScroll(basicSectionRef.value, codeInputRef.value)
    return
  }
  if (requiredErrors.value.discountValue) {
    invalidSectionKey.value = 'basic'
    focusAndScroll(basicSectionRef.value, discountInputRef.value)
    return
  }
  if (requiredErrors.value.lifetimeValue) {
    invalidSectionKey.value = 'lifetime'
    focusAndScroll(lifetimeSectionRef.value, lifetimeInputRef.value)
    return
  }
  invalidSectionKey.value = null
}

watch(invalidSectionKey, (nextValue) => {
  if (!nextValue) return
  window.setTimeout(() => {
    if (invalidSectionKey.value === nextValue) invalidSectionKey.value = null
  }, 420)
})

async function createPromo() {
  if (isSubmitting.value) return
  submitAttempted.value = true
  const payload = buildPayload()
  if (!payload) {
    errorMessage.value = 'Проверьте обязательные поля: код, скидка и лимиты'
    void nextTick(() => {
      scrollToFirstInvalidField()
    })
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
    submitAttempted.value = false
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
        <h1 class="text-xl sm:text-2xl font-bold text-mainText">{{ t('pages.admin.steamTopupsPage.title') }}</h1>
        <p class="text-xs sm:text-sm text-[rgb(var(--palette-gray-400))]">{{ t('pages.admin.steamTopupsPage.subtitle') }}</p>
      </div>
    </div>

    <div class="admin-surface-panel promo-create-panel rounded-[1.5rem] p-4 sm:p-5 space-y-4">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold text-mainText">Создать промокод</h2>
        <p class="text-xs text-[rgb(var(--palette-gray-400))]">Поля, отмеченные <span class="text-[rgb(var(--palette-red-300))]">*</span>, обязательны.</p>
      </div>

      <div
        ref="basicSectionRef"
        class="admin-surface-soft promo-section rounded-[1.2rem] p-4 space-y-4"
        :class="{ 'promo-section--invalid': invalidSectionKey === 'basic' }"
      >
        <div class="promo-section__head">
          <h3 class="promo-section__title">1. Основное</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
              Код промокода <span class="field__required">*</span>
            </label>
            <input
              ref="codeInputRef"
              v-model.trim="code"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              :class="{ 'form-control--error': requiredErrors.code }"
              placeholder="Например, CODE2026"
            />
            <p v-if="requiredErrors.code" class="field__error">Введите код промокода.</p>
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Уникальный код без пробелов по краям.</p>
          </div>

          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
              Сценарий <span class="field__required">*</span>
            </label>
            <CustomSelect v-model="appliesTo" :options="createAppliesToOptions" />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Где можно применить промокод.</p>
          </div>

          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
              Тип скидки <span class="field__required">*</span>
            </label>
            <CustomSelect v-model="discountType" :options="discountTypeOptions" />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Процент от суммы или фиксированная сумма.</p>
          </div>

          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
              Скидка <span class="field__required">*</span>
            </label>
            <input
              ref="discountInputRef"
              v-model.trim="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              :class="{ 'form-control--error': requiredErrors.discountValue }"
              placeholder="Введите значение"
            />
            <p v-if="requiredErrors.discountValue" class="field__error">Укажите значение скидки больше 0.</p>
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Число больше 0.</p>
          </div>
        </div>
      </div>

      <div class="admin-surface-soft promo-section rounded-[1.2rem] p-4 space-y-4">
        <div class="promo-section__head">
          <h3 class="promo-section__title">2. Ограничения</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Минимальная сумма заказа</label>
            <input
              v-model.trim="minOrderAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              placeholder="Например, 500"
            />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">От какой суммы код будет работать.</p>
          </div>

          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Всего использований</label>
            <input
              v-model.trim="totalUsageLimit"
              type="number"
              step="1"
              min="1"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              placeholder="Оставьте пустым без лимита"
            />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Общий лимит для всех пользователей.</p>
          </div>

          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
              На 1 пользователя <span class="field__required">*</span>
            </label>
            <input
              v-model.trim="perUserUsageLimit"
              type="number"
              step="1"
              min="1"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              placeholder="Минимум 1"
            />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Сколько раз один человек может применить код.</p>
          </div>

          <div v-if="showMaxDiscount" class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Максимальная скидка</label>
            <input
              v-model.trim="maxDiscountAmount"
              type="number"
              step="0.01"
              min="0.01"
              class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
              placeholder="Например, 300"
            />
            <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Потолок скидки при процентном типе.</p>
          </div>
        </div>
        <p v-if="!showMaxDiscount" class="text-xs text-[rgb(var(--palette-gray-500))]">
          Для фиксированной скидки максимум не нужен.
        </p>
      </div>

      <div
        ref="lifetimeSectionRef"
        class="admin-surface-soft promo-section rounded-[1.2rem] p-4 space-y-4"
        :class="{ 'promo-section--invalid': invalidSectionKey === 'lifetime' }"
      >
        <div class="flex items-center justify-between gap-2">
          <h3 class="promo-section__title">3. Срок действия</h3>
          <span
            class="rounded-full border px-2 py-0.5 text-[11px]"
            :class="hasLifetime ? 'border-[rgb(var(--palette-blue-500)/0.25)] bg-[rgb(var(--palette-blue-500)/0.08)] text-[rgb(var(--palette-blue-200))]' : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] text-[rgb(var(--palette-gray-400))]'"
          >
            {{ hasLifetime ? 'Ограничен' : 'Бессрочный' }}
          </span>
        </div>

        <div class="admin-surface-soft rounded-lg px-3 py-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-0.5">
              <p class="text-sm text-mainText">Ограничить сроком</p>
              <p class="text-xs text-[rgb(var(--palette-gray-500))]">Промокод выключится автоматически после срока.</p>
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
            <div class="field space-y-1.5">
              <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">
                Срок жизни <span class="field__required">*</span>
              </label>
              <input
                ref="lifetimeInputRef"
                v-model.trim="lifetimeValue"
                type="number"
                step="1"
                min="1"
                class="form-control admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText"
                :class="{ 'form-control--error': requiredErrors.lifetimeValue }"
                placeholder="Например, 1"
              />
              <p v-if="requiredErrors.lifetimeValue" class="field__error">Укажите срок больше 0.</p>
              <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Целое число больше 0.</p>
            </div>

            <div class="field space-y-1.5">
              <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Единица срока</label>
              <CustomSelect v-model="lifetimeUnit" :options="lifetimeUnitOptions" />
              <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Минуты, часы или дни.</p>
            </div>
          </div>

          <div class="space-y-1.5">
            <p class="text-xs font-medium text-[rgb(var(--palette-gray-300))]">Быстрый выбор</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in lifetimePresets"
                :key="preset.label"
                type="button"
                class="rounded-md border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1 text-xs text-[rgb(var(--palette-gray-200))] transition hover:border-[rgb(var(--palette-blue-400)/0.35)] hover:bg-[rgb(var(--palette-white)/0.05)] hover:text-mainText"
                :class="Number(lifetimeValue) === preset.value && lifetimeUnit === preset.unit
                  ? 'border-[rgb(var(--palette-blue-500)/0.6)] bg-[rgb(var(--palette-blue-500)/0.12)] text-[rgb(var(--palette-blue-200))]'
                  : ''"
                @click="applyLifetimePreset(preset.value, preset.unit)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div class="admin-surface-soft rounded-lg px-3 py-2">
            <p class="text-xs text-[rgb(var(--palette-gray-400))]">{{ lifetimeSummary }}</p>
            <p class="text-sm text-mainText">
              Истечет:
              <span class="font-medium text-[rgb(var(--palette-blue-200))]">{{ lifetimeEndsPreview }}</span>
            </p>
          </div>
        </div>

        <p v-else class="text-xs text-[rgb(var(--palette-gray-500))]">
          Если не ограничивать сроком, промокод действует бессрочно.
        </p>
      </div>

      <div class="admin-surface-soft promo-section rounded-[1.2rem] p-4 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="promo-section__title">4. Статус и создание</h3>
          <span
            class="rounded-full border px-2 py-0.5 text-[11px]"
            :class="isActive ? 'border-[rgb(var(--palette-emerald-500)/0.25)] bg-[rgb(var(--palette-emerald-500)/0.08)] text-[rgb(var(--palette-emerald-200))]' : 'border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] text-[rgb(var(--palette-gray-400))]'"
          >
            {{ isActive ? 'Активен' : 'Выключен' }}
          </span>
        </div>

        <div class="admin-surface-soft rounded-lg px-3 py-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-0.5">
              <p class="text-sm text-mainText">Сделать промокод активным</p>
              <p class="text-xs text-[rgb(var(--palette-gray-500))]">{{ activationSummary }}</p>
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

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div class="preview-card admin-surface-soft rounded-lg px-3 py-3">
            <p class="preview-card__label text-[11px] uppercase tracking-wide text-[rgb(var(--palette-blue-200)/0.9)]">Предпросмотр</p>
            <p class="text-sm text-mainText">{{ promoPreview }}</p>
          </div>

          <div class="action-card admin-surface-soft rounded-lg p-3 space-y-2">
            <p class="text-xs text-[rgb(var(--palette-gray-400))]">Действие</p>
            <button
              type="button"
              class="admin-btn admin-btn-primary admin-btn-sm w-full justify-center action-card__button"
              :disabled="isSubmitting"
              @click="createPromo"
            >
              {{ isSubmitting ? 'Создаем...' : 'Создать' }}
            </button>
            <p class="text-[11px] text-[rgb(var(--palette-gray-500))]">Обязательные поля: код, тип и значение скидки.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-surface-panel promo-list-panel rounded-[1.5rem] p-4 sm:p-5 space-y-4">
      <div class="promo-list-panel__head">
        <div>
          <h2 class="text-sm font-semibold text-mainText">Список промокодов</h2>
          <p class="text-xs text-[rgb(var(--palette-gray-400))]">Поиск и фильтры</p>
        </div>
        <button
          type="button"
          class="promo-list-panel__reset text-xs"
          :disabled="activeFiltersCount === 0"
          @click="resetPromoFilters"
        >
          Сбросить
        </button>
      </div>
      <div class="admin-surface-soft rounded-lg p-3 space-y-3">
        <div class="field space-y-1.5">
          <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Поиск по коду</label>
          <SearchField v-model="searchQuery" placeholder="Например, SPRING2026" />
          <p class="field__hint text-xs text-[rgb(var(--palette-gray-500))]">Поиск срабатывает по части кода.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Статус</label>
            <CustomSelect v-model="statusFilter" :options="statusOptions" />
          </div>
          <div class="field space-y-1.5">
            <label class="field__label text-xs font-medium text-[rgb(var(--palette-gray-300))]">Сценарий</label>
            <CustomSelect v-model="appliesToFilter" :options="appliesToOptions" />
          </div>
        </div>
      </div>
      <div class="promo-filter-meta text-xs text-[rgb(var(--palette-gray-400))]">
        Активных фильтров: <span class="text-mainText">{{ activeFiltersCount }}</span>
      </div>
    </div>

    <Transition name="fade-slide">
      <p v-if="errorMessage" class="state-banner state-banner--error rounded-lg border border-[rgb(var(--palette-red-500)/0.35)] bg-[rgb(var(--palette-red-500)/0.1)] px-3 py-2 text-sm text-[rgb(var(--palette-red-300))]">{{ errorMessage }}</p>
    </Transition>
    <Transition name="fade-slide">
      <p v-if="!errorMessage && successMessage" class="state-banner state-banner--success rounded-lg border border-[rgb(var(--palette-emerald-500)/0.35)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-3 py-2 text-sm text-[rgb(var(--palette-emerald-300))]">{{ successMessage }}</p>
    </Transition>

    <div class="space-y-3">
      <div v-if="isLoading" class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-[rgb(var(--palette-blue-500))]" />
      </div>
      <article v-for="promo in promos" :key="promo.id" class="admin-surface-card rounded-[1.4rem] p-3 sm:p-4">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-mainText">{{ promo.code }}</div>
          <button class="admin-btn admin-btn-outline admin-btn-sm" @click="togglePromo(promo)">
            {{ promo.is_active ? 'Деактивировать' : 'Активировать' }}
          </button>
        </div>
        <div class="mt-2 text-sm text-[rgb(var(--palette-gray-300))] grid grid-cols-1 sm:grid-cols-2 gap-1">
          <p>Тип: {{ formatDiscountType(promo.discount_type) }}</p>
          <p>Скидка: {{ formatDiscountValue(promo.discount_value, promo.discount_type) }}</p>
          <p>Сценарий: {{ formatScenario(promo.applies_to) }}</p>
          <p>На 1 пользователя: {{ promo.per_user_usage_limit }}</p>
          <p>Мин. сумма: {{ formatMoney(promo.min_order_amount) }}</p>
          <p>Всего использований: {{ promo.total_usage_limit ?? 'Без лимита' }}</p>
          <p>Действует до: {{ formatPromoLifetime(promo.ends_at) }}</p>
        </div>
      </article>
      <p class="text-xs text-[rgb(var(--palette-gray-500))]">Всего: {{ total }} | Страниц: {{ totalPages }}</p>
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

.promo-create-panel {
  background-image: none;
}

.promo-section {
  position: relative;
}

.promo-section::after {
  content: none;
}

.promo-section--invalid {
  animation: subtleShake 320ms ease;
  border-color: rgb(var(--palette-red-400) / 0.75);
  box-shadow: 0 0 0 1px rgb(var(--palette-red-400) / 0.22);
}

.promo-section__head {
  display: flex;
  align-items: center;
  min-height: 18px;
}

.promo-section__title {
  font-size: 14px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgb(var(--palette-slate-100));
}

.field__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  letter-spacing: 0.01em;
}

.field__required {
  color: rgb(var(--palette-red-300));
  font-weight: 700;
}

.field__hint {
  line-height: 1.35;
  color: rgb(var(--palette-slate-400) / 0.78);
}

.field__error {
  color: rgb(var(--palette-red-300));
  font-size: 12px;
  animation: fadeSlideIn 180ms ease-out;
}

.form-control {
  height: 42px;
  line-height: 1.2;
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.form-control:hover {
  border-color: rgb(var(--palette-slate-500) / 0.85);
}

.form-control:focus-visible {
  outline: none;
  border-color: rgb(var(--palette-white) / 0.14);
  box-shadow: 0 0 0 1px rgb(var(--palette-white) / 0.04);
  background-color: rgb(var(--palette-white) / 0.04);
}

.form-control--error {
  border-color: rgb(var(--palette-red-400) / 0.78);
  box-shadow: 0 0 0 1px rgb(var(--palette-red-400) / 0.2);
}

.preview-card {
  position: relative;
  padding-left: 44px;
  border-color: rgb(var(--palette-blue-500) / 0.2);
  background-image: none;
}

.preview-card::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 14px;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: rgb(var(--palette-blue-400) / 0.3);
  box-shadow: inset 0 0 0 1px rgb(var(--palette-blue-300) / 0.7);
}

.preview-card__label {
  margin-bottom: 6px;
}

.action-card {
  background-image: none;
}

.action-card__button {
  min-height: 38px;
  font-weight: 600;
}

.promo-list-panel {
  background-image: none;
}

.promo-list-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.promo-list-panel__reset {
  height: 30px;
  border-radius: 9px;
  border: 1px solid rgb(var(--palette-white) / 0.08);
  background: rgb(var(--palette-white) / 0.03);
  color: rgb(var(--palette-slate-300) / 0.92);
  padding: 0 10px;
  transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease, opacity 140ms ease;
}

.promo-list-panel__reset:hover:not(:disabled) {
  border-color: rgb(var(--palette-white) / 0.12);
  color: rgb(var(--palette-slate-100));
  background: rgb(var(--palette-white) / 0.05);
}

.promo-list-panel__reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.promo-filter-meta {
  letter-spacing: 0.01em;
}

.state-banner {
  animation: fadeSlideIn 220ms ease-out;
}

.state-banner--error {
  box-shadow: none;
}

.state-banner--success {
  box-shadow: none;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes subtleShake {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
  100% {
    transform: translateX(0);
  }
}

.segmented-toggle {
  position: relative;
  width: min(100%, 210px);
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--segmented-toggle-border);
  background: var(--segmented-toggle-bg);
  overflow: hidden;
}

.segmented-toggle__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  border-radius: 10px;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease, background-color 240ms ease;
}

.segmented-toggle__thumb--right {
  transform: translateX(100%);
}

.segmented-toggle__button {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  color: var(--segmented-toggle-label);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 10px;
  transition: color 180ms ease;
}

.segmented-toggle__button--active {
  color: var(--segmented-toggle-label-active);
}

.segmented-toggle-blue .segmented-toggle__thumb {
  background: var(--segmented-toggle-blue-bg);
  box-shadow: var(--segmented-toggle-blue-shadow);
}

.segmented-toggle-emerald .segmented-toggle__thumb {
  background: var(--segmented-toggle-emerald-bg);
  box-shadow: var(--segmented-toggle-emerald-shadow);
}

@media (min-width: 1280px) {
  .promo-create-panel {
    padding: 24px;
  }

  .promo-section {
    padding: 20px;
  }

  .promo-section__title {
    font-size: 15px;
  }

  .promo-list-panel {
    padding: 20px;
  }
}
</style>
