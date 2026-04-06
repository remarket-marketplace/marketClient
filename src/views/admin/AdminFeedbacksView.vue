<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService'
import BackButton from '@/components/navigation/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import type { AdminFeedbackListItem } from '@/validation/feedback/adminFeedback'
import { Loader2, MessageSquareText, Images, UserRound, MessageCircle } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const feedbacks = ref<AdminFeedbackListItem[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const errorMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 20

const listRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openFeedback(feedbackId: string) {
  router.push(`/admin/feedback/${feedbackId}`)
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

function setupObserver() {
  if (!sentinelRef.value || !listRef.value) return

  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreFeedbacks()
      }
    },
    {
      root: listRef.value,
      threshold: 0.1,
    }
  )
  observer.observe(sentinelRef.value)
}

async function loadFeedbacks() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await adminService.getAdminFeedbacks(1, perPage)
    feedbacks.value = response.feedbacks
    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
    total.value = response.total
    hasMore.value = response.currentPage < response.totalPages
  } catch {
    errorMessage.value = t('pages.admin.feedbackPage.loadError')
  } finally {
    isLoading.value = false
  }
}

async function loadMoreFeedbacks() {
  if (isLoadingMore.value || !hasMore.value) return

  isLoadingMore.value = true

  try {
    const nextPage = currentPage.value + 1
    const response = await adminService.getAdminFeedbacks(nextPage, perPage)

    if (response.feedbacks.length === 0) {
      hasMore.value = false
      return
    }

    feedbacks.value.push(...response.feedbacks)
    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
    total.value = response.total
    hasMore.value = response.currentPage < response.totalPages
  } finally {
    isLoadingMore.value = false
  }
}

onMounted(async () => {
  await loadFeedbacks()
  await nextTick()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(
  () => feedbacks.value.length,
  async () => {
    await nextTick()
    setupObserver()
  }
)
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <BackButton />
        <div>
          <h1 class="text-lg sm:text-2xl font-bold text-mainText">
            {{ $t('pages.admin.feedbackPage.title') }}
          </h1>
          <p class="text-xs sm:text-sm text-gray-400">
            {{ $t('pages.admin.feedbackPage.subtitle') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs sm:text-base text-text-secondary">
        <MessageSquareText class="h-4 w-4" />
        <span>{{ $t('common.total') }} {{ total }}</span>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 text-sm sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="errorMessage" class="flex items-center justify-center h-32">
        <p class="text-red-400 text-sm sm:text-base">{{ errorMessage }}</p>
      </div>

      <div v-else-if="feedbacks.length === 0" class="h-full w-full flex items-center justify-center">
        <div class="text-center px-4">
          <MessageSquareText class="h-8 w-8 text-gray-500 mx-auto mb-3" />
          <p class="text-mainText font-semibold">{{ $t('pages.admin.feedbackPage.emptyTitle') }}</p>
          <p class="text-sm text-gray-400 mt-2">{{ $t('pages.admin.feedbackPage.emptyHint') }}</p>
        </div>
      </div>

      <div v-else ref="listRef" class="h-full overflow-y-auto space-y-3 pr-1 pb-4">
        <article
          v-for="feedback in feedbacks"
          :key="feedback.id"
          class="admin-surface-card rounded-[1.4rem] p-3 sm:p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <UserAvatar
                :avatar-url="feedback.user.avatar_url"
                :alt="feedback.user.username"
                class="h-10 w-10 rounded-full object-cover border border-dark-500"
              />

              <div class="min-w-0">
                <button
                  type="button"
                  class="text-sm sm:text-base font-semibold text-mainText hover:text-blue-400 truncate max-w-[220px] text-left"
                  @click="openProfile(feedback.user.username)"
                >
                  {{ feedback.user.username }}
                </button>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ formatDate(feedback.created_at) }}
                </p>
              </div>
            </div>

            <div class="inline-flex items-center gap-1 text-xs text-gray-400">
              <Images class="h-3.5 w-3.5" />
              <span>{{ $t('pages.admin.feedbackPage.imagesCount', { count: feedback.images_count }) }}</span>
            </div>
          </div>

          <p class="mt-3 text-sm text-gray-200 whitespace-pre-wrap break-words line-clamp-4">
            {{ feedback.text_preview }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="admin-btn admin-btn-sm text-xs sm:text-sm"
              @click="openFeedback(feedback.id)"
            >
              <UserRound class="h-4 w-4" />
              {{ $t('pages.admin.feedbackPage.open') }}
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
        </article>

        <div ref="sentinelRef" class="h-1"></div>

        <div v-if="isLoadingMore" class="flex justify-center py-2">
          <Loader2 class="h-5 w-5 animate-spin text-blue-500" />
        </div>
      </div>
    </div>
  </section>
</template>
