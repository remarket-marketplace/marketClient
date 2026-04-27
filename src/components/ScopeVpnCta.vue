<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import scopeVpnLogoSrc from '@/assets/images/scope_vpn_logo.png'
import { ArrowRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'home' | 'category'
  }>(),
  {
    variant: 'home',
  },
)

const { t } = useI18n()

const isCategoryVariant = computed(() => props.variant === 'category')
const spacingClass = computed(() => (isCategoryVariant.value ? 'mt-6' : ''))
const title = computed(() => (
  isCategoryVariant.value
    ? t('pages.vpn.cta.categoryTitle')
    : t('pages.vpn.cta.title')
))
const text = computed(() => (
  isCategoryVariant.value
    ? t('pages.vpn.cta.categoryText')
    : t('pages.vpn.cta.text')
))
</script>

<template>
  <section
    class="scope-vpn-entry"
    :class="spacingClass"
  >
    <RouterLink to="/vpn" class="scope-vpn-entry__link">
      <span class="scope-vpn-entry__logo-wrap" aria-hidden="true">
        <span class="scope-vpn-entry__logo">
          <img :src="scopeVpnLogoSrc" alt="" class="h-full w-full object-contain" />
        </span>
      </span>

      <span class="scope-vpn-entry__body">
        <span class="scope-vpn-entry__title">
          {{ title }}
        </span>
        <span class="scope-vpn-entry__text">
          {{ text }}
        </span>
      </span>

      <span class="scope-vpn-entry__tail">
        <span class="scope-vpn-entry__action">
          <span class="hidden sm:inline">{{ t('pages.vpn.cta.action') }}</span>
          <ArrowRight class="h-4 w-4" stroke-width="1.8" />
        </span>
      </span>
    </RouterLink>
  </section>
</template>

<style scoped>
.scope-vpn-entry {
  width: 100%;
  height: 100%;
  color: var(--white-solid);
}

.scope-vpn-entry__link {
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
    radial-gradient(circle at 0% 50%, rgb(var(--palette-sky-400) / 0.12), transparent 38%),
    linear-gradient(135deg, rgb(var(--palette-white) / 0.055) 0%, rgb(var(--palette-white) / 0.028) 100%);
  padding: 0.75rem 0.9rem 0.75rem 0.95rem;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.scope-vpn-entry__link::before {
  content: '';
  position: absolute;
  inset: auto -15% -55% auto;
  width: 12rem;
  height: 12rem;
  border-radius: 9999px;
  background: rgb(var(--palette-cyan-300) / 0.08);
  filter: blur(44px);
  pointer-events: none;
}

.scope-vpn-entry__link:hover {
  border-color: rgb(var(--palette-white) / 0.15);
  background:
    radial-gradient(circle at 0% 50%, rgb(var(--palette-sky-400) / 0.15), transparent 42%),
    linear-gradient(135deg, rgb(var(--palette-white) / 0.07) 0%, rgb(var(--palette-white) / 0.035) 100%);
}

.scope-vpn-entry__logo-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  align-self: center;
}

.scope-vpn-entry__logo {
  display: flex;
  height: 2.55rem;
  width: 2.55rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(var(--palette-sky-25));
  box-shadow: inset 0 0 0 1px rgb(var(--palette-white) / 0.06);
}

.scope-vpn-entry__body {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1 1 auto;
}

.scope-vpn-entry__eyebrow {
  display: block;
  color: rgb(var(--palette-cyan-300) / 0.92);
  font-size: 0.7rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.scope-vpn-entry__title {
  display: block;
  color: var(--white-solid);
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 600;
}

.scope-vpn-entry__text {
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

.scope-vpn-entry__tail {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  align-self: center;
  gap: 0.7rem;
}

.scope-vpn-entry__pill {
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

.scope-vpn-entry__action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: rgb(var(--palette-gray-300));
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  transition: color 0.18s ease;
}

.scope-vpn-entry__link:hover .scope-vpn-entry__action {
  color: var(--white-solid);
}

@media (max-width: 767px) {
  .scope-vpn-entry__link {
    align-items: flex-start;
    min-height: 4.55rem;
    gap: 0.6rem;
    border-radius: 1rem;
    padding: 0.55rem 0.65rem;
  }

  .scope-vpn-entry__logo {
    height: 2.15rem;
    width: 2.15rem;
  }

  .scope-vpn-entry__title {
    font-size: 0.9rem;
    line-height: 1.15;
  }

  .scope-vpn-entry__text {
    margin-top: 0.2rem;
    font-size: 0.76rem;
    line-height: 1.28;
  }

  .scope-vpn-entry__tail {
    align-self: stretch;
    align-items: flex-end;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .scope-vpn-entry__pill {
    display: none;
  }
}
</style>
