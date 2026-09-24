<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { parseCustomNicknameStyleId, resolveNicknameStyleId } from '@/utils/nicknameStyles'

const props = withDefaults(
  defineProps<{
    username: string
    styleId?: string | null
  }>(),
  {
    styleId: 'default',
  },
)

const normalizedStyleId = computed(() => resolveNicknameStyleId(props.styleId))
const customStyleConfig = computed(() => parseCustomNicknameStyleId(normalizedStyleId.value))
const styleClass = computed(() => (customStyleConfig.value ? '' : `nick-style-${normalizedStyleId.value}`))

function rgbToRgba(rgb: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

const customInlineStyle = computed<CSSProperties | undefined>(() => {
  const config = customStyleConfig.value
  if (!config) return undefined

  const primaryHex = `#${config.primaryColor.r.toString(16).padStart(2, '0')}${config.primaryColor.g.toString(16).padStart(2, '0')}${config.primaryColor.b.toString(16).padStart(2, '0')}`
  const secondaryHex = `#${config.secondaryColor.r.toString(16).padStart(2, '0')}${config.secondaryColor.g.toString(16).padStart(2, '0')}${config.secondaryColor.b.toString(16).padStart(2, '0')}`
  const isGradient = primaryHex !== secondaryHex

  return {
    color: isGradient ? 'transparent' : primaryHex,
    backgroundImage: isGradient ? `linear-gradient(110deg, ${primaryHex} 0%, ${secondaryHex} 100%)` : undefined,
    backgroundClip: isGradient ? 'text' : undefined,
    WebkitBackgroundClip: isGradient ? 'text' : undefined,
    textShadow: config.glowEnabled
      ? `-2px 0 6px ${rgbToRgba(config.glowColor, 0.34)}, 2px 0 6px ${rgbToRgba(config.glowColor, 0.34)}, 0 0 14px ${rgbToRgba(config.glowColor, 0.28)}`
      : undefined,
    fontWeight: String(config.fontWeight),
  }
})
</script>

<template>
  <span class="styled-username" :class="styleClass" :style="customInlineStyle">
    {{ username }}
  </span>
</template>

<style scoped>
.styled-username {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  line-height: 1.2;
}

.nick-style-default {
  color: inherit;
}

.nick-style-neon_pulse {
  color: rgb(var(--palette-cyan-300));
  text-shadow:
    -2px 0 6px rgb(var(--palette-cyan-300) / 0.36),
    2px 0 6px rgb(var(--palette-cyan-300) / 0.36),
    0 0 14px rgb(var(--palette-cyan-400) / 0.28);
  animation: nick-neon-pulse 2.2s ease-in-out infinite;
}

.nick-style-gold_royal {
  background-image: linear-gradient(110deg, rgb(var(--palette-amber-200)) 0%, rgb(var(--palette-amber-500)) 45%, rgb(var(--palette-yellow-200)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 5px rgb(var(--palette-amber-400) / 0.4));
}

.nick-style-cyber_glitch {
  color: rgb(var(--palette-purple-300));
  text-shadow:
    -1px 0 rgb(var(--palette-pink-400) / 0.7),
    1px 0 rgb(var(--palette-cyan-400) / 0.7),
    0 0 10px rgb(var(--palette-fuchsia-500) / 0.3);
}

.nick-style-sunset_wave {
  background-image: linear-gradient(110deg, rgb(var(--palette-rose-400)) 0%, rgb(var(--palette-orange-400)) 45%, rgb(var(--palette-yellow-400)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-ice_frost {
  background-image: linear-gradient(115deg, rgb(var(--palette-sky-50)) 0%, rgb(var(--palette-sky-300)) 45%, rgb(var(--palette-sky-100)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow:
    -2px 0 6px rgb(var(--palette-sky-300) / 0.3),
    2px 0 6px rgb(var(--palette-sky-300) / 0.3),
    0 0 10px rgb(var(--palette-sky-300) / 0.26);
}

.nick-style-emerald_glow {
  color: rgb(var(--palette-emerald-300));
  text-shadow:
    -2px 0 6px rgb(var(--palette-emerald-400) / 0.38),
    2px 0 6px rgb(var(--palette-emerald-400) / 0.38),
    0 0 14px rgb(var(--palette-emerald-600) / 0.28);
}

.nick-style-lava_burst {
  background-image: linear-gradient(115deg, rgb(var(--palette-red-300)) 0%, rgb(var(--palette-red-500)) 40%, rgb(var(--palette-orange-500)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow:
    -2px 0 7px rgb(var(--palette-red-500) / 0.24),
    2px 0 7px rgb(var(--palette-red-500) / 0.24),
    0 0 12px rgb(var(--palette-red-500) / 0.25);
}

.nick-style-aurora_spectrum {
  background-image: linear-gradient(120deg, rgb(var(--palette-cyan-300)) 0%, rgb(var(--palette-indigo-400)) 40%, rgb(var(--palette-pink-400)) 78%, rgb(var(--palette-yellow-400)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-candy_pop {
  background-image: linear-gradient(120deg, rgb(var(--palette-pink-400)) 0%, rgb(var(--palette-pink-500)) 35%, rgb(var(--palette-violet-300)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-shadow_void {
  background-image: linear-gradient(120deg, rgb(var(--palette-purple-400)) 0%, rgb(var(--palette-purple-300)) 55%, rgb(var(--palette-violet-300)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow:
    -2px 0 8px rgb(var(--palette-violet-500) / 0.32),
    2px 0 8px rgb(var(--palette-violet-500) / 0.32),
    0 0 12px rgb(var(--palette-violet-500) / 0.4);
}

.nick-style-sky_bolt {
  background-image: linear-gradient(110deg, rgb(var(--palette-blue-300)) 0%, rgb(var(--palette-sky-400)) 50%, rgb(var(--palette-blue-200)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-matrix_code {
  color: rgb(var(--palette-green-300));
  text-shadow:
    -2px 0 6px rgb(var(--palette-green-500) / 0.34),
    2px 0 6px rgb(var(--palette-green-500) / 0.34),
    0 0 8px rgb(var(--palette-green-500) / 0.45);
  letter-spacing: 0.02em;
}

@keyframes nick-neon-pulse {
  0%,
  100% {
    text-shadow:
      -2px 0 5px rgb(var(--palette-cyan-300) / 0.24),
      2px 0 5px rgb(var(--palette-cyan-300) / 0.24),
      0 0 12px rgb(var(--palette-cyan-400) / 0.18);
  }
  50% {
    text-shadow:
      -2px 0 8px rgb(var(--palette-cyan-300) / 0.5),
      2px 0 8px rgb(var(--palette-cyan-300) / 0.5),
      0 0 16px rgb(var(--palette-cyan-400) / 0.35);
  }
}
</style>
