<script setup lang="ts">
import { computed } from 'vue'
import { resolveNicknameStyleId } from '@/utils/nicknameStyles'

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
const styleClass = computed(() => `nick-style-${normalizedStyleId.value}`)
</script>

<template>
  <span class="styled-username" :class="styleClass">{{ username }}</span>
</template>

<style scoped>
.styled-username {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.nick-style-default {
  color: inherit;
}

.nick-style-neon_pulse {
  color: #67e8f9;
  text-shadow: 0 0 6px rgba(103, 232, 249, 0.45), 0 0 14px rgba(34, 211, 238, 0.28);
  animation: nick-neon-pulse 2.2s ease-in-out infinite;
}

.nick-style-gold_royal {
  background-image: linear-gradient(110deg, #fde68a 0%, #f59e0b 45%, #fef3c7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4));
}

.nick-style-cyber_glitch {
  color: #f5d0fe;
  text-shadow:
    -1px 0 rgba(232, 121, 249, 0.7),
    1px 0 rgba(34, 211, 238, 0.7),
    0 0 10px rgba(217, 70, 239, 0.3);
}

.nick-style-sunset_wave {
  background-image: linear-gradient(110deg, #fb7185 0%, #fb923c 45%, #facc15 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-ice_frost {
  background-image: linear-gradient(115deg, #f0f9ff 0%, #7dd3fc 45%, #bae6fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 7px rgba(125, 211, 252, 0.35);
}

.nick-style-emerald_glow {
  color: #6ee7b7;
  text-shadow: 0 0 7px rgba(52, 211, 153, 0.5), 0 0 14px rgba(5, 150, 105, 0.28);
}

.nick-style-lava_burst {
  background-image: linear-gradient(115deg, #fca5a5 0%, #ef4444 40%, #f97316 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
}

.nick-style-aurora_spectrum {
  background-image: linear-gradient(120deg, #5eead4 0%, #818cf8 40%, #f472b6 78%, #facc15 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-candy_pop {
  background-image: linear-gradient(120deg, #f9a8d4 0%, #f472b6 35%, #c4b5fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-shadow_void {
  background-image: linear-gradient(120deg, #a78bfa 0%, #f5d0fe 55%, #c4b5fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
}

.nick-style-sky_bolt {
  background-image: linear-gradient(110deg, #93c5fd 0%, #38bdf8 50%, #bfdbfe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nick-style-matrix_code {
  color: #86efac;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.45);
  letter-spacing: 0.02em;
}

@keyframes nick-neon-pulse {
  0%,
  100% {
    text-shadow: 0 0 5px rgba(103, 232, 249, 0.3), 0 0 12px rgba(34, 211, 238, 0.18);
  }
  50% {
    text-shadow: 0 0 9px rgba(103, 232, 249, 0.6), 0 0 16px rgba(34, 211, 238, 0.35);
  }
}
</style>
