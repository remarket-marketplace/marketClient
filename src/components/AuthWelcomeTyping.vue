<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    durationMs?: number
    holdMs?: number
  }>(),
  {
    durationMs: 1700,
    holdMs: 400,
  }
)

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const typedText = ref('')

let typingTimer: number | null = null
let holdTimer: number | null = null

const textChars = computed(() => Array.from(props.text || ''))

function clearTimers() {
  if (typingTimer !== null) {
    window.clearInterval(typingTimer)
    typingTimer = null
  }

  if (holdTimer !== null) {
    window.clearTimeout(holdTimer)
    holdTimer = null
  }
}

function startTyping() {
  clearTimers()
  typedText.value = ''

  const chars = textChars.value
  if (!chars.length) {
    holdTimer = window.setTimeout(() => emit('finished'), props.holdMs)
    return
  }

  const stepMs = Math.max(28, Math.floor(props.durationMs / chars.length))
  let index = 0

  typingTimer = window.setInterval(() => {
    index += 1
    typedText.value = chars.slice(0, index).join('')

    if (index >= chars.length) {
      if (typingTimer !== null) {
        window.clearInterval(typingTimer)
        typingTimer = null
      }

      holdTimer = window.setTimeout(() => {
        emit('finished')
      }, props.holdMs)
    }
  }, stepMs)
}

watch(
  () => props.text,
  () => {
    startTyping()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <section class="welcome-shell" aria-live="polite">
    <h1 class="welcome-text">
      {{ typedText }}
      <span class="typing-caret" aria-hidden="true"></span>
    </h1>
  </section>
</template>

<style scoped>
.welcome-shell {
  width: 100%;
  min-height: min(56vh, 440px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.welcome-text {
  margin: 0;
  padding: 0 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.6rem, 4.8vw, 3.25rem);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.022em;
  color: var(--auth-welcome-text);
  text-wrap: balance;
  text-shadow: 0 10px 24px var(--auth-welcome-shadow);
}

.typing-caret {
  display: inline-block;
  width: 0.08em;
  height: 0.92em;
  margin-left: 0.06em;
  border-radius: 1px;
  background-color: var(--auth-welcome-caret);
  vertical-align: -0.08em;
  animation: typing-caret-blink 0.75s steps(1, end) infinite;
}

@keyframes typing-caret-blink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}
</style>
