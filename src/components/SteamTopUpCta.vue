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
const spacingClass = computed(() => (isCompactVariant.value ? 'mt-3' : ''))
</script>

<template>
  <section
    class="steam-topup-entry"
    :class="spacingClass"
  >
    <RouterLink to="/steam-topup" class="steam-topup-entry__link">
      <span class="steam-topup-entry__logo-wrap" aria-hidden="true">
        <span class="steam-topup-entry__logo">
          <Icon icon="mdi:steam" class="h-5 w-5 text-[rgb(var(--palette-white))]" />
        </span>
      </span>

      <span class="steam-topup-entry__body">
        <span class="steam-topup-entry__title">
          {{ t('pages.index.steamTopUp.title') }}
        </span>
        <span class="steam-topup-entry__text">
          {{ t('pages.index.steamTopUp.subtitle') }}
        </span>
      </span>

      <span class="steam-topup-entry__tail">
        <span class="steam-topup-entry__action">
          <span class="hidden sm:inline">{{ t('pages.vpn.cta.action') }}</span>
          <ArrowRight class="h-4 w-4" stroke-width="1.8" />
        </span>
      </span>
    </RouterLink>
  </section>
</template>

<style scoped>
.steam-topup-entry {
  width: 100%;
  height: 100%;
  color: var(--white-solid);
}

.steam-topup-entry__link {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 6rem;
  align-items: stretch;
  gap: 0.9rem;
  overflow: hidden;
  border: 1px solid rgb(var(--palette-white) / 0.08);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 0% 50%, rgb(102 192 244 / 0.12), transparent 38%),
    linear-gradient(135deg, rgb(31 40 54 / 0.95) 0%, rgb(17 24 34 / 0.96) 100%);
  padding: 0.75rem 0.9rem 0.75rem 0.95rem;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.steam-topup-entry__link::before {
  content: '';
  position: absolute;
  inset: auto -15% -55% auto;
  width: 12rem;
  height: 12rem;
  border-radius: 9999px;
  background: rgb(102 192 244 / 0.14);
  filter: blur(44px);
  pointer-events: none;
}

.steam-topup-entry__link:hover {
  border-color: rgb(102 192 244 / 0.28);
  background:
    radial-gradient(circle at 0% 50%, rgb(102 192 244 / 0.16), transparent 42%),
    linear-gradient(135deg, rgb(35 48 68 / 0.96) 0%, rgb(19 28 40 / 0.97) 100%);
}

.steam-topup-entry__logo-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  align-self: center;
}

.steam-topup-entry__logo {
  display: flex;
  height: 2.55rem;
  width: 2.55rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgb(23 28 36) 0%, rgb(13 16 21) 100%);
  border: 1px solid rgb(var(--palette-white) / 0.08);
}

.steam-topup-entry__body {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1 1 auto;
}

.steam-topup-entry__eyebrow {
  display: block;
  color: rgb(102 192 244 / 0.94);
  font-size: 0.7rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.steam-topup-entry__title {
  display: block;
  color: var(--white-solid);
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 600;
}

.steam-topup-entry__text {
  display: block;
  margin-top: 0.32rem;
  max-width: 32rem;
  display: -webkit-box;
  overflow: hidden;
  color: rgb(var(--palette-gray-400) / 0.96);
  font-size: 0.88rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.steam-topup-entry__tail {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  align-self: center;
  gap: 0.7rem;
}

.steam-topup-entry__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 6.75rem;
  padding: 0 0.75rem;
  border: 1px solid rgb(var(--palette-white) / 0.08);
  border-radius: 9999px;
  background: rgb(var(--palette-white) / 0.04);
  color: rgb(var(--palette-gray-100));
  font-size: 0.75rem;
  line-height: 1;
  font-weight: 600;
}

.steam-topup-entry__action {
  display: inline-flex;
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

@media (max-width: 767px) {
  .steam-topup-entry__link {
    align-items: flex-start;
    min-height: 5.8rem;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .steam-topup-entry__tail {
    align-self: stretch;
    align-items: flex-end;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .steam-topup-entry__pill {
    display: none;
  }
}
</style>
