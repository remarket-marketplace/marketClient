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
  FORTNITE_ACCOUNT_MANUAL_CREATE_BOOLEAN_FIELDS,
  FORTNITE_ACCOUNT_MANUAL_CREATE_COUNT_FIELDS,
  FORTNITE_ACCOUNT_TEXT_FIELDS,
  type FortniteAccountBooleanFieldKey,
  type FortniteAccountCountFieldKey,
  type FortniteAccountDateFieldKey,
  type FortniteAccountFormState,
  type FortniteAccountTextFieldKey,
  type FortniteBooleanSelectValue,
} from '@/utils/fortniteAccount'

type FortniteAccountFieldsMode = 'all' | 'manual-create'

const props = withDefaults(defineProps<{
  modelValue: FortniteAccountFormState
  mode?: FortniteAccountFieldsMode
  disabled?: boolean
}>(), {
  mode: 'all',
  disabled: false,
})

const { locale } = useI18n()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FortniteAccountFormState): void
}>()

const isManualCreateMode = computed(() => props.mode === 'manual-create')
const textFields = computed(() => (
  isManualCreateMode.value ? [] : FORTNITE_ACCOUNT_TEXT_FIELDS
))
const booleanFields = computed(() => (
  isManualCreateMode.value
    ? FORTNITE_ACCOUNT_MANUAL_CREATE_BOOLEAN_FIELDS
    : FORTNITE_ACCOUNT_BOOLEAN_FIELDS
))
const dateFields = computed(() => (
  isManualCreateMode.value ? [] : FORTNITE_ACCOUNT_DATE_FIELDS
))
const countFields = computed(() => (
  isManualCreateMode.value
    ? FORTNITE_ACCOUNT_MANUAL_CREATE_COUNT_FIELDS
    : FORTNITE_ACCOUNT_COUNT_FIELDS
))
const countryOptions = computed(() => getCountryOptions(locale.value))
const normalizedCountryValue = computed(() => normalizeCountryCode(props.modelValue.country))
const hasLegacyCountryCode = computed(() => (
  Boolean(normalizedCountryValue.value) && !isKnownCountryCode(normalizedCountryValue.value)
))
const fieldClass = computed(() => [
  'w-full rounded-lg border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600))] px-4 py-3 text-sm text-[var(--text-title)] outline-none',
  props.disabled ? 'cursor-not-allowed opacity-70' : 'placeholder-[var(--text-placeholder)]',
])

function updateField<K extends keyof FortniteAccountFormState>(
  key: K,
  value: FortniteAccountFormState[K],
) {
  if (props.disabled) {
    return
  }
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
    <div v-if="textFields.length" class="space-y-3">
      <h4 class="text-sm font-semibold text-[var(--text-title)]">
        {{ $t('common.fortniteAccount.sections.profile') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label
          v-for="field in textFields"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-[var(--text-body)]">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="text"
            maxlength="64"
            :disabled="props.disabled"
            :class="fieldClass"
            @input="updateTextField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="space-y-2">
          <span class="text-sm font-medium text-[var(--text-body)]">
            {{ $t('common.fortniteAccount.fields.country') }}
          </span>
          <select
            :value="normalizedCountryValue"
            :disabled="props.disabled"
            :class="fieldClass"
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
            class="text-xs text-[var(--text-meta)]"
          >
            {{ formatCountryOptionLabel(normalizedCountryValue, locale) }}
          </p>
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-[var(--text-title)]">
        {{ $t('common.fortniteAccount.sections.security') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in booleanFields"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-[var(--text-body)]">
            {{ $t(field.labelKey) }}
          </span>
          <select
            :value="props.modelValue[field.key]"
            :disabled="props.disabled"
            :class="fieldClass"
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

    <div v-if="dateFields.length" class="space-y-3">
      <h4 class="text-sm font-semibold text-[var(--text-title)]">
        {{ $t('common.fortniteAccount.sections.activity') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in dateFields"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-[var(--text-body)]">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="date"
            :disabled="props.disabled"
            :class="fieldClass"
            @input="updateDateField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-[var(--text-title)]">
        {{ $t('common.fortniteAccount.sections.inventory') }}
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label
          v-for="field in countFields"
          :key="field.key"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-[var(--text-body)]">
            {{ $t(field.labelKey) }}
          </span>
          <input
            :value="props.modelValue[field.key]"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            :disabled="props.disabled"
            :class="fieldClass"
            @input="updateCountField(field.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>
  </div>
</template>
