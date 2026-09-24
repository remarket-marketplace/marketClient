import { nextTick, ref, watch, type Ref } from 'vue'

export function useCardImageReveal(imageUrl: Ref<string>) {
  const imageElement = ref<HTMLImageElement | null>(null)
  const isImageLoaded = ref(false)

  async function syncLoadStateFromDom(): Promise<void> {
    await nextTick()
    const image = imageElement.value
    if (!image) return
    if (image.complete && image.naturalWidth > 0) {
      isImageLoaded.value = true
    }
  }

  watch(imageUrl, (nextUrl) => {
    isImageLoaded.value = false
    if (!nextUrl) return
    void syncLoadStateFromDom()
  }, { immediate: true })

  function markImageLoaded(): void {
    isImageLoaded.value = true
  }

  function markImagePending(): void {
    isImageLoaded.value = false
  }

  return {
    imageElement,
    isImageLoaded,
    markImageLoaded,
    markImagePending,
  }
}
