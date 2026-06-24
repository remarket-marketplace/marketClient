<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { profileService } from '@/api/profile/ProfileService'
import SuccessMessage from '@/components/SuccessMessage.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'
import Loader from '@/components/Loader.vue'

const { t } = useI18n()

const isLoading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const referralCode = ref('')
const invitedUsersCount = ref(0)
const isReferal = ref(false)

const referralLink = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return referralCode.value ? `${origin}/signup?ref=${referralCode.value}` : ''
})

async function loadReferralSummary() {
  isLoading.value = true
  errorMessage.value = ''

  const summary = await profileService.getReferralSummary()
  if (!summary) {
    errorMessage.value = t('pages.admin.referralPage.loadError')
    isLoading.value = false
    return
  }

  isReferal.value = summary.is_referal
  referralCode.value = summary.referral_code
  invitedUsersCount.value = summary.invited_users_count
  isLoading.value = false
}

async function copyValue(value: string) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    successMessage.value = t('pages.admin.referralPage.copied')
    window.setTimeout(() => {
      successMessage.value = ''
    }, 2000)
  } catch {
    errorMessage.value = t('pages.admin.referralPage.copyError')
  }
}

onMounted(() => {
  void loadReferralSummary()
})
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="rounded-[2rem] border border-[rgb(var(--palette-dark-700))] bg-[linear-gradient(135deg,rgb(var(--palette-dark-600)/0.95),rgb(var(--palette-dark-800)/0.92))] p-6 shadow-[0_24px_80px_rgb(0_0_0/0.28)] sm:p-8">
      <div class="max-w-2xl">
        <p class="text-sm uppercase tracking-[0.24em] text-[var(--text-muted)]">{{ t('pages.admin.referralPage.eyebrow') }}</p>
        <h1 class="mt-3 text-3xl font-bold text-mainText sm:text-4xl">{{ t('pages.admin.referralPage.title') }}</h1>
        <p class="mt-3 text-sm text-text-secondary sm:text-base">{{ t('pages.admin.referralPage.subtitle') }}</p>
      </div>

      <Loader v-if="isLoading" class="mt-10" />

      <div v-else class="mt-8 space-y-6">
        <ErrorBanner :message="errorMessage" />
        <SuccessMessage :successMessage="successMessage" />

        <div
          v-if="!isReferal"
          class="rounded-2xl border border-[rgb(var(--palette-amber-500)/0.28)] bg-[rgb(var(--palette-amber-500)/0.08)] p-5 text-sm text-[var(--text-body)]"
        >
          {{ t('pages.admin.referralPage.notEnabled') }}
        </div>

        <template v-else>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] p-5">
              <p class="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{{ t('pages.admin.referralPage.yourCode') }}</p>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span class="font-mono text-2xl font-semibold text-mainText">{{ referralCode }}</span>
                <button type="button" class="admin-btn admin-btn-ghost" @click="copyValue(referralCode)">
                  {{ t('pages.admin.referralPage.copyCode') }}
                </button>
              </div>
            </div>

            <div class="rounded-2xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] p-5">
              <p class="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{{ t('pages.admin.referralPage.invitedUsers') }}</p>
              <p class="mt-3 text-4xl font-bold text-mainText">{{ invitedUsersCount }}</p>
              <p class="mt-2 text-sm text-text-secondary">{{ t('pages.admin.referralPage.invitedUsersHint') }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-[rgb(var(--palette-blue-500)/0.2)] bg-[rgb(var(--palette-blue-500)/0.08)] p-5">
            <p class="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{{ t('pages.admin.referralPage.yourLink') }}</p>
            <div class="mt-3 break-all font-mono text-sm text-mainText">{{ referralLink }}</div>
            <button type="button" class="mt-4 admin-btn admin-btn-primary" @click="copyValue(referralLink)">
              {{ t('pages.admin.referralPage.copyLink') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
