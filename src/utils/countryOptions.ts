export interface CountryOption {
  code: string
  label: string
}

const COUNTRY_CODES = [
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW',
] as const

const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES)
const displayNamesCache = new Map<string, Intl.DisplayNames | null>()
const optionsCache = new Map<string, CountryOption[]>()

function getDisplayNames(locale: string): Intl.DisplayNames | null {
  if (displayNamesCache.has(locale)) {
    return displayNamesCache.get(locale) ?? null
  }

  let displayNames: Intl.DisplayNames | null = null

  try {
    displayNames = new Intl.DisplayNames([locale, 'en'], { type: 'region' })
  }
  catch {
    displayNames = null
  }

  displayNamesCache.set(locale, displayNames)
  return displayNames
}

export function normalizeCountryCode(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

export function isKnownCountryCode(value: string | null | undefined): boolean {
  return COUNTRY_CODE_SET.has(normalizeCountryCode(value))
}

export function getLocalizedCountryName(
  value: string | null | undefined,
  locale: string,
): string {
  const code = normalizeCountryCode(value)
  if (!code) {
    return ''
  }

  if (!isKnownCountryCode(code)) {
    return code
  }

  const localizedName = getDisplayNames(locale)?.of(code)
  return localizedName || code
}

export function formatCountryOptionLabel(
  value: string | null | undefined,
  locale: string,
): string {
  const code = normalizeCountryCode(value)
  if (!code) {
    return ''
  }

  const localizedName = getLocalizedCountryName(code, locale)
  return localizedName === code ? code : `${localizedName} (${code})`
}

export function getCountryOptions(locale: string): CountryOption[] {
  if (optionsCache.has(locale)) {
    return optionsCache.get(locale) ?? []
  }

  const options = COUNTRY_CODES.map((code) => ({
    code,
    label: formatCountryOptionLabel(code, locale),
  })).sort((left, right) => (
    left.label.localeCompare(right.label, locale, { sensitivity: 'base' })
  ))

  optionsCache.set(locale, options)
  return options
}
