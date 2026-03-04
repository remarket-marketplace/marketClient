<script setup lang="ts">
import { useImages } from '@/composables/useImages';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ImagePlus, X } from 'lucide-vue-next';

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
  const uploaded = Array.from(input.files || [])
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
)
</script>

<template>
  <div class="z-10 flex flex-none flex-col gap-2">
    <div v-if="previewUrls.length > 0" class="px-1">
      <div class="mb-1 flex items-center justify-between">
        <p class="text-xs text-gray-400">{{ previewUrls.length }}/{{ MAX_IMAGES_PER_MESSAGE }}</p>
        <button
          type="button"
          class="text-xs text-gray-400 transition hover:text-white"
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
          class="relative h-16 w-16 flex-none overflow-hidden rounded-lg border border-white/10 bg-dark-700"
        >
          <img :src="previewUrl" alt="preview" class="h-full w-full object-cover">
          <button
            type="button"
            class="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white transition hover:bg-black"
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
        class="h-12 w-12 flex-none rounded-2xl border border-dark-600 bg-dark-700/95 text-gray-300 transition hover:bg-dark-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isDisabled || selectedFiles.length >= MAX_IMAGES_PER_MESSAGE"
        @click="openImagesPicker"
      >
        <ImagePlus class="mx-auto h-5 w-5" />
      </button>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleImagesSelected"
      >

      <div
        class="flex flex-1 items-end rounded-2xl border px-3 py-2 transition"
        :class="isDisabled
          ? 'border-amber-400/40 bg-amber-500/10 opacity-60'
          : 'border-dark-600 bg-dark-700/95 focus-within:border-blue-400/60'"
      >
        <textarea
          ref="messageInputRef"
          :value="props.newMessage"
          @input="updateMessage"
          rows="1"
          class="max-h-[140px] min-h-8 flex-1 resize-none border-0 bg-transparent py-1 text-white outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:placeholder:text-amber-200/70"
          :placeholder="$t('pages.chats.messagePlaceholder')"
          :disabled="isDisabled"
          maxlength="500"
        />
        <button
          class="ml-2 flex h-8 w-8 flex-none items-center justify-center self-end rounded-full border border-blue-400/40 bg-blue-600/90 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:border-amber-400/40 disabled:bg-dark-500 disabled:opacity-60 disabled:hover:bg-dark-500"
          :disabled="isDisabled || !hasDraftToSend"
          @click="handleSendMessage"
        >
          <img :src="images.chat.send" alt="" class="h-4 w-4 object-contain">
        </button>
      </div>
    </div>
  </div>
</template>
