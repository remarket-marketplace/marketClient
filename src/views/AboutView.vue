<script setup lang="ts">
import BackButton from '@/components/navigation/BackButton.vue'
</script>

<template>
  <section class="about-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="about-title text-3xl sm:text-4xl text-mainText">
          {{ $t('pages.about.title') }}
        </h1>
      </div>

      <article class="mt-6 about-copy">
        <p class="about-lead text-[rgb(var(--palette-gray-300))]">
          {{ $t('pages.about.subtitle') }}
        </p>

        <section class="about-section">
          <h2 class="about-heading text-mainText">
            {{ $t('pages.about.missionTitle') }}
          </h2>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.missionText1') }}</p>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.missionText2') }}</p>
        </section>

        <section class="about-section">
          <h2 class="about-heading text-mainText">
            {{ $t('pages.about.ideaTitle') }}
          </h2>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.ideaText1') }}</p>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.ideaText2') }}</p>
        </section>

        <section class="about-section">
          <h2 class="about-heading text-mainText">
            {{ $t('pages.about.securityTitle') }}
          </h2>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.securityText1') }}</p>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.securityText2') }}</p>
        </section>

        <section class="about-section">
          <h2 class="about-heading text-mainText">
            {{ $t('pages.about.valuesTitle') }}
          </h2>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.valuesText1') }}</p>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.valuesText2') }}</p>
        </section>

        <section class="about-section">
          <h2 class="about-heading text-mainText">
            {{ $t('pages.about.futureTitle') }}
          </h2>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.futureText1') }}</p>
          <p class="about-paragraph text-[rgb(var(--palette-gray-200))]">{{ $t('pages.about.futureText2') }}</p>
        </section>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap');

.about-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.about-scroll::-webkit-scrollbar {
  display: none;
}

.about-title {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.about-copy {
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
}

.about-lead {
  margin-top: 1.25rem;
  max-width: 96ch;
  font-size: 1.04rem;
  line-height: 1.75;
  font-weight: 500;
}

.about-section {
  margin-top: 1.6rem;
  padding-top: 1.6rem;
}

.about-section + .about-section {
  border-top: 1px solid var(--overlay-white-12);
}

.about-heading {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-size: 1.22rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.7rem;
}

.about-paragraph {
  max-width: 100ch;
  font-size: 1rem;
  line-height: 1.68;
  font-weight: 400;
}

.about-paragraph + .about-paragraph {
  margin-top: 0.75rem;
}

@media (min-width: 1024px) {
  .about-section {
    margin-top: 2.1rem;
    padding-top: 2.1rem;
  }

  .about-section + .about-section {
    border-top: none;
  }
}

@media (max-width: 640px) {
  .about-heading {
    font-size: 1.12rem;
  }

  .about-lead,
  .about-paragraph {
    line-height: 1.62;
  }
}
</style>
