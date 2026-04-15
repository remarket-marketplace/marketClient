<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import scopeVpnLogoSrc from '@/assets/images/circle_logo_transparent.png'
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
    :class="isCategoryVariant ? 'mt-6' : 'mt-4'"
  >
    <RouterLink to="/vpn" class="scope-vpn-entry__link">
      <span class="scope-vpn-entry__logo" aria-hidden="true">
        <img :src="scopeVpnLogoSrc" alt="" class="h-full w-full object-contain" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold leading-5 text-white sm:text-[15px]">
          {{ title }}
        </span>
        <span class="mt-0.5 block max-w-2xl text-sm leading-5 text-gray-400">
          {{ text }}
        </span>
      </span>

      <span class="scope-vpn-entry__action">
        <span class="hidden sm:inline">{{ t('pages.vpn.cta.action') }}</span>
        <ArrowRight class="h-4 w-4" stroke-width="1.8" />
      </span>
    </RouterLink>
  </section>
</template>

<style scoped>
.scope-vpn-entry {
  color: var(--white-solid);
}

.scope-vpn-entry__link {
  display: flex;
  min-height: 4.25rem;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(var(--palette-white) / 0.075);
  border-radius: 0.5rem;
  background: rgb(var(--palette-white) / 0.025);
  padding: 0.75rem;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.scope-vpn-entry__link:hover {
  border-color: rgb(var(--palette-white) / 0.13);
  background: rgb(var(--palette-white) / 0.04);
}

.scope-vpn-entry__logo {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 9999px;
  background: rgb(239 250 255);
}

.scope-vpn-entry__action {
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

.scope-vpn-entry__link:hover .scope-vpn-entry__action {
  color: var(--white-solid);
}
</style>
