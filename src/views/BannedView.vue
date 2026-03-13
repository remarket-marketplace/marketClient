<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const allowedReasonCodes = new Set([
  'fraud',
  'spam',
  'multipleAccounts',
  'chargebackAbuse',
  'termsViolation',
  'otherReason',
])

const reasonCode = computed(() => {
  const fromReasonCode = route.query.reasonCode
  const fromBanReasonCode = route.query.ban_reason_code
  const value = Array.isArray(fromReasonCode)
    ? fromReasonCode[0]
    : Array.isArray(fromBanReasonCode)
      ? fromBanReasonCode[0]
      : fromReasonCode ?? fromBanReasonCode
  return typeof value === 'string' ? value : ''
})

const reasonText = computed(() => {
  const fromReasonText = route.query.reasonText
  const fromBanReasonText = route.query.ban_reason_text
  const value = Array.isArray(fromReasonText)
    ? fromReasonText[0]
    : Array.isArray(fromBanReasonText)
      ? fromBanReasonText[0]
      : fromReasonText ?? fromBanReasonText
  return typeof value === 'string' ? value : ''
})

const displayReason = computed(() => {
  if (reasonCode.value === 'otherReason' && reasonText.value.trim()) {
    return reasonText.value.trim()
  }

  if (allowedReasonCodes.has(reasonCode.value) && reasonCode.value !== 'otherReason') {
    return t(`common.userBanReasons.${reasonCode.value}`)
  }

  if (reasonText.value.trim()) {
    return reasonText.value.trim()
  }

  return t('pages.bannedPage.noReason')
})

function goHome() {
  router.push('/')
}
</script>

<template>
  <section class="banned-shell banned-shell-fullbleed relative w-full overflow-hidden px-4 py-6 sm:py-8">
    <div class="pointer-events-none absolute inset-0 z-0">
      <div class="absolute inset-0 bg-background"></div>
      <div class="absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_0%,rgba(59,130,246,0.08),transparent_75%)]"></div>
      <div class="absolute inset-0 noise-overlay-bg opacity-10 mix-blend-soft-light"></div>
    </div>

    <div class="relative z-10 mx-auto flex h-full w-full max-w-2xl items-center">
      <div class="w-full rounded-2xl border border-dark-600/90 bg-dark-800/80 p-6 shadow-[0_18px_50px_-28px_rgb(0_0_0_/_0.9)] backdrop-blur-sm sm:p-8">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10">
            <ShieldAlert class="h-5 w-5 text-red-300/90" />
          </div>
          <h1 class="text-2xl font-semibold leading-tight text-white sm:text-3xl">
            {{ $t('pages.bannedPage.title') }}
          </h1>
        </div>

        <p class="mt-5 leading-relaxed text-gray-300/95 sm:text-lg">
          {{ $t('pages.bannedPage.description') }}
        </p>

        <div class="mt-6 rounded-xl border border-dark-600 bg-dark-900/70 p-4 sm:p-5">
          <p class="text-xs uppercase tracking-[0.14em] text-gray-400/85">{{ $t('common.reason') }}</p>
          <p class="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-gray-100">
            {{ displayReason }}
          </p>
        </div>

        <p class="mt-5 text-sm leading-relaxed text-gray-400">
          {{ $t('pages.bannedPage.contactHint') }}
        </p>

        <div class="mt-6 flex">
          <button
            class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
            @click="goHome"
          >
            {{ $t('pages.bannedPage.goHome') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.banned-shell {
  min-height: calc(100vh - 56px);
  min-height: calc(100dvh - 56px);
}

.banned-shell-fullbleed {
  position: relative;
  left: 50%;
  right: 50%;
  width: 100vw;
  margin-left: -50vw;
  margin-right: -50vw;
  max-width: 100vw;
}
</style>
