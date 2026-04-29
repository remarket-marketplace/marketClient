<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import BackButton from '@/components/navigation/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import type { AdminFeedback } from '@/validation/feedback/adminFeedback'
import { ExternalLink, Flag, Loader2, MessageCircle, MessageSquareText, Target, UserRound } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const complaint = ref<AdminFeedback | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

const reasonTranslationKeys: Record<string, string> = {
  fraud: 'complaints.reasons.fraud',
  forbidden_content: 'complaints.reasons.forbiddenContent',
  misleading_info: 'complaints.reasons.misleadingInfo',
  abuse: 'complaints.reasons.abuse',
  other: 'complaints.reasons.other',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goBack() {
  router.push('/admin/complaints')
}

function openProfile(username: string) {
  router.push(`/user/${username}`)
}

function openSupportChat(chatId: string | null) {
  if (!chatId) return
  router.push({
    path: '/admin/support/chats',
    query: { chatId },
  })
}

function openTarget() {
  if (!complaint.value) return

  if (complaint.value.target_type === 'user' && complaint.value.target_label) {
    router.push(`/user/${complaint.value.target_label}`)
    return
  }

  if (complaint.value.target_url) {
    window.open(complaint.value.target_url, '_blank', 'noopener,noreferrer')
  }
}

function getComplaintReasonLabel(reason: string | null) {
  if (!reason) return t('common.notSpecified')
  const key = reasonTranslationKeys[reason] ?? ''
  if (!key) return reason
  const translated = t(key)
  return translated === key ? reason : translated
}

async function loadComplaint() {
  isLoading.value = true
  errorMessage.value = ''

  const complaintId = route.params.complaintId as string
  const response = await adminService.getAdminComplaintById(complaintId)

  if (!response) {
    errorMessage.value = t('pages.admin.complaintsPage.notFound')
    isLoading.value = false
    return
  }

  complaint.value = response
  isLoading.value = false
}

onMounted(async () => {
  await loadComplaint()
})
</script>

<template>
  <section class="w-full h-full overflow-y-auto pb-4">
    <div class="flex items-center gap-2 pt-4 md:pt-6 mb-4">
      <BackButton />
      <h1 class="text-xl sm:text-2xl font-bold text-mainText">
        {{ $t('pages.admin.complaintsPage.detailsTitle') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center h-32">
      <Loader2 class="h-6 w-6 animate-spin text-[var(--text-link)]" />
      <span class="ml-2 text-[var(--text-muted)]">{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="errorMessage" class="bg-[rgb(var(--palette-red-500)/0.1)] border border-[rgb(var(--palette-red-500)/0.3)] rounded-xl p-4 text-[var(--text-danger)]">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="complaint" class="space-y-4">
      <article class="admin-surface-card rounded-[1.4rem] p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <UserAvatar
              :avatar-url="complaint.user.avatar_url"
              :alt="complaint.user.username"
              class="h-11 w-11 rounded-full object-cover border border-[rgb(var(--palette-dark-500))]"
            />

            <div class="min-w-0">
              <p class="text-base sm:text-lg text-mainText font-semibold truncate">
                {{ complaint.user.username }}
              </p>
              <p class="text-xs text-[var(--text-meta)]">{{ formatDate(complaint.created_at) }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="admin-btn admin-btn-sm text-xs sm:text-sm"
              @click="openProfile(complaint.user.username)"
            >
              <UserRound class="h-4 w-4" />
              {{ $t('pages.admin.feedbackPage.openProfile') }}
            </button>
            <button
              type="button"
              :disabled="!complaint.support_chat_id"
              class="admin-btn admin-btn-sm text-xs sm:text-sm"
              :class="complaint.support_chat_id ? 'admin-btn-primary' : 'admin-btn-muted'"
              @click="openSupportChat(complaint.support_chat_id)"
            >
              <MessageCircle class="h-4 w-4" />
              {{
                complaint.support_chat_id
                  ? $t('pages.admin.feedbackPage.openSupportChat')
                  : $t('pages.admin.feedbackPage.supportChatUnavailable')
              }}
            </button>
          </div>
        </div>
      </article>

      <article class="admin-surface-card rounded-[1.4rem] p-4">
        <h2 class="text-sm sm:text-base font-semibold text-mainText flex items-center gap-2 mb-3">
          <Flag class="h-4 w-4 text-[var(--text-danger-soft)]" />
          {{ $t('pages.admin.complaintsPage.reason') }}
        </h2>
        <p class="text-sm font-medium text-[var(--text-body-strong)]">
          {{ getComplaintReasonLabel(complaint.complaint_reason) }}
        </p>
      </article>

      <article class="admin-surface-card rounded-[1.4rem] p-4">
        <h2 class="text-sm sm:text-base font-semibold text-mainText flex items-center gap-2 mb-3">
          <Target class="h-4 w-4 text-[var(--text-link)]" />
          {{ $t('pages.admin.complaintsPage.target') }}
        </h2>

        <div class="flex flex-col gap-2 text-sm text-[var(--text-body-strong)]">
          <div>
            <span class="text-[var(--text-muted)]">{{ $t('pages.admin.complaintsPage.targetType') }}:</span>
            <span class="ml-1">{{ complaint.target_type || $t('common.notSpecified') }}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">{{ $t('pages.admin.complaintsPage.targetName') }}:</span>
            <span class="ml-1">{{ complaint.target_label || complaint.target_id || $t('common.notSpecified') }}</span>
          </div>
        </div>

        <button
          v-if="complaint.target_url || complaint.target_type === 'user'"
          type="button"
          class="admin-btn admin-btn-sm mt-4 text-xs sm:text-sm"
          @click="openTarget"
        >
          <ExternalLink class="h-4 w-4" />
          {{ $t('pages.admin.complaintsPage.openTarget') }}
        </button>
      </article>

      <article class="admin-surface-card rounded-[1.4rem] p-4">
        <h2 class="text-sm sm:text-base font-semibold text-mainText flex items-center gap-2 mb-3">
          <MessageSquareText class="h-4 w-4 text-[var(--text-link)]" />
          {{ $t('pages.admin.complaintsPage.description') }}
        </h2>
        <p class="text-sm text-[var(--text-body-strong)] whitespace-pre-wrap break-words leading-relaxed">
          {{ complaint.text }}
        </p>
      </article>
    </div>

    <div v-else class="admin-surface-card rounded-[1.4rem] p-4">
      <p class="text-[var(--text-body)] mb-3">{{ $t('pages.admin.complaintsPage.loadError') }}</p>
      <button
        type="button"
        class="admin-btn admin-btn-sm"
        @click="goBack"
      >
        {{ $t('common.back') }}
      </button>
    </div>
  </section>
</template>
