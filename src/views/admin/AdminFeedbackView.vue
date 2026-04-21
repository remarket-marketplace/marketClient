<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import BackButton from '@/components/navigation/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import type { AdminFeedback } from '@/validation/feedback/adminFeedback'
import {
  Loader2,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  UserRound,
  ExternalLink,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST || ''

const feedback = ref<AdminFeedback | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

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
  router.push('/admin/feedback')
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

function getImageUrl(imageUrl: string) {
  return `${API_HOST}${imageUrl}`
}

function openImage(imageUrl: string) {
  window.open(getImageUrl(imageUrl), '_blank', 'noopener,noreferrer')
}

async function loadFeedback() {
  isLoading.value = true
  errorMessage.value = ''

  const feedbackId = route.params.feedbackId as string
  const response = await adminService.getAdminFeedbackById(feedbackId)

  if (!response) {
    errorMessage.value = t('pages.admin.feedbackPage.notFound')
    isLoading.value = false
    return
  }

  feedback.value = response
  isLoading.value = false
}

onMounted(async () => {
  await loadFeedback()
})
</script>

<template>
  <section class="w-full h-full overflow-y-auto pb-4">
    <div class="flex items-center gap-2 pt-4 md:pt-6 mb-4">
      <BackButton />
      <h1 class="text-xl sm:text-2xl font-bold text-mainText">
        {{ $t('pages.admin.feedbackPage.detailsTitle') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center h-32">
      <Loader2 class="h-6 w-6 animate-spin text-[rgb(var(--palette-blue-500))]" />
      <span class="ml-2 text-[rgb(var(--palette-gray-400))]">{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="errorMessage" class="bg-[rgb(var(--palette-red-500)/0.1)] border border-[rgb(var(--palette-red-500)/0.3)] rounded-xl p-4 text-[rgb(var(--palette-red-300))]">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="feedback" class="space-y-4">
      <article class="admin-surface-card rounded-[1.4rem] p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
            <UserAvatar
              :avatar-url="feedback.user.avatar_url"
              :alt="feedback.user.username"
              class="h-11 w-11 rounded-full object-cover border border-[rgb(var(--palette-dark-500))]"
            />

            <div class="min-w-0">
              <p class="text-base sm:text-lg text-mainText font-semibold truncate">
                {{ feedback.user.username }}
              </p>
              <p class="text-xs text-[rgb(var(--palette-gray-500))]">{{ formatDate(feedback.created_at) }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="admin-btn admin-btn-sm text-xs sm:text-sm"
              @click="openProfile(feedback.user.username)"
            >
              <UserRound class="h-4 w-4" />
              {{ $t('pages.admin.feedbackPage.openProfile') }}
            </button>
            <button
              type="button"
              :disabled="!feedback.support_chat_id"
              class="admin-btn admin-btn-sm text-xs sm:text-sm"
              :class="feedback.support_chat_id ? 'admin-btn-primary' : 'admin-btn-muted'"
              @click="openSupportChat(feedback.support_chat_id)"
            >
              <MessageCircle class="h-4 w-4" />
              {{
                feedback.support_chat_id
                  ? $t('pages.admin.feedbackPage.openSupportChat')
                  : $t('pages.admin.feedbackPage.supportChatUnavailable')
              }}
            </button>
          </div>
        </div>
      </article>

      <article class="admin-surface-card rounded-[1.4rem] p-4">
        <h2 class="text-sm sm:text-base font-semibold text-mainText flex items-center gap-2 mb-3">
          <MessageSquareText class="h-4 w-4 text-[rgb(var(--palette-blue-400))]" />
          {{ $t('pages.admin.feedbackPage.message') }}
        </h2>
        <p class="text-sm text-[rgb(var(--palette-gray-200))] whitespace-pre-wrap break-words leading-relaxed">
          {{ feedback.text }}
        </p>
      </article>

      <article class="admin-surface-card rounded-[1.4rem] p-4">
        <h2 class="text-sm sm:text-base font-semibold text-mainText flex items-center gap-2 mb-3">
          <Paperclip class="h-4 w-4 text-[rgb(var(--palette-blue-400))]" />
          {{ $t('pages.admin.feedbackPage.attachments') }}
        </h2>

        <div v-if="feedback.images.length === 0" class="text-sm text-[rgb(var(--palette-gray-400))]">
          {{ $t('pages.admin.feedbackPage.noAttachments') }}
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            v-for="image in feedback.images"
            :key="image.id"
            type="button"
            class="group relative rounded-lg overflow-hidden border border-[rgb(var(--palette-dark-500))] hover:border-[rgb(var(--palette-blue-500))] transition-colors"
            @click="openImage(image.image_url)"
          >
            <img
              :src="getImageUrl(image.image_url)"
              :alt="`feedback-${image.id}`"
              class="h-32 w-full object-cover"
            />
            <div class="absolute inset-0 bg-[rgb(var(--palette-black)/0)] group-hover:bg-[rgb(var(--palette-black)/0.35)] transition-colors flex items-center justify-center">
              <ExternalLink class="h-4 w-4 text-[rgb(var(--palette-white))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </div>
      </article>
    </div>

    <div v-else class="admin-surface-card rounded-[1.4rem] p-4">
      <p class="text-[rgb(var(--palette-gray-300))] mb-3">{{ $t('pages.admin.feedbackPage.loadError') }}</p>
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
