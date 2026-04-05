export const DEFAULT_NICKNAME_STYLE_ID = 'default'
export const CUSTOM_NICKNAME_STYLE_PRICE_RUB = 299
export const CUSTOM_NICKNAME_STYLE_PREFIX = 'custom_'

export const NICKNAME_STYLE_IDS = [
  DEFAULT_NICKNAME_STYLE_ID,
  'neon_pulse',
  'gold_royal',
  'cyber_glitch',
  'sunset_wave',
  'ice_frost',
  'emerald_glow',
  'lava_burst',
  'aurora_spectrum',
  'candy_pop',
  'shadow_void',
  'sky_bolt',
  'matrix_code',
] as const

export type KnownNicknameStyleId = (typeof NICKNAME_STYLE_IDS)[number]
export type NicknameStyleId = string

export const CUSTOM_NICKNAME_STYLE_FONT_WEIGHTS = [500, 600, 700, 800, 900] as const
export type CustomNicknameStyleFontWeight = (typeof CUSTOM_NICKNAME_STYLE_FONT_WEIGHTS)[number]

const CUSTOM_NICKNAME_STYLE_ID_REGEX =
  /^custom_([0-9a-f]{6})_([0-9a-f]{6})_([0-9a-f]{6})_(500|600|700|800|900)(?:_([01])_([01]))?_([01])$/

export type CustomNicknameStyleConfig = {
  primaryColor: { r: number; g: number; b: number }
  secondaryColor: { r: number; g: number; b: number }
  glowColor: { r: number; g: number; b: number }
  fontWeight: CustomNicknameStyleFontWeight
  glowEnabled: boolean
}

function clampRgbChannel(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toHex(value: number): string {
  return clampRgbChannel(value).toString(16).padStart(2, '0')
}

function normalizeFontWeight(value: number): CustomNicknameStyleFontWeight {
  if ((CUSTOM_NICKNAME_STYLE_FONT_WEIGHTS as readonly number[]).includes(value)) {
    return value as CustomNicknameStyleFontWeight
  }
  return 700
}

function normalizeStyleId(styleId: string | null | undefined): string {
  return styleId?.trim().toLowerCase() || DEFAULT_NICKNAME_STYLE_ID
}

export function buildCustomNicknameStyleId(config: CustomNicknameStyleConfig): string {
  const primaryHex = `${toHex(config.primaryColor.r)}${toHex(config.primaryColor.g)}${toHex(config.primaryColor.b)}`
  const secondaryHex = `${toHex(config.secondaryColor.r)}${toHex(config.secondaryColor.g)}${toHex(config.secondaryColor.b)}`
  const glowHex = `${toHex(config.glowColor.r)}${toHex(config.glowColor.g)}${toHex(config.glowColor.b)}`
  const fontWeight = normalizeFontWeight(config.fontWeight)

  return `${CUSTOM_NICKNAME_STYLE_PREFIX}${primaryHex}_${secondaryHex}_${glowHex}_${fontWeight}_${config.glowEnabled ? 1 : 0}`
}

function parseHexColor(hexColor: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hexColor.slice(0, 2), 16),
    g: Number.parseInt(hexColor.slice(2, 4), 16),
    b: Number.parseInt(hexColor.slice(4, 6), 16),
  }
}

export function parseCustomNicknameStyleId(
  styleId: string | null | undefined,
): CustomNicknameStyleConfig | null {
  const normalized = normalizeStyleId(styleId)
  const match = normalized.match(CUSTOM_NICKNAME_STYLE_ID_REGEX)
  if (!match) return null

  const primaryHex = match[1]
  const secondaryHex = match[2]
  const glowHex = match[3]
  const fontWeightRaw = match[4]
  const glowEnabledRaw = match[7]

  if (!primaryHex || !secondaryHex || !glowHex || !fontWeightRaw || !glowEnabledRaw) {
    return null
  }

  return {
    primaryColor: parseHexColor(primaryHex),
    secondaryColor: parseHexColor(secondaryHex),
    glowColor: parseHexColor(glowHex),
    fontWeight: normalizeFontWeight(Number.parseInt(fontWeightRaw, 10)),
    glowEnabled: glowEnabledRaw === '1',
  }
}

export function normalizeCustomNicknameStyleId(
  styleId: string | null | undefined,
): string | null {
  const config = parseCustomNicknameStyleId(styleId)
  if (!config) return null
  return buildCustomNicknameStyleId(config)
}

export function isKnownNicknameStyleId(
  styleId: string | null | undefined,
): styleId is KnownNicknameStyleId {
  return !!styleId && (NICKNAME_STYLE_IDS as readonly string[]).includes(styleId)
}

export function isCustomNicknameStyleId(styleId: string | null | undefined): boolean {
  return !!parseCustomNicknameStyleId(styleId)
}

export function resolveNicknameStyleId(styleId: string | null | undefined): NicknameStyleId {
  const normalized = normalizeStyleId(styleId)
  if (isKnownNicknameStyleId(normalized)) {
    return normalized
  }
  const normalizedCustomStyleId = normalizeCustomNicknameStyleId(normalized)
  if (normalizedCustomStyleId) {
    return normalizedCustomStyleId
  }
  return DEFAULT_NICKNAME_STYLE_ID
}

type NicknameStyleTheme = {
  cardClass: string
  glowClass: string
}

export const nicknameStyleThemes: Record<KnownNicknameStyleId, NicknameStyleTheme> = {
  default: {
    cardClass: 'border-dark-600 bg-dark-700/60',
    glowClass: 'shadow-none',
  },
  neon_pulse: {
    cardClass: 'border-cyan-500/40 bg-cyan-900/20',
    glowClass: 'nickname-preview-glow-cyan',
  },
  gold_royal: {
    cardClass: 'border-amber-400/40 bg-amber-900/20',
    glowClass: 'nickname-preview-glow-amber',
  },
  cyber_glitch: {
    cardClass: 'border-fuchsia-500/40 bg-fuchsia-900/20',
    glowClass: 'nickname-preview-glow-fuchsia',
  },
  sunset_wave: {
    cardClass: 'border-orange-400/40 bg-orange-900/20',
    glowClass: 'nickname-preview-glow-orange',
  },
  ice_frost: {
    cardClass: 'border-sky-300/40 bg-sky-900/20',
    glowClass: 'nickname-preview-glow-sky',
  },
  emerald_glow: {
    cardClass: 'border-emerald-400/40 bg-emerald-900/20',
    glowClass: 'nickname-preview-glow-emerald',
  },
  lava_burst: {
    cardClass: 'border-red-500/40 bg-red-900/20',
    glowClass: 'nickname-preview-glow-red',
  },
  aurora_spectrum: {
    cardClass: 'border-indigo-400/40 bg-indigo-900/20',
    glowClass: 'nickname-preview-glow-indigo',
  },
  candy_pop: {
    cardClass: 'border-pink-400/40 bg-pink-900/20',
    glowClass: 'nickname-preview-glow-pink',
  },
  shadow_void: {
    cardClass: 'border-violet-500/40 bg-violet-950/40',
    glowClass: 'nickname-preview-glow-violet',
  },
  sky_bolt: {
    cardClass: 'border-blue-400/40 bg-blue-900/20',
    glowClass: 'nickname-preview-glow-blue',
  },
  matrix_code: {
    cardClass: 'border-green-500/40 bg-green-950/30',
    glowClass: 'nickname-preview-glow-green',
  },
}
