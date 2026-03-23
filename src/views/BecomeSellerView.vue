<script setup lang="ts">
import BackButton from '@/components/navigation/BackButton.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

function startSelling() {
  router.push('/product/create')
}
</script>

<template>
  <section class="seller-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="seller-title text-3xl sm:text-4xl text-mainText">
          {{ $t('pages.becomeSeller.title') }}
        </h1>
      </div>

      <article class="mt-6 seller-copy">
        <p class="seller-lead text-gray-300">
          {{ $t('pages.becomeSeller.subtitle') }}
        </p>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">01</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.rulesTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.rulesItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.rulesItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.rulesItem3') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">02</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.dealsLogicTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.dealsLogicItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.dealsLogicItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.dealsLogicItem3') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">03</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.safetyTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.safetyItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.safetyItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.safetyItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.safetyItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">04</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.salesTipsTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.salesTipsItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.salesTipsItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.salesTipsItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.salesTipsItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">05</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.marketTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.marketItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.marketItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.marketItem3') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">06</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.checklistTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.checklistItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.checklistItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.checklistItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.checklistItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">07</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.pricingTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.pricingItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.pricingItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.pricingItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.pricingItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">08</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.communicationTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.communicationItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.communicationItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.communicationItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.communicationItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">09</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.postSaleTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.postSaleItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.postSaleItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.postSaleItem3') }}</li>
          </ul>
        </section>

        <section class="seller-section">
          <div class="seller-heading-row">
            <span class="seller-step">10</span>
            <h2 class="seller-heading text-mainText">
              {{ $t('pages.becomeSeller.moderationTitle') }}
            </h2>
          </div>
          <ul class="seller-list">
            <li>{{ $t('pages.becomeSeller.moderationItem1') }}</li>
            <li>{{ $t('pages.becomeSeller.moderationItem2') }}</li>
            <li>{{ $t('pages.becomeSeller.moderationItem3') }}</li>
            <li>{{ $t('pages.becomeSeller.moderationItem4') }}</li>
          </ul>
        </section>

        <section class="seller-section pt-1">
          <p class="seller-cta-text text-blue-100">
            {{ $t('pages.becomeSeller.ctaHint') }}
          </p>
          <div class="mt-6 flex justify-center">
            <button
              type="button"
              class="market-btn market-btn-primary min-w-[240px] rounded-xl px-10 py-4 text-base text-mainText sm:min-w-[320px] sm:text-lg"
              @click="startSelling"
            >
              {{ $t('pages.becomeSeller.startSelling') }}
              <ArrowRight class="w-5 h-5" />
            </button>
          </div>
        </section>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap');

.seller-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.seller-scroll::-webkit-scrollbar {
  display: none;
}

.seller-title {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.seller-copy {
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
}

.seller-lead {
  margin-top: 1.25rem;
  max-width: 96ch;
  font-size: 1.04rem;
  line-height: 1.75;
  font-weight: 500;
}

.seller-section {
  margin-top: 1.45rem;
  padding-top: 1.45rem;
}

.seller-section + .seller-section {
  border-top: 1px solid var(--overlay-white-12);
}

.seller-heading-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.seller-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  border: 1px solid var(--step-border);
  color: var(--step-text);
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
}

.seller-heading {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-size: 1.22rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.35;
}

.seller-list {
  margin: 0;
  padding-left: 1.3rem;
  max-width: 100ch;
  display: grid;
  gap: 0.58rem;
}

.seller-list li {
  font-size: 1rem;
  line-height: 1.68;
  font-weight: 400;
  color: var(--body-copy-strong);
}

.seller-cta-text {
  max-width: 96ch;
  font-size: 1rem;
  line-height: 1.68;
  font-weight: 500;
}

@media (min-width: 1024px) {
  .seller-section {
    margin-top: 1.9rem;
    padding-top: 1.9rem;
  }

  .seller-section + .seller-section {
    border-top: none;
  }
}

@media (max-width: 640px) {
  .seller-heading {
    font-size: 1.12rem;
  }

  .seller-lead,
  .seller-list li,
  .seller-cta-text {
    line-height: 1.62;
  }
}
</style>
