<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight } from 'lucide-vue-next'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    variant?: 'home' | 'compact'
  }>(),
  {
    variant: 'home',
  },
)

const { t } = useI18n()

const isCompactVariant = computed(() => props.variant === 'compact')
</script>

<template>
  <section
    class="steam-topup-entry"
    :class="isCompactVariant ? 'mt-3' : 'mt-4'"
  >
    <RouterLink to="/steam-topup" class="steam-topup-entry__link">
      <span class="steam-topup-entry__logo" aria-hidden="true">
        <Icon icon="mdi:steam" class="h-5 w-5 text-white" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold leading-5 text-white sm:text-[15px]">
          {{ t('pages.index.steamTopUp.title') }}
        </span>
        <span class="mt-0.5 block max-w-2xl text-sm leading-5 text-gray-400">
          {{ t('pages.index.steamTopUp.subtitle') }}
        </span>
      </span>

      <span class="steam-topup-entry__action">
        <span class="hidden sm:inline">{{ t('pages.vpn.cta.action') }}</span>
        <ArrowRight class="h-4 w-4" stroke-width="1.8" />
      </span>
    </RouterLink>
  </section>
</template>

<style scoped>
.steam-topup-entry {
  width: 100%;
  color: var(--white-solid);
}

.steam-topup-entry__link {
  display: flex;
  width: 100%;
  min-height: 4.25rem;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(var(--palette-white) / 0.075);
  border-radius: 0.5rem;
  background: rgb(var(--palette-white) / 0.025);
  padding: 0.75rem;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.steam-topup-entry__link:hover {
  border-color: rgb(var(--palette-white) / 0.13);
  background: rgb(var(--palette-white) / 0.04);
}

.steam-topup-entry__logo {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgb(23 28 36) 0%, rgb(13 16 21) 100%);
  border: 1px solid rgb(var(--palette-white) / 0.08);
}

.steam-topup-entry__action {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.375rem;
  color: rgb(var(--palette-gray-300));
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  transition: color 0.18s ease;
}

.steam-topup-entry__link:hover .steam-topup-entry__action {
  color: var(--white-solid);
}
</style>
