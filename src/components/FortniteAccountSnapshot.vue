<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalizedCountryName } from '@/utils/countryOptions'
import type { FortniteAccountDetails } from '@/validation/product/product'
import {
  FORTNITE_ACCOUNT_BOOLEAN_FIELDS,
  FORTNITE_ACCOUNT_COUNT_FIELDS,
  FORTNITE_ACCOUNT_DATE_FIELDS,
  FORTNITE_ACCOUNT_TEXT_FIELDS,
  buildFortniteCompactSummary,
  formatFortniteDate,
  hasFortniteAccountDetails,
} from '@/utils/fortniteAccount'

type SnapshotEntry = {
  key: string
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  details: FortniteAccountDetails | null | undefined
  variant?: 'compact' | 'full'
}>(), {
  variant: 'compact',
})

const { t, locale } = useI18n()

const compactSummary = computed(() => (
  buildFortniteCompactSummary(props.details, t, locale.value).slice(0, 6)
))

const profileEntries = computed<SnapshotEntry[]>(() => {
  if (!props.details) return []

  const entries: SnapshotEntry[] = []

  for (const field of FORTNITE_ACCOUNT_TEXT_FIELDS) {
    const value = props.details[field.key]
    if (!value) continue

    entries.push({
      key: field.key,
      label: t(field.labelKey),
      value,
    })
  }

  if (props.details.country) {
    entries.push({
      key: 'country',
      label: t('common.fortniteAccount.fields.country'),
      value: getLocalizedCountryName(props.details.country, locale.value),
    })
  }

  return entries
})

const booleanEntries = computed<SnapshotEntry[]>(() => {
  if (!props.details) return []

  const entries: SnapshotEntry[] = []

  for (const field of FORTNITE_ACCOUNT_BOOLEAN_FIELDS) {
    const value = props.details[field.key]
    if (value === null || value === undefined) continue

    entries.push({
      key: field.key,
      label: t(field.labelKey),
      value: value
        ? t('common.fortniteAccount.booleanValues.true')
        : t('common.fortniteAccount.booleanValues.false'),
    })
  }

  return entries
})

const dateEntries = computed<SnapshotEntry[]>(() => {
  if (!props.details) return []

  const entries: SnapshotEntry[] = []

  for (const field of FORTNITE_ACCOUNT_DATE_FIELDS) {
    const value = props.details[field.key]
    if (!value) continue

    entries.push({
      key: field.key,
      label: t(field.labelKey),
      value: formatFortniteDate(value, locale.value),
    })
  }

  return entries
})

const countEntries = computed<SnapshotEntry[]>(() => {
  if (!props.details) return []

  const entries: SnapshotEntry[] = []

  for (const field of FORTNITE_ACCOUNT_COUNT_FIELDS) {
    const value = props.details[field.key]
    if (typeof value !== 'number') continue

    entries.push({
      key: field.key,
      label: t(field.labelKey),
      value: String(value),
    })
  }

  return entries
})

const hasDetails = computed(() => hasFortniteAccountDetails(props.details))
const detailEntries = computed<SnapshotEntry[]>(() => (
  [...profileEntries.value, ...booleanEntries.value, ...dateEntries.value]
))
</script>

<template>
  <div v-if="hasDetails">
    <div
      v-if="variant === 'compact'"
      class="flex max-h-14 flex-wrap content-start gap-1.5 overflow-hidden"
    >
      <span
        v-for="item in compactSummary"
        :key="item"
        class="inline-flex rounded-full border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.6)] px-2 py-1 text-[10px] font-medium leading-none text-[rgb(var(--palette-gray-200))]"
      >
        {{ item }}
      </span>
    </div>

    <div v-else class="space-y-5">
      <div v-if="detailEntries.length" class="grid gap-3 md:grid-cols-2">
        <div
          v-for="entry in detailEntries"
          :key="entry.key"
          class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.3)] px-4 py-3"
        >
          <p class="text-xs uppercase tracking-wide text-[rgb(var(--palette-gray-500))]">
            {{ entry.label }}
          </p>
          <p class="mt-1 text-sm font-medium text-[rgb(var(--palette-white))] break-words">
            {{ entry.value }}
          </p>
        </div>
      </div>

      <div v-if="countEntries.length" class="space-y-2">
        <p class="text-sm font-semibold text-[rgb(var(--palette-white))]">
          {{ $t('common.fortniteAccount.sections.inventory') }}
        </p>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="entry in countEntries"
            :key="entry.key"
            class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.3)] px-4 py-3"
          >
            <p class="text-xs uppercase tracking-wide text-[rgb(var(--palette-gray-500))]">
              {{ entry.label }}
            </p>
            <p class="mt-1 text-base font-semibold text-[rgb(var(--palette-white))]">
              {{ entry.value }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
