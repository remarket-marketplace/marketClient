<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BackButton from '@/components/navigation/BackButton.vue'

const { t, tm } = useI18n()

type LegalSection = {
  title?: string
  paragraphs?: string[]
  list?: string[]
}

const sections = computed(() => tm('pages.privacyPolicyPage.sections') as LegalSection[])
</script>

<template>
  <section class="legal-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="legal-title text-3xl sm:text-4xl text-mainText">
          {{ t('pages.privacyPolicyPage.title') }}
        </h1>
      </div>

      <article class="mt-6 legal-copy text-[var(--text-body-strong)]">
        <section
          v-for="(section, index) in sections"
          :key="`${index}-${section.title ?? 'section'}`"
          class="legal-section"
        >
          <h2 v-if="section.title" class="legal-heading text-mainText">{{ section.title }}</h2>
          <p
            v-for="paragraph in section.paragraphs ?? []"
            :key="paragraph"
            class="legal-paragraph"
          >
            {{ paragraph }}
          </p>
          <ul v-if="section.list?.length" class="legal-list">
            <li v-for="item in section.list" :key="item">{{ item }}</li>
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

.legal-section {
  margin-top: 1.6rem;
  padding-top: 1.6rem;
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
