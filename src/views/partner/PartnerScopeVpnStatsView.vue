<script setup lang="ts">
import {
  adminService,
  type ScopeVpnPartnerMessageSettings,
  type ScopeVpnPricingItem,
  type ScopeVpnPartnerStats,
} from '@/api/admin/AdminService'
import Loader from '@/components/Loader.vue'
import { computed, onMounted, ref } from 'vue'
import { formatCurrencyAmount } from '@/utils/currency'

const isLoading = ref(true)
const isError = ref(false)
const stats = ref<ScopeVpnPartnerStats | null>(null)
const isSettingsLoading = ref(true)
const isSettingsSaving = ref(false)
const settingsError = ref('')
const settingsSuccess = ref('')
const isPricingLoading = ref(true)
const isPricingSaving = ref(false)
const pricingError = ref('')
const pricingSuccess = ref('')
const messageSettings = ref<ScopeVpnPartnerMessageSettings>({
  partner_message_ru: '',
  partner_message_en: '',
})
const persistedMessageSettings = ref<ScopeVpnPartnerMessageSettings>({
  partner_message_ru: '',
  partner_message_en: '',
})

type VpnPeriodMonths = 1 | 3 | 6 | 12

const vpnPeriods: Array<{ months: VpnPeriodMonths; label: string; hint: string }> = [
  { months: 1, label: '1 месяц', hint: 'Короткий доступ' },
  { months: 3, label: '3 месяца', hint: 'Средний срок' },
  { months: 6, label: '6 месяцев', hint: 'Долгий срок' },
  { months: 12, label: '12 месяцев', hint: 'Годовой доступ' },
]
const vpnDeviceCounts = Array.from({ length: 10 }, (_, index) => index + 1)
const defaultPricingMatrix: Record<VpnPeriodMonths, Record<number, number>> = {
  1: { 1: 199, 2: 249, 3: 299, 4: 349, 5: 399, 6: 449, 7: 499, 8: 549, 9: 599, 10: 649 },
  3: { 1: 449, 2: 629, 3: 759, 4: 889, 5: 1019, 6: 1149, 7: 1279, 8: 1409, 9: 1539, 10: 1699 },
  6: { 1: 849, 2: 1069, 3: 1284, 4: 1509, 5: 1729, 6: 1994, 7: 2169, 8: 2389, 9: 2609, 10: 2829 },
  12: { 1: 1549, 2: 1949, 3: 2349, 4: 2749, 5: 3149, 6: 3549, 7: 3949, 8: 4349, 9: 4749, 10: 5149 },
}

const selectedPricingPeriod = ref<VpnPeriodMonths>(1)
const pricingMatrix = ref(clonePricingMatrix(defaultPricingMatrix))
const persistedPricingMatrix = ref(clonePricingMatrix(defaultPricingMatrix))

const formatNumber = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(value || 0))

const formatCurrency = (value: number) =>
  formatCurrencyAmount(value || 0)

const planLabels: Record<string, string> = {
  trial: 'Пробный период',
  month: '1 месяц',
  quarter: '3 месяца',
  halfyear: '6 месяцев',
  year: '12 месяцев',
}

const statusLabels: Record<string, string> = {
  completed: 'Завершено',
  failed: 'Ошибка',
  pending: 'В ожидании',
}

const metricCards = computed(() => {
  if (!stats.value) return []
  return [
    { key: 'orders', label: 'Всего выдач', value: formatNumber(stats.value.total_orders) },
    { key: 'trials', label: 'Пробные периоды', value: formatNumber(stats.value.trial_count) },
    { key: 'purchases', label: 'Покупки', value: formatNumber(stats.value.purchase_count) },
    { key: 'revenue', label: 'Сумма покупок', value: formatCurrency(stats.value.total_purchase_amount) },
    { key: 'avg', label: 'Средний чек', value: formatCurrency(stats.value.average_purchase_amount) },
  ]
})

const planRows = computed(() =>
  (stats.value?.orders_by_plan ?? []).map((row) => ({
    ...row,
    label: planLabels[row.plan] ?? row.plan,
  })),
)

const statusRows = computed(() =>
  (stats.value?.orders_by_status ?? []).map((row) => ({
    ...row,
    label: statusLabels[row.status] ?? row.status,
  })),
)

const messageSettingsDirty = computed(() =>
  messageSettings.value.partner_message_ru !== persistedMessageSettings.value.partner_message_ru
  || messageSettings.value.partner_message_en !== persistedMessageSettings.value.partner_message_en,
)

const pricingDirty = computed(() =>
  JSON.stringify(pricingMatrix.value) !== JSON.stringify(persistedPricingMatrix.value),
)

const pricingValid = computed(() =>
  vpnPeriods.every(({ months }) =>
    vpnDeviceCounts.every((devices) => {
      const price = Number(pricingMatrix.value[months][devices])
      return Number.isFinite(price) && price >= 0 && price <= 1_000_000
    }),
  ),
)

const pricingRows = computed(() =>
  vpnDeviceCounts.map((devices) => ({
    devices,
    price: Number(pricingMatrix.value[selectedPricingPeriod.value][devices]) || 0,
  })),
)

function clonePricingMatrix(
  source: Record<VpnPeriodMonths, Record<number, number>>,
): Record<VpnPeriodMonths, Record<number, number>> {
  return {
    1: { ...source[1] },
    3: { ...source[3] },
    6: { ...source[6] },
    12: { ...source[12] },
  }
}

function isVpnPeriodMonths(value: number): value is VpnPeriodMonths {
  return vpnPeriods.some((period) => period.months === value)
}

function applyPricingItems(items: ScopeVpnPricingItem[]) {
  const next = clonePricingMatrix(defaultPricingMatrix)
  for (const item of items) {
    const months = Number(item.months)
    const devices = Number(item.devices)
    if (isVpnPeriodMonths(months) && devices >= 1 && devices <= 10) {
      next[months][devices] = Number(item.price) || 0
    }
  }
  pricingMatrix.value = clonePricingMatrix(next)
  persistedPricingMatrix.value = clonePricingMatrix(next)
}

function buildPricingPayload(): ScopeVpnPricingItem[] {
  return vpnPeriods.flatMap(({ months }) =>
    vpnDeviceCounts.map((devices) => ({
      months,
      devices,
      price: Number(pricingMatrix.value[months][devices]) || 0,
    })),
  )
}

async function loadStats() {
  isLoading.value = true
  isError.value = false
  const data = await adminService.getScopeVpnPartnerStats()
  if (!data) {
    isError.value = true
    stats.value = null
  } else {
    stats.value = data
  }
  isLoading.value = false
}

async function loadPricing() {
  isPricingLoading.value = true
  pricingError.value = ''
  pricingSuccess.value = ''

  const data = await adminService.getScopeVpnPartnerPricing()
  if (!data) {
    pricingError.value = 'Не удалось загрузить тарифную сетку.'
  } else {
    applyPricingItems(data.prices)
  }

  isPricingLoading.value = false
}

async function savePricing() {
  if (!pricingDirty.value || !pricingValid.value || isPricingSaving.value) return

  isPricingSaving.value = true
  pricingError.value = ''
  pricingSuccess.value = ''

  const updated = await adminService.updateScopeVpnPartnerPricing({
    prices: buildPricingPayload(),
  })
  if (!updated) {
    pricingError.value = 'Не удалось сохранить тарифную сетку.'
  } else {
    applyPricingItems(updated.prices)
    pricingSuccess.value = 'Тарифная сетка сохранена.'
  }

  isPricingSaving.value = false
}

async function loadMessageSettings() {
  isSettingsLoading.value = true
  settingsError.value = ''
  settingsSuccess.value = ''

  const data = await adminService.getScopeVpnPartnerMessageSettings()
  if (!data) {
    settingsError.value = 'Не удалось загрузить шаблоны сообщений.'
  } else {
    messageSettings.value = { ...data }
    persistedMessageSettings.value = { ...data }
  }

  isSettingsLoading.value = false
}

async function saveMessageSettings() {
  if (!messageSettingsDirty.value || isSettingsSaving.value) return

  isSettingsSaving.value = true
  settingsError.value = ''
  settingsSuccess.value = ''

  const updated = await adminService.updateScopeVpnPartnerMessageSettings(messageSettings.value)
  if (!updated) {
    settingsError.value = 'Не удалось сохранить шаблоны сообщений.'
  } else {
    messageSettings.value = { ...updated }
    persistedMessageSettings.value = { ...updated }
    settingsSuccess.value = 'Шаблоны сохранены.'
  }

  isSettingsSaving.value = false
}

onMounted(() => {
  void loadStats()
  void loadPricing()
  void loadMessageSettings()
})
</script>

<template>
  <section class="w-full min-h-[calc(100vh-120px)] pb-10 pt-6">
    <div class="max-w-6xl mx-auto px-2 lg:px-0 flex flex-col gap-4">
      <div class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-[rgb(var(--palette-gray-400))]">Partner Dashboard</p>
        <h1 class="mt-1 text-2xl font-semibold text-[rgb(var(--palette-white))]">Scope VPN x Market</h1>
        <p class="mt-2 text-sm text-[rgb(var(--palette-gray-400))]">
          Продажи, пробные периоды и выручка по интеграции Scope VPN.
        </p>
      </div>

      <div v-if="isLoading" class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-10 flex justify-center">
        <Loader />
      </div>

      <div
        v-else-if="isError"
        class="rounded-2xl border border-[rgb(var(--palette-red-500)/0.4)] bg-[rgb(var(--palette-red-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-red-200))]"
      >
        Не удалось загрузить статистику. Попробуйте обновить страницу.
      </div>

      <template v-else>
        <div class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-5">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <h2 class="text-lg font-semibold text-[rgb(var(--palette-white))]">Тарифная сетка Scope VPN</h2>
              <p class="mt-2 text-sm leading-6 text-[rgb(var(--palette-gray-400))]">
                Цены настраиваются отдельно для каждого срока и количества устройств. Покупатель увидит итоговую цену сразу в конфигураторе.
              </p>
            </div>

            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-[rgb(var(--palette-blue-500)/0.3)] bg-[rgb(var(--palette-blue-600))] px-5 text-sm font-semibold text-[rgb(var(--palette-white))] transition hover:bg-[rgb(var(--palette-blue-500))] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isPricingLoading || isPricingSaving || !pricingDirty || !pricingValid"
              @click="savePricing"
            >
              {{ isPricingSaving ? 'Сохраняем...' : 'Сохранить цены' }}
            </button>
          </div>

          <div v-if="isPricingLoading" class="mt-5 flex justify-center rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.4)] p-8">
            <Loader />
          </div>

          <div v-else class="mt-5">
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                v-for="period in vpnPeriods"
                :key="period.months"
                type="button"
                class="rounded-2xl border px-4 py-3 text-left transition"
                :class="selectedPricingPeriod === period.months
                  ? 'border-[rgb(var(--palette-blue-400)/0.5)] bg-[rgb(var(--palette-blue-500)/0.15)]'
                  : 'border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.4)] hover:border-[rgb(var(--palette-dark-500))]'"
                @click="selectedPricingPeriod = period.months"
              >
                <p class="text-sm font-semibold text-[rgb(var(--palette-white))]">{{ period.label }}</p>
                <p class="mt-1 text-xs text-[rgb(var(--palette-gray-400))]">{{ period.hint }}</p>
              </button>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label
                v-for="row in pricingRows"
                :key="`${selectedPricingPeriod}-${row.devices}`"
                class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.4)] p-3"
              >
                <span class="text-xs uppercase tracking-[0.16em] text-[rgb(var(--palette-gray-500))]">
                  {{ row.devices }} устр.
                </span>
                <div class="mt-2 flex items-center rounded-xl border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-800)/0.7)] px-3 focus-within:border-[rgb(var(--palette-blue-400)/0.6)]">
                  <input
                    v-model.number="pricingMatrix[selectedPricingPeriod][row.devices]"
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    class="h-11 min-w-0 flex-1 bg-[var(--transparent)] text-sm font-semibold text-[rgb(var(--palette-white))] outline-none placeholder:text-[rgb(var(--palette-gray-600))]"
                  />
                  <span class="text-sm font-semibold text-[rgb(var(--palette-gray-500))]">₽</span>
                </div>
              </label>
            </div>
          </div>

          <p v-if="pricingError" class="mt-4 rounded-xl border border-[rgb(var(--palette-red-500)/0.3)] bg-[rgb(var(--palette-red-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-red-200))]">
            {{ pricingError }}
          </p>
          <p v-else-if="pricingSuccess" class="mt-4 rounded-xl border border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-emerald-200))]">
            {{ pricingSuccess }}
          </p>
          <p v-else-if="!pricingValid" class="mt-4 rounded-xl border border-[rgb(var(--palette-amber-500)/0.3)] bg-[rgb(var(--palette-amber-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-amber-100))]">
            Проверьте цены: допустимы значения от 0 до 1 000 000 ₽.
          </p>
        </div>

        <div class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-5">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <h2 class="text-lg font-semibold text-[rgb(var(--palette-white))]">Сообщение при покупке VPN</h2>
              <p class="mt-2 text-sm leading-6 text-[rgb(var(--palette-gray-400))]">
                Этот текст будет уходить покупателю в чат сделки вместе со ссылкой на подключение.
                Русская версия показывается для `ru`, английская для `en`.
              </p>
            </div>

            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-[rgb(var(--palette-blue-500)/0.3)] bg-[rgb(var(--palette-blue-600))] px-5 text-sm font-semibold text-[rgb(var(--palette-white))] transition hover:bg-[rgb(var(--palette-blue-500))] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isSettingsLoading || isSettingsSaving || !messageSettingsDirty"
              @click="saveMessageSettings"
            >
              {{ isSettingsSaving ? 'Сохраняем...' : 'Сохранить шаблоны' }}
            </button>
          </div>

          <div v-if="isSettingsLoading" class="mt-5 flex justify-center rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.4)] p-8">
            <Loader />
          </div>

          <div v-else class="mt-5 grid gap-4 lg:grid-cols-2">
            <label class="flex flex-col gap-2">
              <span class="text-sm font-medium text-[rgb(var(--palette-white))]">Русская версия</span>
              <textarea
                v-model="messageSettings.partner_message_ru"
                class="min-h-[180px] rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm leading-6 text-[rgb(var(--palette-gray-100))] outline-none transition placeholder:text-[rgb(var(--palette-gray-500))] focus:border-[rgb(var(--palette-dark-500))]"
                placeholder="Например: Если появятся вопросы по подключению или скорости, напишите в этот чат."
                maxlength="4000"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-sm font-medium text-[rgb(var(--palette-white))]">English version</span>
              <textarea
                v-model="messageSettings.partner_message_en"
                class="min-h-[180px] rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-700)/0.5)] px-4 py-3 text-sm leading-6 text-[rgb(var(--palette-gray-100))] outline-none transition placeholder:text-[rgb(var(--palette-gray-500))] focus:border-[rgb(var(--palette-dark-500))]"
                placeholder="For example: If you need help with setup or connection quality, reply in this chat."
                maxlength="4000"
              />
            </label>
          </div>

          <p v-if="settingsError" class="mt-4 rounded-xl border border-[rgb(var(--palette-red-500)/0.3)] bg-[rgb(var(--palette-red-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-red-200))]">
            {{ settingsError }}
          </p>
          <p v-else-if="settingsSuccess" class="mt-4 rounded-xl border border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-4 py-3 text-sm text-[rgb(var(--palette-emerald-200))]">
            {{ settingsSuccess }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div
            v-for="card in metricCards"
            :key="card.key"
            class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-4 transition-colors hover:border-[rgb(var(--palette-dark-500))]"
          >
            <p class="text-xs text-[rgb(var(--palette-gray-400))]">{{ card.label }}</p>
            <p class="mt-2 text-xl font-semibold text-[rgb(var(--palette-white))]">{{ card.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-4">
            <h2 class="mb-3 text-lg font-semibold text-[rgb(var(--palette-white))]">Выдачи по периодам</h2>
            <div v-if="planRows.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[rgb(var(--palette-dark-600))] text-left text-[rgb(var(--palette-gray-400))]">
                    <th class="py-2 pr-3 font-medium">Период</th>
                    <th class="py-2 pr-3 font-medium">Количество</th>
                    <th class="py-2 font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in planRows" :key="row.plan" class="border-b border-[rgb(var(--palette-dark-700))] last:border-b-0">
                    <td class="py-2 pr-3 text-[rgb(var(--palette-gray-200))]">{{ row.label }}</td>
                    <td class="py-2 pr-3 font-medium text-[rgb(var(--palette-white))]">{{ formatNumber(row.count) }}</td>
                    <td class="py-2 font-medium text-[rgb(var(--palette-white))]">{{ formatCurrency(row.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-[rgb(var(--palette-gray-400))]">Пока нет выдач.</p>
          </div>

          <div class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] p-4">
            <h2 class="mb-3 text-lg font-semibold text-[rgb(var(--palette-white))]">Статусы</h2>
            <div v-if="statusRows.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[rgb(var(--palette-dark-600))] text-left text-[rgb(var(--palette-gray-400))]">
                    <th class="py-2 pr-3 font-medium">Статус</th>
                    <th class="py-2 font-medium">Количество</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in statusRows" :key="row.status" class="border-b border-[rgb(var(--palette-dark-700))] last:border-b-0">
                    <td class="py-2 pr-3 text-[rgb(var(--palette-gray-200))]">{{ row.label }}</td>
                    <td class="py-2 font-medium text-[rgb(var(--palette-white))]">{{ formatNumber(row.count) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-[rgb(var(--palette-gray-400))]">Пока нет статусов.</p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
