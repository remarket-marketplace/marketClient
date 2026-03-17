<script setup lang="ts">
    import { ShieldCheck, Headset, Users, Zap } from 'lucide-vue-next'
</script>

<template>
  <div class="mt-6 rounded-2xl border border-dark-700 bg-dark-600/40 p-4 lg:p-6">
    <div class="trust-grid">
      <div class="trust-item">
        <div class="trust-head">
          <div
            class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
            <ShieldCheck class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p class="trust-title">
            {{ $t('common.trust.guaranteeTitle') }}
          </p>
        </div>
        <p class="trust-text">
          {{ $t('common.trust.guaranteeText') }}
        </p>
      </div>

      <div class="trust-item">
        <div class="trust-head">
          <div
            class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
            <Headset class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p class="trust-title">
            {{ $t('common.trust.supportTitle') }}
          </p>
        </div>
        <p class="trust-text">
          {{ $t('common.trust.supportText') }}
        </p>
      </div>

      <div class="trust-item">
        <div class="trust-head">
          <div
            class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
            <Users class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p class="trust-title">
            {{ $t('common.trust.sellersTitle') }}
          </p>
        </div>
        <p class="trust-text">
          {{ $t('common.trust.sellersText') }}
        </p>
      </div>

      <div class="trust-item">
        <div class="trust-head">
          <div
            class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
            <Zap class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p class="trust-title">
            {{ $t('common.trust.disputesTitle') }}
          </p>
        </div>
        <p class="trust-text">
          {{ $t('common.trust.disputesText') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trust-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
}

.trust-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
}

.trust-head {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.trust-title {
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.1rem;
  color: #fff;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.trust-text {
  min-width: 0;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.125rem;
  color: rgb(156 163 175);
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (min-width: 1024px) {
  .trust-grid {
    gap: 1rem;
  }

  .trust-item {
    padding: 0;
  }
}
</style>
