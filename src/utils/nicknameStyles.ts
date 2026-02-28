export const DEFAULT_NICKNAME_STYLE_ID = 'default'

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

export type NicknameStyleId = (typeof NICKNAME_STYLE_IDS)[number]

export function isNicknameStyleId(styleId: string | null | undefined): styleId is NicknameStyleId {
  return !!styleId && (NICKNAME_STYLE_IDS as readonly string[]).includes(styleId)
}

export function resolveNicknameStyleId(styleId: string | null | undefined): NicknameStyleId {
  if (isNicknameStyleId(styleId)) return styleId
  return DEFAULT_NICKNAME_STYLE_ID
}

type NicknameStyleTheme = {
  cardClass: string
  glowClass: string
}

export const nicknameStyleThemes: Record<NicknameStyleId, NicknameStyleTheme> = {
  default: {
    cardClass: 'border-dark-600 bg-dark-700/60',
    glowClass: 'shadow-none',
  },
  neon_pulse: {
    cardClass: 'border-cyan-500/40 bg-cyan-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(34,211,238,0.18)]',
  },
  gold_royal: {
    cardClass: 'border-amber-400/40 bg-amber-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(251,191,36,0.16)]',
  },
  cyber_glitch: {
    cardClass: 'border-fuchsia-500/40 bg-fuchsia-900/20',
    glowClass: 'shadow-[0_0_22px_rgba(217,70,239,0.18)]',
  },
  sunset_wave: {
    cardClass: 'border-orange-400/40 bg-orange-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(251,146,60,0.18)]',
  },
  ice_frost: {
    cardClass: 'border-sky-300/40 bg-sky-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(125,211,252,0.16)]',
  },
  emerald_glow: {
    cardClass: 'border-emerald-400/40 bg-emerald-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(52,211,153,0.16)]',
  },
  lava_burst: {
    cardClass: 'border-red-500/40 bg-red-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(248,113,113,0.18)]',
  },
  aurora_spectrum: {
    cardClass: 'border-indigo-400/40 bg-indigo-900/20',
    glowClass: 'shadow-[0_0_24px_rgba(129,140,248,0.18)]',
  },
  candy_pop: {
    cardClass: 'border-pink-400/40 bg-pink-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(244,114,182,0.16)]',
  },
  shadow_void: {
    cardClass: 'border-violet-500/40 bg-violet-950/40',
    glowClass: 'shadow-[0_0_24px_rgba(139,92,246,0.2)]',
  },
  sky_bolt: {
    cardClass: 'border-blue-400/40 bg-blue-900/20',
    glowClass: 'shadow-[0_0_20px_rgba(96,165,250,0.16)]',
  },
  matrix_code: {
    cardClass: 'border-green-500/40 bg-green-950/30',
    glowClass: 'shadow-[0_0_22px_rgba(34,197,94,0.2)]',
  },
}
