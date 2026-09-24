<script setup lang="ts">
import type { LocalPendingChatMessage } from '@/validation/chat/localPendingMessage'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Clock3 } from 'lucide-vue-next'

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
      class="min-w-0 max-w-[82%] text-sm text-mainText sm:max-w-[74%] md:max-w-[34rem] flex flex-col self-end items-end"
    >
      <template v-if="isImageMessage">
        <div class="w-full pb-1">
          <div class="grid w-full gap-1.5" :class="imagePreviewUrls.length === 1 ? 'grid-cols-1' : imagePreviewUrls.length === 2 || imagePreviewUrls.length === 4 ? 'grid-cols-2' : 'grid-cols-3'">
            <div
              v-for="(previewUrl, index) in imagePreviewUrls"
              :key="`${previewUrl}_${index}`"
              class="overflow-hidden rounded-lg border border-[rgb(var(--palette-white)/0.15)] bg-[rgb(var(--palette-dark-700)/0.6)]"
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
        class="min-w-0 rounded-2xl rounded-br-none bg-[rgb(var(--palette-blue-600))] px-3 py-2 leading-[1.42] break-words [overflow-wrap:anywhere]"
      >
        <p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{{ message.text }}<span class="ml-1.5 inline-flex shrink-0 translate-y-[1px] items-center justify-end gap-0.5 whitespace-nowrap align-baseline text-[10.5px] leading-none text-[rgb(var(--text-body-rgb)/0.72)] tabular-nums">
            <span>{{ formatDate(message.created_at) }}</span>
            <span class="inline-flex h-3.5 w-4 shrink-0 items-center justify-center leading-none">
              <Clock3
                v-if="!isFailed"
                class="h-3.5 w-3.5 translate-y-[0.25px]"
                :stroke-width="2.15"
                aria-hidden="true"
              />
            </span>
          </span>
        </p>
      </div>

      <div
        v-if="isImageMessage"
        class="mt-1 flex w-full items-center justify-end gap-2 text-xs text-[var(--text-body)]"
      >
        <span>{{ formatDate(message.created_at) }}</span>
      </div>

      <div
        v-if="isFailed"
        class="mt-1 flex w-full items-center justify-end gap-2 text-xs text-[var(--text-danger)]"
      >
        <span>{{ t('pages.chats.messageSendFailed') }}</span>
        <button
          type="button"
          class="rounded-full border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-body-strong)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)]"
          @click="emit('retry', message.id)"
        >
          {{ $t('pages.chats.retrySend') }}
        </button>
      </div>
    </div>
  </div>
</template>
