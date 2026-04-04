import type { Category } from '@/validation/category/category'
import type { FortniteAccountDetails } from '@/validation/product/product'
import { getLocalizedCountryName } from '@/utils/countryOptions'

export type FortniteBooleanSelectValue = '' | 'true' | 'false'

export type FortniteAccountTextFieldKey =
  | 'display_name'

export type FortniteAccountBooleanFieldKey =
  | 'can_change_email'
  | 'first_email'
  | 'email_confirmed'
  | 'parental_control'
  | 'two_factor_enabled'

export type FortniteAccountDateFieldKey =
  | 'last_email_change'
  | 'registration_date'
  | 'last_login'
  | 'last_display_name_change'
  | 'last_match_date'

export type FortniteAccountCountFieldKey =
  | 'skins_count'
  | 'backpacks_count'
  | 'pickaxes_count'
  | 'emotes_count'
  | 'gliders_count'
  | 'wraps_count'
  | 'banners_count'
  | 'sprays_count'
  | 'exclusives_count'

export interface FortniteAccountFormState {
  can_change_email: FortniteBooleanSelectValue
  last_email_change: string
  first_email: FortniteBooleanSelectValue
  registration_date: string
  email_confirmed: FortniteBooleanSelectValue
  parental_control: FortniteBooleanSelectValue
  display_name: string
  country: string
  two_factor_enabled: FortniteBooleanSelectValue
  last_login: string
  last_display_name_change: string
  last_match_date: string
  skins_count: number | ''
  backpacks_count: number | ''
  pickaxes_count: number | ''
  emotes_count: number | ''
  gliders_count: number | ''
  wraps_count: number | ''
  banners_count: number | ''
  sprays_count: number | ''
  exclusives_count: number | ''
}

export interface FortniteAccountFilterState {
  country: string
  can_change_email: FortniteBooleanSelectValue
  first_email: FortniteBooleanSelectValue
  email_confirmed: FortniteBooleanSelectValue
  parental_control: FortniteBooleanSelectValue
  two_factor_enabled: FortniteBooleanSelectValue
  registration_date_from: string
  registration_date_to: string
  last_email_change_from: string
  last_email_change_to: string
  last_login_from: string
  last_login_to: string
  last_display_name_change_from: string
  last_display_name_change_to: string
  last_match_date_from: string
  last_match_date_to: string
  skins_count_min: number | ''
  skins_count_max: number | ''
  backpacks_count_min: number | ''
  backpacks_count_max: number | ''
  pickaxes_count_min: number | ''
  pickaxes_count_max: number | ''
  emotes_count_min: number | ''
  emotes_count_max: number | ''
  gliders_count_min: number | ''
  gliders_count_max: number | ''
  wraps_count_min: number | ''
  wraps_count_max: number | ''
  banners_count_min: number | ''
  banners_count_max: number | ''
  sprays_count_min: number | ''
  sprays_count_max: number | ''
  exclusives_count_min: number | ''
  exclusives_count_max: number | ''
}

export interface FortniteFieldConfig<T extends string> {
  key: T
  labelKey: string
}

type TranslateFn = (key: string) => string

export const FORTNITE_ACCOUNT_TEXT_FIELDS: FortniteFieldConfig<FortniteAccountTextFieldKey>[] = [
  { key: 'display_name', labelKey: 'common.fortniteAccount.fields.display_name' },
]

export const FORTNITE_ACCOUNT_BOOLEAN_FIELDS: FortniteFieldConfig<FortniteAccountBooleanFieldKey>[] = [
  { key: 'can_change_email', labelKey: 'common.fortniteAccount.fields.can_change_email' },
  { key: 'first_email', labelKey: 'common.fortniteAccount.fields.first_email' },
  { key: 'email_confirmed', labelKey: 'common.fortniteAccount.fields.email_confirmed' },
  { key: 'parental_control', labelKey: 'common.fortniteAccount.fields.parental_control' },
  { key: 'two_factor_enabled', labelKey: 'common.fortniteAccount.fields.two_factor_enabled' },
]

export const FORTNITE_ACCOUNT_DATE_FIELDS: FortniteFieldConfig<FortniteAccountDateFieldKey>[] = [
  { key: 'registration_date', labelKey: 'common.fortniteAccount.fields.registration_date' },
  { key: 'last_email_change', labelKey: 'common.fortniteAccount.fields.last_email_change' },
  { key: 'last_login', labelKey: 'common.fortniteAccount.fields.last_login' },
  { key: 'last_display_name_change', labelKey: 'common.fortniteAccount.fields.last_display_name_change' },
  { key: 'last_match_date', labelKey: 'common.fortniteAccount.fields.last_match_date' },
]

export const FORTNITE_ACCOUNT_COUNT_FIELDS: FortniteFieldConfig<FortniteAccountCountFieldKey>[] = [
  { key: 'skins_count', labelKey: 'common.fortniteAccount.fields.skins_count' },
  { key: 'backpacks_count', labelKey: 'common.fortniteAccount.fields.backpacks_count' },
  { key: 'pickaxes_count', labelKey: 'common.fortniteAccount.fields.pickaxes_count' },
  { key: 'emotes_count', labelKey: 'common.fortniteAccount.fields.emotes_count' },
  { key: 'gliders_count', labelKey: 'common.fortniteAccount.fields.gliders_count' },
  { key: 'wraps_count', labelKey: 'common.fortniteAccount.fields.wraps_count' },
  { key: 'banners_count', labelKey: 'common.fortniteAccount.fields.banners_count' },
  { key: 'sprays_count', labelKey: 'common.fortniteAccount.fields.sprays_count' },
  { key: 'exclusives_count', labelKey: 'common.fortniteAccount.fields.exclusives_count' },
]

const COMPACT_COUNT_FIELD_KEYS: FortniteAccountCountFieldKey[] = [
  'skins_count',
  'pickaxes_count',
  'emotes_count',
  'exclusives_count',
]

function normalizeCategoryIdentity(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/g, '')
}

export function isFortniteRootCategory(category: Pick<Category, 'slug' | 'name'> | null | undefined): boolean {
  const normalizedSlug = normalizeCategoryIdentity(category?.slug)
  const normalizedName = normalizeCategoryIdentity(category?.name)
  return normalizedSlug === 'fortnite' || normalizedName === 'fortnite'
}

export function isAccountsSubcategory(category: Pick<Category, 'slug' | 'name'> | null | undefined): boolean {
  const normalizedSlug = normalizeCategoryIdentity(category?.slug)
  const normalizedName = normalizeCategoryIdentity(category?.name)
  return (
    normalizedSlug === 'account'
    || normalizedSlug === 'accounts'
    || normalizedName.includes('account')
    || normalizedName.includes('аккаун')
  )
}

export function isFortniteAccountsCategory(options: {
  parentCategory?: Pick<Category, 'slug' | 'name'> | null
  subcategory?: Pick<Category, 'slug' | 'name'> | null
}): boolean {
  return isFortniteRootCategory(options.parentCategory) && isAccountsSubcategory(options.subcategory)
}

export function createEmptyFortniteAccountForm(): FortniteAccountFormState {
  return {
    can_change_email: '',
    last_email_change: '',
    first_email: '',
    registration_date: '',
    email_confirmed: '',
    parental_control: '',
    display_name: '',
    country: '',
    two_factor_enabled: '',
    last_login: '',
    last_display_name_change: '',
    last_match_date: '',
    skins_count: '',
    backpacks_count: '',
    pickaxes_count: '',
    emotes_count: '',
    gliders_count: '',
    wraps_count: '',
    banners_count: '',
    sprays_count: '',
    exclusives_count: '',
  }
}

export function createEmptyFortniteAccountFilters(): FortniteAccountFilterState {
  return {
    country: '',
    can_change_email: '',
    first_email: '',
    email_confirmed: '',
    parental_control: '',
    two_factor_enabled: '',
    registration_date_from: '',
    registration_date_to: '',
    last_email_change_from: '',
    last_email_change_to: '',
    last_login_from: '',
    last_login_to: '',
    last_display_name_change_from: '',
    last_display_name_change_to: '',
    last_match_date_from: '',
    last_match_date_to: '',
    skins_count_min: '',
    skins_count_max: '',
    backpacks_count_min: '',
    backpacks_count_max: '',
    pickaxes_count_min: '',
    pickaxes_count_max: '',
    emotes_count_min: '',
    emotes_count_max: '',
    gliders_count_min: '',
    gliders_count_max: '',
    wraps_count_min: '',
    wraps_count_max: '',
    banners_count_min: '',
    banners_count_max: '',
    sprays_count_min: '',
    sprays_count_max: '',
    exclusives_count_min: '',
    exclusives_count_max: '',
  }
}

export function fortniteAccountDetailsToForm(
  details: FortniteAccountDetails | null | undefined,
): FortniteAccountFormState {
  const emptyState = createEmptyFortniteAccountForm()
  if (!details) {
    return emptyState
  }

  return {
    can_change_email: booleanToSelectValue(details.can_change_email),
    last_email_change: normalizeDateField(details.last_email_change),
    first_email: booleanToSelectValue(details.first_email),
    registration_date: normalizeDateField(details.registration_date),
    email_confirmed: booleanToSelectValue(details.email_confirmed),
    parental_control: booleanToSelectValue(details.parental_control),
    display_name: details.display_name ?? '',
    country: details.country ?? '',
    two_factor_enabled: booleanToSelectValue(details.two_factor_enabled),
    last_login: normalizeDateField(details.last_login),
    last_display_name_change: normalizeDateField(details.last_display_name_change),
    last_match_date: normalizeDateField(details.last_match_date),
    skins_count: normalizeCountField(details.skins_count),
    backpacks_count: normalizeCountField(details.backpacks_count),
    pickaxes_count: normalizeCountField(details.pickaxes_count),
    emotes_count: normalizeCountField(details.emotes_count),
    gliders_count: normalizeCountField(details.gliders_count),
    wraps_count: normalizeCountField(details.wraps_count),
    banners_count: normalizeCountField(details.banners_count),
    sprays_count: normalizeCountField(details.sprays_count),
    exclusives_count: normalizeCountField(details.exclusives_count),
  }
}

export function buildFortniteAccountPayload(
  form: FortniteAccountFormState,
): Partial<FortniteAccountDetails> | undefined {
  const payload: Partial<FortniteAccountDetails> = {
    can_change_email: selectValueToBoolean(form.can_change_email),
    last_email_change: normalizeOptionalString(form.last_email_change),
    first_email: selectValueToBoolean(form.first_email),
    registration_date: normalizeOptionalString(form.registration_date),
    email_confirmed: selectValueToBoolean(form.email_confirmed),
    parental_control: selectValueToBoolean(form.parental_control),
    display_name: normalizeOptionalString(form.display_name),
    country: normalizeOptionalString(form.country)?.toUpperCase(),
    two_factor_enabled: selectValueToBoolean(form.two_factor_enabled),
    last_login: normalizeOptionalString(form.last_login),
    last_display_name_change: normalizeOptionalString(form.last_display_name_change),
    last_match_date: normalizeOptionalString(form.last_match_date),
    skins_count: normalizeOptionalNumber(form.skins_count),
    backpacks_count: normalizeOptionalNumber(form.backpacks_count),
    pickaxes_count: normalizeOptionalNumber(form.pickaxes_count),
    emotes_count: normalizeOptionalNumber(form.emotes_count),
    gliders_count: normalizeOptionalNumber(form.gliders_count),
    wraps_count: normalizeOptionalNumber(form.wraps_count),
    banners_count: normalizeOptionalNumber(form.banners_count),
    sprays_count: normalizeOptionalNumber(form.sprays_count),
    exclusives_count: normalizeOptionalNumber(form.exclusives_count),
  }

  return hasFortniteAccountDetails(payload) ? payload : undefined
}

export function hasFortniteAccountDetails(
  details: Partial<FortniteAccountDetails> | FortniteAccountDetails | null | undefined,
): boolean {
  if (!details) return false
  return Object.values(details).some((value) => value !== null && value !== undefined && value !== '')
}

export function booleanToSelectValue(value: boolean | null | undefined): FortniteBooleanSelectValue {
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
}

export function selectValueToBoolean(value: FortniteBooleanSelectValue): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || undefined
}

function normalizeOptionalNumber(value: number | '' | null | undefined): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  return Number.isFinite(Number(value)) ? Number(value) : undefined
}

function normalizeCountField(value: number | null | undefined): number | '' {
  return typeof value === 'number' ? value : ''
}

function normalizeDateField(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function formatFortniteDate(
  value: string | null | undefined,
  locale: string,
): string {
  if (!value) return ''
  const normalizedValue = value.length === 10 ? `${value}T00:00:00` : value
  const parsedDate = new Date(normalizedValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

export function buildFortniteCompactSummary(
  details: FortniteAccountDetails | null | undefined,
  t: TranslateFn,
  locale: string,
): string[] {
  if (!details) return []

  const summary: string[] = []

  if (details.display_name) {
    summary.push(`${t('common.fortniteAccount.fields.display_name')}: ${details.display_name}`)
  }

  for (const key of COMPACT_COUNT_FIELD_KEYS) {
    const value = details[key]
    if (typeof value === 'number') {
      summary.push(`${t(`common.fortniteAccount.fields.${key}`)}: ${value}`)
    }
  }

  if (details.country) {
    summary.push(
      `${t('common.fortniteAccount.fields.country')}: ${getLocalizedCountryName(details.country, locale)}`,
    )
  }

  if (details.two_factor_enabled !== null && details.two_factor_enabled !== undefined) {
    summary.push(
      `${t('common.fortniteAccount.fields.two_factor_enabled')}: ${details.two_factor_enabled ? t('common.fortniteAccount.booleanValues.true') : t('common.fortniteAccount.booleanValues.false')}`,
    )
  }

  if (details.can_change_email !== null && details.can_change_email !== undefined) {
    summary.push(
      `${t('common.fortniteAccount.fields.can_change_email')}: ${details.can_change_email ? t('common.fortniteAccount.booleanValues.true') : t('common.fortniteAccount.booleanValues.false')}`,
    )
  }

  return summary
}
