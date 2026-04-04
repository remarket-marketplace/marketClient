<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatCountryOptionLabel,
  getCountryOptions,
  isKnownCountryCode,
  normalizeCountryCode,
} from '@/utils/countryOptions'
import {
  FORTNITE_ACCOUNT_BOOLEAN_FIELDS,
  FORTNITE_ACCOUNT_COUNT_FIELDS,
  FORTNITE_ACCOUNT_DATE_FIELDS,
  FORTNITE_ACCOUNT_TEXT_FIELDS,
  type FortniteAccountBooleanFieldKey,
  type FortniteAccountCountFieldKey,
  type FortniteAccountDateFieldKey,
  type FortniteAccountFormState,
  type FortniteAccountTextFieldKey,
  type FortniteBooleanSelectValue,
} from '@/utils/fortniteAccount'

const props = defineProps<{
  modelValue: FortniteAccountFormState
}>()

const { locale } = useI18n()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FortniteAccountFormState): void
}>()

const textFields = computed(() => FORTNITE_ACCOUNT_TEXT_FIELDS)
const countryOptions = computed(() => getCountryOptions(locale.value))
const normalizedCountryValue = computed(() => normalizeCountryCode(props.modelValue.country))
const hasLegacyCountryCode = computed(() => (
  Boolean(normalizedCountryValue.value) && !isKnownCountryCode(normalizedCountryValue.value)
))

function updateField<K extends keyof FortniteAccountFormState>(
  key: K,
  value: FortniteAccountFormState[K],
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

function updateTextField(key: FortniteAccountTextFieldKey, value: string) {
  updateField(key, value as FortniteAccountFormState[typeof key])
}

function updateCountryField(value: string) {
  updateField('country', normalizeCountryCode(value) as FortniteAccountFormState['country'])
}

function updateBooleanField(key: FortniteAccountBooleanFieldKey, value: string) {
  updateField(key, value as FortniteBooleanSelectValue as FortniteAccountFormState[typeof key])
}

function updateDateField(key: FortniteAccountDateFieldKey, value: string) {
  updateField(key, value as FortniteAccountFormState[typeof key])
}

function updateCountField(key: FortniteAccountCountFieldKey, value: string) {
  if (value.trim() === '') {
    updateField(key, '' as FortniteAccountFormState[typeof key])
    return
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    return
  }

  updateField(
    key,
    Math.max(0, Math.trunc(parsedValue)) as FortniteAccountFormState[typeof key],
  )
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-white">
        {{ $t('common.fortniteAccount.sections.profile') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label
          v-for="field in textFields"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-gray-300">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="text"
            maxlength="64"
            class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none placeholder-gray-500"
            @input="updateTextField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="space-y-2">
          <span class="text-sm font-medium text-gray-300">
            {{ $t('common.fortniteAccount.fields.country') }}
          </span>
          <select
            :value="normalizedCountryValue"
            class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none"
            @change="updateCountryField(($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              {{ $t('common.notSpecified') }}
            </option>
            <option
              v-if="hasLegacyCountryCode"
              :value="normalizedCountryValue"
            >
              {{ normalizedCountryValue }}
            </option>
            <option
              v-for="option in countryOptions"
              :key="option.code"
              :value="option.code"
            >
              {{ option.label }}
            </option>
          </select>
          <p
            v-if="hasLegacyCountryCode"
            class="text-xs text-gray-500"
          >
            {{ formatCountryOptionLabel(normalizedCountryValue, locale) }}
          </p>
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-white">
        {{ $t('common.fortniteAccount.sections.security') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in FORTNITE_ACCOUNT_BOOLEAN_FIELDS"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-gray-300">
            {{ $t(field.labelKey) }}
          </span>
          <select
            :value="props.modelValue[field.key]"
            class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none"
            @change="updateBooleanField(field.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              {{ $t('common.notSpecified') }}
            </option>
            <option value="true">
              {{ $t('common.fortniteAccount.booleanValues.true') }}
            </option>
            <option value="false">
              {{ $t('common.fortniteAccount.booleanValues.false') }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-white">
        {{ $t('common.fortniteAccount.sections.activity') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in FORTNITE_ACCOUNT_DATE_FIELDS"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-gray-300">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="date"
            class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none"
            @input="updateDateField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-white">
        {{ $t('common.fortniteAccount.sections.inventory') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in FORTNITE_ACCOUNT_COUNT_FIELDS"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-gray-300">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            class="w-full rounded-lg border border-dark-700 bg-dark-600 px-4 py-3 text-sm text-white outline-none"
            @input="updateCountField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>
  </div>
</template>
