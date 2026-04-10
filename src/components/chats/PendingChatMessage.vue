<script setup lang="ts">
import type { LocalPendingChatMessage } from '@/validation/chat/localPendingMessage'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  message: LocalPendingChatMessage
  formatDate: (dateStr: string) => string
}>()

const emit = defineEmits<{
  retry: [messageId: string]
}>()

const { t } = useI18n()

const isImageMessage = computed(() => props.message.message_type === 'image_message')
const isFailed = computed(() => props.message.status === 'failed')
const imagePreviewUrls = computed(() => (
  props.message.message_type === 'image_message' ? props.message.preview_urls : []
))
</script>

<template>
  <div class="flex justify-end">
    <div
      class="min-w-0 max-w-[70%] text-sm text-mainText md:max-w-[40%] flex flex-col self-end items-end"
    >
      <template v-if="isImageMessage">
        <div class="w-full pb-1">
          <div class="grid w-full gap-1.5" :class="imagePreviewUrls.length === 1 ? 'grid-cols-1' : imagePreviewUrls.length === 2 || imagePreviewUrls.length === 4 ? 'grid-cols-2' : 'grid-cols-3'">
            <div
              v-for="(previewUrl, index) in imagePreviewUrls"
              :key="`${previewUrl}_${index}`"
              class="overflow-hidden rounded-lg border border-white/15 bg-dark-700/60"
              :class="imagePreviewUrls.length === 1 ? 'min-h-[120px]' : 'aspect-square'"
            >
              <img
                :src="previewUrl"
                alt="pending chat upload"
                class="h-full w-full object-cover"
              >
            </div>
          </div>
        </div>
      </template>

      <div
        v-else
        class="min-w-0 rounded-xl rounded-br-none bg-blue-600 px-4 py-2 break-words [overflow-wrap:anywhere]"
      >
        <p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{{ message.text }}</p>
        <div class="mt-1 flex items-center justify-end gap-2 text-xs text-gray-300">
          <span>{{ formatDate(message.created_at) }}</span>
        </div>
      </div>

      <div
        v-if="isImageMessage"
        class="mt-1 flex w-full items-center justify-end gap-2 text-xs text-gray-300"
      >
        <span>{{ formatDate(message.created_at) }}</span>
      </div>

      <div
        v-if="isFailed"
        class="mt-1 flex w-full items-center justify-end gap-2 text-xs text-red-300"
      >
        <span>{{ t('pages.chats.messageSendFailed') }}</span>
        <button
          type="button"
          class="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          @click="emit('retry', message.id)"
        >
          {{ $t('pages.chats.retrySend') }}
        </button>
      </div>
    </div>
  </div>
</template>
