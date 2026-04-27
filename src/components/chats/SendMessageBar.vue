<script setup lang="ts">
import { useImages } from '@/composables/useImages';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ImagePlus, X } from 'lucide-vue-next';
import { isSafeImageFile, SAFE_IMAGE_INPUT_ACCEPT } from '@/utils/imageUpload';

const { images } = useImages()
const MAX_IMAGES_PER_MESSAGE = 5

const props = defineProps<{
  newMessage: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'sendMessage', payload: { files: File[] }): void
  (e: 'update:newMessage', value: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const messageInputRef = ref<HTMLTextAreaElement | null>(null)
const selectedFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
const TEXTAREA_MAX_HEIGHT_PX = 140

const isDisabled = computed(() => props.disabled === true)
const hasDraftToSend = computed(() => (
  props.newMessage.trim().length > 0 || selectedFiles.value.length > 0
))

const rebuildPreviewUrls = () => {
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  previewUrls.value = selectedFiles.value.map((file) => URL.createObjectURL(file))
}

const clearSelectedImages = () => {
  selectedFiles.value = []
  rebuildPreviewUrls()
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const handleSendMessage = () => {
  if (isDisabled.value || !hasDraftToSend.value) return
  emit('sendMessage', { files: [...selectedFiles.value] })
  clearSelectedImages()
}

const handleMessageKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if (event.isComposing) return

  // New line is available with Shift/Ctrl/Cmd + Enter.
  if (event.shiftKey || event.ctrlKey || event.metaKey) return

  event.preventDefault()
  handleSendMessage()
}

const updateMessage = (event: Event) => {
  if (isDisabled.value) return
  const target = event.target as HTMLTextAreaElement
  emit('update:newMessage', target.value)
  resizeMessageInput()
}

const resizeMessageInput = () => {
  const textarea = messageInputRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)
  textarea.style.height = `${nextHeight}px`
}

const openImagesPicker = () => {
  if (isDisabled.value) return
  if (selectedFiles.value.length >= MAX_IMAGES_PER_MESSAGE) return
  fileInputRef.value?.click()
}

const handleImagesSelected = (event: Event) => {
  if (isDisabled.value) return

  const input = event.target as HTMLInputElement
  const uploaded = Array.from(input.files || []).filter((file) => isSafeImageFile(file))
  if (uploaded.length === 0) return

  const freeSlots = MAX_IMAGES_PER_MESSAGE - selectedFiles.value.length
  if (freeSlots <= 0) {
    input.value = ''
    return
  }

  selectedFiles.value.push(...uploaded.slice(0, freeSlots))
  rebuildPreviewUrls()
  input.value = ''
}

const removeSelectedImage = (index: number) => {
  selectedFiles.value.splice(index, 1)
  rebuildPreviewUrls()
}

onBeforeUnmount(() => {
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
})

watch(
  () => props.newMessage,
  () => resizeMessageInput(),
  { flush: 'post' },
)
</script>

<template>
  <div class="z-10 flex flex-none flex-col gap-2">
    <div v-if="previewUrls.length > 0" class="px-1">
      <div class="mb-1 flex items-center justify-between">
        <p class="text-xs text-[var(--text-muted)]">{{ previewUrls.length }}/{{ MAX_IMAGES_PER_MESSAGE }}</p>
        <button
          type="button"
          class="text-xs text-[var(--text-muted)] transition hover:text-[var(--text-title)]"
          :disabled="isDisabled"
          @click="clearSelectedImages"
        >
          {{ $t('common.delete') }}
        </button>
      </div>
      <div class="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <div
          v-for="(previewUrl, index) in previewUrls"
          :key="`${previewUrl}_${index}`"
          class="relative h-16 w-16 flex-none overflow-hidden rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-700))]"
        >
          <img :src="previewUrl" alt="preview" class="h-full w-full object-cover">
          <button
            type="button"
            class="message-preview-remove absolute right-0.5 top-0.5 rounded-full p-0.5 text-[var(--text-title)] transition"
            :disabled="isDisabled"
            @click="removeSelectedImage(index)"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-none items-end gap-2">
      <button
        type="button"
        class="message-compose-trigger h-12 w-12 flex-none rounded-full border border-[rgb(var(--palette-white)/0.1)] bg-background/80 text-[var(--text-body)] backdrop-blur-xl transition hover:border-[rgb(var(--palette-white)/0.15)] hover:bg-background/90 hover:text-[var(--text-title)] supports-[backdrop-filter]:bg-background/55 supports-[backdrop-filter]:hover:bg-background/65 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isDisabled || selectedFiles.length >= MAX_IMAGES_PER_MESSAGE"
        @click="openImagesPicker"
      >
        <ImagePlus class="mx-auto h-5 w-5" />
      </button>

      <input
        ref="fileInputRef"
        type="file"
        :accept="SAFE_IMAGE_INPUT_ACCEPT"
        multiple
        class="hidden"
        @change="handleImagesSelected"
      >

      <div
        class="message-compose-shell flex flex-1 items-end rounded-[26px] border px-3 py-2 backdrop-blur-xl transition"
        :class="isDisabled
          ? 'border-[rgb(var(--palette-amber-400)/0.3)] bg-[rgb(var(--palette-amber-500)/0.1)] opacity-60'
          : 'border-[rgb(var(--palette-white)/0.1)] bg-background/80 focus-within:border-[rgb(var(--palette-white)/0.15)] focus-within:bg-background/90 supports-[backdrop-filter]:bg-background/55 supports-[backdrop-filter]:focus-within:bg-background/65'"
      >
        <textarea
          ref="messageInputRef"
          :value="props.newMessage"
          @input="updateMessage"
          @keydown="handleMessageKeydown"
          rows="1"
          class="max-h-[140px] min-h-8 flex-1 resize-none border-0 bg-[var(--transparent)] py-1 text-[var(--text-title)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:placeholder:text-[rgb(var(--text-warning-rgb)/0.7)]"
          :placeholder="$t('pages.chats.messagePlaceholder')"
          :disabled="isDisabled"
          maxlength="500"
        />
        <button
          class="market-primary-surface market-primary-hover ml-2 flex h-8 w-8 flex-none items-center justify-center self-end rounded-full border border-[rgb(var(--palette-blue-400)/0.4)] text-[var(--text-title)] transition disabled:cursor-not-allowed disabled:border-[rgb(var(--palette-white)/0.12)] disabled:bg-[var(--transparent)] disabled:text-[var(--text-muted)] disabled:opacity-100 disabled:hover:bg-[var(--transparent)]"
          :disabled="isDisabled || !hasDraftToSend"
          @click="handleSendMessage"
        >
          <img :src="images.chat.send" alt="" class="h-4 w-4 object-contain">
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-preview-remove {
  background: var(--preview-remove-bg);
}

.message-preview-remove:hover {
  background: var(--preview-remove-hover-bg);
}

.message-compose-trigger {
  box-shadow: var(--glass-fab-shadow);
}

.message-compose-shell {
  box-shadow: var(--glass-compose-shadow);
}
</style>
