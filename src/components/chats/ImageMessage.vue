<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, CheckCheck, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Loader from '@/components/Loader.vue'
const API_HOST = (import.meta.env.VITE_API_HOST || '').replace(/\/$/, '')

interface ImageMessageProps {
  id: string;
  chat_room_id: string;
  created_at: string;
  message_type: 'image_message';
  sender_id: string;
  text: string;
  is_read: boolean;
  data?: Record<string, any> | null;
}

const props = defineProps<{
  imageMessage: ImageMessageProps | null;
  user: any;
  formatDate: (dateStr: string) => string;
  senderLabel?: string;
  forceShowSender?: boolean;
}>()

const { t } = useI18n()

const imageUrls = computed(() => {
  const rawImages = props.imageMessage?.data?.images
  if (!Array.isArray(rawImages)) return []
  return rawImages.filter((url): url is string => (
    typeof url === 'string' && url.trim().length > 0
  ))
})

function resolveImageUrl(rawUrl: string): string {
  const normalizedUrl = rawUrl.trim()
  if (!normalizedUrl) return ''

  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl
  }

  const path = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`
  if (!API_HOST) return path

  // Avoid duplicated /v1 when backend returns /v1/uploads/*
  if (path.startsWith('/v1/') && API_HOST.endsWith('/v1')) {
    return `${API_HOST.slice(0, -3)}${path}`
  }

  return `${API_HOST}${path}`
}

const resolvedImageUrls = computed(() => imageUrls.value.map(resolveImageUrl))
const hasSingleImage = computed(() => resolvedImageUrls.value.length === 1)
const imageGridClass = computed(() => {
  const count = resolvedImageUrls.value.length
  if (count <= 1) return 'grid-cols-1'
  if (count === 2 || count === 4) return 'grid-cols-2'
  return 'grid-cols-3'
})

const isOwnMessage = computed(() => {
  return props.imageMessage?.sender_id === props.user?.id
})

const messageAlignmentClass = computed(() => {
  return isOwnMessage.value ? 'self-end items-end' : 'self-start items-start'
})

const readStatusTitle = computed(() => {
  if (!props.imageMessage || !isOwnMessage.value) return ''
  return props.imageMessage.is_read ? t('common.messageRead') : t('common.messageUnread')
})

const readStatusClass = computed(() => {
  if (!props.imageMessage || !isOwnMessage.value) return ''
  return props.imageMessage.is_read ? 'text-sky-300' : 'text-gray-300/85'
})

const selectedModalImageUrl = ref<string | null>(null)
const modalImageLoading = ref(false)
const modalImageError = ref(false)
const imageLoadState = ref<Record<string, 'loading' | 'loaded' | 'error'>>({})

function getImageStateKey(imageUrl: string, index: number): string {
  return `${index}::${imageUrl}`
}

watch(
  resolvedImageUrls,
  (urls) => {
    const nextState: Record<string, 'loading' | 'loaded' | 'error'> = {}
    urls.forEach((imageUrl, index) => {
      const key = getImageStateKey(imageUrl, index)
      const previousState = imageLoadState.value[key]
      nextState[key] = previousState === 'loaded' ? 'loaded' : 'loading'
    })
    imageLoadState.value = nextState
  },
  { immediate: true },
)

function isImageLoading(imageUrl: string, index: number): boolean {
  const key = getImageStateKey(imageUrl, index)
  return imageLoadState.value[key] === 'loading'
}

function isImageError(imageUrl: string, index: number): boolean {
  const key = getImageStateKey(imageUrl, index)
  return imageLoadState.value[key] === 'error'
}

function markImageLoaded(imageUrl: string, index: number) {
  const key = getImageStateKey(imageUrl, index)
  imageLoadState.value[key] = 'loaded'
}

function markImageError(imageUrl: string, index: number) {
  const key = getImageStateKey(imageUrl, index)
  imageLoadState.value[key] = 'error'
}

function openImageModal(imageUrl: string) {
  selectedModalImageUrl.value = imageUrl
  modalImageLoading.value = true
  modalImageError.value = false
}

function closeImageModal() {
  selectedModalImageUrl.value = null
  modalImageLoading.value = false
  modalImageError.value = false
}

function handleModalImageLoaded() {
  modalImageLoading.value = false
  modalImageError.value = false
}

function handleModalImageError() {
  modalImageLoading.value = false
  modalImageError.value = true
}
</script>

<template>
  <div
    v-if="imageMessage"
    class="min-w-0 max-w-[70%] text-sm break-words [overflow-wrap:anywhere] md:max-w-[40%] flex flex-col"
    :class="messageAlignmentClass"
  >
    <div v-if="senderLabel || forceShowSender" class="mb-1 flex items-center gap-2">
      <span class="rounded-full border border-dark-600 bg-dark-700/80 px-2 py-0.5 text-[11px] font-semibold text-gray-200">
        {{ senderLabel || $t('common.user') }}
      </span>
    </div>

    <div v-if="resolvedImageUrls.length > 0" class="w-full pb-1">
      <div class="grid w-full gap-1.5" :class="imageGridClass">
        <button
          v-for="(imageUrl, index) in resolvedImageUrls"
          :key="`${imageUrl}_${index}`"
          type="button"
          class="relative block w-full overflow-hidden rounded-lg border border-white/15 bg-dark-700/70"
          :class="hasSingleImage ? 'min-h-[120px]' : 'aspect-square'"
          @click="openImageModal(imageUrl)"
        >
          <div
            v-if="isImageLoading(imageUrl, index)"
            class="absolute inset-0 z-10 flex items-center justify-center bg-dark-700/75"
          >
            <Loader size="sm" />
          </div>
          <div
            v-else-if="isImageError(imageUrl, index)"
            class="absolute inset-0 z-10 flex items-center justify-center bg-dark-700/80 px-2 text-center text-xs text-gray-300"
          >
            {{ t('common.noImage') }}
          </div>
          <img
            :src="imageUrl"
            alt="chat image"
            class="w-full object-cover transition-opacity duration-200"
            :class="[hasSingleImage ? 'h-auto max-h-[340px]' : 'h-full', isImageLoading(imageUrl, index) ? 'opacity-0' : 'opacity-100']"
            @load="markImageLoaded(imageUrl, index)"
            @error="markImageError(imageUrl, index)"
          >
        </button>
      </div>
    </div>
    <p v-else>{{ imageMessage.text }}</p>

    <div class="mt-1 flex w-full items-center justify-end gap-2 text-xs text-gray-300">
      <span
        v-if="isOwnMessage"
        class="inline-flex items-center leading-none select-none transition-colors duration-200"
        :class="readStatusClass"
        :title="readStatusTitle"
        :aria-label="readStatusTitle"
      >
        <Check
          v-if="!imageMessage.is_read"
          class="h-3.5 w-3.5 translate-y-[0.25px]"
          :stroke-width="2.35"
          aria-hidden="true"
        />
        <CheckCheck
          v-else
          class="h-3.5 w-3.5 -translate-x-[0.5px] translate-y-[0.25px]"
          :stroke-width="2.35"
          aria-hidden="true"
        />
      </span>
      <span>{{ formatDate(imageMessage.created_at) }}</span>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="selectedModalImageUrl"
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      @click="closeImageModal"
    >
      <div class="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center" @click.stop>
        <div
          v-if="modalImageLoading"
          class="absolute inset-0 z-10 flex items-center justify-center"
        >
          <Loader />
        </div>
        <div
          v-if="modalImageError"
          class="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-gray-300"
        >
          {{ t('common.noImage') }}
        </div>
        <img
          :src="selectedModalImageUrl"
          alt="Modal chat image"
          class="max-h-full max-w-full rounded-lg object-contain transition-opacity duration-200"
          :class="modalImageLoading ? 'opacity-0' : 'opacity-100'"
          loading="lazy"
          @load="handleModalImageLoaded"
          @error="handleModalImageError"
        >

        <button
          type="button"
          class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-all duration-200 hover:bg-black/70 hover:text-gray-300"
          @click="closeImageModal"
        >
          <X class="h-6 w-6" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
