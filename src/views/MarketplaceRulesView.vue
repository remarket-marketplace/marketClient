<script setup lang="ts">
import { nextTick, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BackButton from '@/components/navigation/BackButton.vue'
import { formatDateInRussian, formatDateInEnglish } from '@/utils/dateFormatter'

const route = useRoute()
const { t, locale } = useI18n()

const formattedDate = computed(() => 
  locale.value.startsWith('ru') ? formatDateInRussian() : formatDateInEnglish()
)

function scrollToActiveHash() {
  if (!route.hash) return

  const targetElement = document.getElementById(route.hash.slice(1))
  targetElement?.scrollIntoView({
    block: 'start',
    behavior: 'smooth',
  })
}

onMounted(async () => {
  await nextTick()
  scrollToActiveHash()
})

watch(
  () => route.hash,
  async () => {
    await nextTick()
    scrollToActiveHash()
  },
)
</script>

<template>
  <section class="legal-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="legal-title text-3xl sm:text-4xl text-mainText">
          {{ t('pages.marketRules.title') }}
        </h1>
      </div>
      <p class="legal-updated text-sm sm:text-base">
        {{ t('pages.marketRules.updatedAt', { date: formattedDate }) }}
      </p>

      <article class="mt-6 legal-copy text-[var(--text-body-strong)]">
        <section id="marketplace-general" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ t('pages.marketRules.general.title') }}</h2>
          <p class="legal-paragraph">{{ t('pages.marketRules.general.p1') }}</p>
          <p class="legal-paragraph">{{ t('pages.marketRules.general.p2') }}</p>
          <p class="legal-paragraph">{{ t('pages.marketRules.general.p3') }}</p>
        </section>

        <section id="marketplace-products-scope" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ t('pages.marketRules.productsScope.title') }}</h2>
          <p class="legal-paragraph">{{ t('pages.marketRules.productsScope.p1') }}</p>
          <p class="legal-paragraph">{{ t('pages.marketRules.productsScope.p2') }}</p>
          <ul class="legal-list">
            <li>{{ t('pages.marketRules.productsScope.banned1') }}</li>
            <li>{{ t('pages.marketRules.productsScope.banned2') }}</li>
            <li>{{ t('pages.marketRules.productsScope.banned3') }}</li>
            <li>{{ t('pages.marketRules.productsScope.banned4') }}</li>
            <li>{{ t('pages.marketRules.productsScope.banned5') }}</li>
            <li>{{ t('pages.marketRules.productsScope.banned6') }}</li>
          </ul>
          <p class="legal-paragraph">{{ t('pages.marketRules.productsScope.p3') }}</p>
        </section>

        <section id="marketplace-listings" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ t('pages.marketRules.listings.title') }}</h2>
          <p class="legal-paragraph">{{ t('pages.marketRules.listings.p1') }}</p>
          <ul class="legal-list">
            <li>{{ t('pages.marketRules.listings.item1') }}</li>
            <li>{{ t('pages.marketRules.listings.item2') }}</li>
            <li>{{ $t('pages.marketRules.listings.item3') }}</li>
            <li>{{ $t('pages.marketRules.listings.item4') }}</li>
          </ul>
        </section>

        <section id="marketplace-moderation" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ $t('pages.marketRules.moderation.title') }}</h2>
          <p class="legal-paragraph">{{ $t('pages.marketRules.moderation.p1') }}</p>
          <ul class="legal-list">
            <li>{{ $t('pages.marketRules.moderation.item1') }}</li>
            <li>{{ $t('pages.marketRules.moderation.item2') }}</li>
            <li>{{ $t('pages.marketRules.moderation.item3') }}</li>
            <li>{{ $t('pages.marketRules.moderation.item4') }}</li>
            <li>{{ $t('pages.marketRules.moderation.item5') }}</li>
          </ul>
          <p class="legal-paragraph">{{ $t('pages.marketRules.moderation.p2') }}</p>
        </section>

        <section id="marketplace-deals" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ $t('pages.marketRules.deals.title') }}</h2>
          <p class="legal-paragraph">{{ $t('pages.marketRules.deals.p1') }}</p>
          <ul class="legal-list">
            <li>{{ $t('pages.marketRules.deals.item1') }}</li>
            <li>{{ $t('pages.marketRules.deals.item2') }}</li>
            <li>{{ $t('pages.marketRules.deals.item3') }}</li>
          </ul>
        </section>

        <section id="marketplace-refunds" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ $t('pages.marketRules.refunds.title') }}</h2>
          <p class="legal-paragraph">{{ $t('pages.marketRules.refunds.p1') }}</p>
          <p class="legal-paragraph">{{ $t('pages.marketRules.refunds.p2') }}</p>
          <ul class="legal-list">
            <li>{{ $t('pages.marketRules.refunds.item1') }}</li>
            <li>{{ $t('pages.marketRules.refunds.item2') }}</li>
            <li>{{ $t('pages.marketRules.refunds.item3') }}</li>
            <li>{{ $t('pages.marketRules.refunds.item4') }}</li>
          </ul>
          <p class="legal-paragraph legal-accent">{{ $t('pages.marketRules.refunds.p3') }}</p>
        </section>

        <section id="marketplace-enforcement" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ $t('pages.marketRules.enforcement.title') }}</h2>
          <p class="legal-paragraph">{{ $t('pages.marketRules.enforcement.p1') }}</p>
          <ul class="legal-list">
            <li>{{ $t('pages.marketRules.enforcement.item1') }}</li>
            <li>{{ $t('pages.marketRules.enforcement.item2') }}</li>
            <li>{{ $t('pages.marketRules.enforcement.item3') }}</li>
          </ul>
        </section>

        <section id="marketplace-contacts" class="legal-section">
          <h2 class="legal-heading text-mainText">{{ $t('pages.marketRules.contacts.title') }}</h2>
          <p class="legal-paragraph">{{ $t('pages.marketRules.contacts.p1') }}</p>
          <ul class="legal-list">
            <li>
              <router-link to="/feedback" class="legal-link">
                {{ $t('pages.marketRules.contacts.feedback') }}
              </router-link>
            </li>
            <li>
              <a href="mailto:support@re-market.net" class="legal-link">
                support@re-market.net
              </a>
            </li>
          </ul>
        </section>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap');

.legal-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.legal-scroll::-webkit-scrollbar {
  display: none;
}

.legal-title {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.legal-copy {
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
}

.legal-updated {
  margin-top: 0.85rem;
  color: var(--text-secondary);
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
  font-weight: 500;
}

.legal-section {
  margin-top: 1.6rem;
  padding-top: 1.6rem;
  scroll-margin-top: 6rem;
}

.legal-section + .legal-section {
  border-top: 1px solid var(--overlay-white-12);
}

.legal-heading {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-size: 1.18rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.75rem;
}

.legal-paragraph {
  max-width: 102ch;
  font-size: 1rem;
  line-height: 1.68;
  font-weight: 400;
}

.legal-paragraph + .legal-paragraph {
  margin-top: 0.7rem;
}

.legal-list {
  margin-top: 0.6rem;
  margin-left: 1.1rem;
  list-style: disc;
  display: grid;
  gap: 0.38rem;
  color: var(--text-primary);
}

.legal-link {
  color: var(--legal-link);
  text-decoration: underline;
  text-decoration-color: var(--legal-link-underline);
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.legal-link:hover {
  color: var(--legal-link-hover);
  text-decoration-color: var(--legal-link-hover-underline);
}

.legal-accent {
  border-left: 2px solid var(--legal-accent-border);
  padding-left: 0.85rem;
}

@media (min-width: 1024px) {
  .legal-section {
    margin-top: 2rem;
    padding-top: 2rem;
  }

  .legal-section + .legal-section {
    border-top: none;
  }
}

@media (max-width: 640px) {
  .legal-heading {
    font-size: 1.08rem;
  }

  .legal-paragraph {
    line-height: 1.62;
  }
}
</style>
