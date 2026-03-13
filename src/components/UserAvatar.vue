<script setup lang="ts">
import { computed } from 'vue'
import { useImages } from '@/composables/useImages'

const API_HOST = import.meta.env.VITE_API_HOST || ''

const props = withDefaults(
  defineProps<{
    avatarUrl?: string | null
    alt?: string
  }>(),
  {
    avatarUrl: '',
    alt: 'User avatar',
  }
)

const { images } = useImages()

const resolvedSrc = computed(() => {
  const rawUrl = props.avatarUrl?.trim() || ''
  if (!rawUrl) {
    return images.avatars.default
  }

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl
  }

  return `${API_HOST}${rawUrl}`
})

function handleError(event: Event) {
  const target = event.target as HTMLImageElement | null
  if (!target) {
    return
  }

  if (target.src !== images.avatars.default) {
    target.src = images.avatars.default
  }
}
</script>

<template>
  <img :src="resolvedSrc" :alt="alt" @error="handleError" />
</template>
