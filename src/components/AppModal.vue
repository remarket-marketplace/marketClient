<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  isOpen: boolean
  title?: string
  description?: string
  eyebrow?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  titleScale?: 'default' | 'hero'
  showCloseButton?: boolean
  dismissible?: boolean
  allowOverflowVisible?: boolean
  bodyScrollable?: boolean
  panelClass?: string
  bodyClass?: string
  footerClass?: string
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  size: 'md',
  titleScale: 'default',
  showCloseButton: true,
  dismissible: true,
  allowOverflowVisible: false,
  bodyScrollable: true,
  panelClass: '',
  bodyClass: '',
  footerClass: '',
})

const emit = defineEmits<{
  cancel: []
}>()

const { t } = useI18n()
const slots = useSlots()

const MODAL_OPEN_CLASS = 'modal-open'
let scrollLockCount = 0
let lockedScrollY = 0

function lockPageScroll() {
  if (typeof document === 'undefined') return
  if (scrollLockCount === 0) {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0
    document.documentElement.classList.add(MODAL_OPEN_CLASS)
    document.body.classList.add(MODAL_OPEN_CLASS)
    document.body.style.top = `-${lockedScrollY}px`
  }
  scrollLockCount += 1
}

function unlockPageScroll() {
  if (typeof document === 'undefined' || scrollLockCount === 0) return
  scrollLockCount -= 1
  if (scrollLockCount > 0) return

  const offsetTop = document.body.style.top
  document.documentElement.classList.remove(MODAL_OPEN_CLASS)
  document.body.classList.remove(MODAL_OPEN_CLASS)
  document.body.style.top = ''

  const restoredScrollY = Number.parseInt(offsetTop || '0', 10)
  window.scrollTo({
    top: Number.isFinite(restoredScrollY) ? Math.abs(restoredScrollY) : lockedScrollY,
    left: 0,
    behavior: 'auto',
  })
}

const isScrollLockedByThisModal = ref(false)

function lockIfNeeded() {
  if (isScrollLockedByThisModal.value) return
  lockPageScroll()
  isScrollLockedByThisModal.value = true
}

function unlockIfNeeded() {
  if (!isScrollLockedByThisModal.value) return
  unlockPageScroll()
  isScrollLockedByThisModal.value = false
}

function requestClose() {
  if (!props.dismissible) return
  emit('cancel')
}

function handleEsc(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    requestClose()
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      lockIfNeeded()
      return
    }
    unlockIfNeeded()
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEsc)
  unlockIfNeeded()
})

const hasHeader = computed(() => Boolean(props.eyebrow || props.title || props.description || props.showCloseButton))
const hasFooter = computed(() => Boolean(slots.footer))
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-md'
    case 'lg':
      return 'max-w-2xl'
    case 'xl':
      return 'max-w-[44rem]'
    case 'md':
    default:
      return 'max-w-lg'
  }
})
const titleClass = computed(() => (
  props.titleScale === 'hero'
    ? 'text-[1.9rem] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--text-title)] sm:text-[2.85rem]'
    : 'text-xl font-semibold leading-tight text-[var(--text-title)] sm:text-[1.65rem]'
))
</script>

<template>
  <Teleport to="body">
    <transition name="app-modal-fade">
      <div
        v-if="props.isOpen"
        class="app-modal-overlay z-[120]"
      >
        <div
          class="app-modal-backdrop absolute inset-0"
          @click="requestClose"
        />

        <div class="relative z-10 flex w-full justify-center">
          <div
            class="app-modal-panel app-modal-card relative flex w-full flex-col rounded-[30px] border border-[rgb(var(--palette-white)/0.1)]"
            :class="[sizeClass, props.allowOverflowVisible ? 'overflow-visible' : 'overflow-hidden', props.panelClass]"
          >
            <div v-if="hasHeader" class="relative px-5 pt-5 sm:px-8 sm:pt-8">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div
                    v-if="props.eyebrow"
                    class="inline-flex max-w-full items-center rounded-full border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted)]"
                  >
                    <span class="truncate">{{ props.eyebrow }}</span>
                  </div>

                  <h3 v-if="props.title" class="mt-3 break-words whitespace-normal" :class="titleClass">
                    {{ props.title }}
                  </h3>

                  <p
                    v-if="props.description"
                    class="mt-3 max-w-[38rem] break-words text-[15px] leading-7 text-[var(--text-body)] sm:text-base sm:leading-8"
                  >
                    {{ props.description }}
                  </p>
                </div>

                <button
                  v-if="props.showCloseButton"
                  type="button"
                  class="app-modal-close flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.04)] text-[var(--text-body)] transition hover:border-[rgb(var(--palette-white)/0.2)] hover:bg-[rgb(var(--palette-white)/0.08)] hover:text-[var(--text-title)] disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!props.dismissible"
                  :aria-label="t('common.close')"
                  @click="requestClose"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              class="relative min-h-0 px-5 py-5 sm:px-8 sm:py-7"
              :class="[
                props.bodyScrollable
                  ? (props.allowOverflowVisible ? 'overflow-visible' : 'app-modal-scroll')
                  : 'overflow-visible',
                props.bodyClass,
              ]"
            >
              <slot />
            </div>

            <div
              v-if="hasFooter"
              class="relative border-t border-[rgb(var(--palette-white)/0.08)] px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-5"
              :class="props.footerClass"
            >
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.app-modal-backdrop {
  background: rgb(var(--palette-black) / 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.app-modal-card {
  background: rgb(var(--palette-dark-900));
  box-shadow: none;
}

.app-modal-fade-enter-active,
.app-modal-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.app-modal-fade-enter-from,
.app-modal-fade-leave-to {
  opacity: 0;
}

.app-modal-fade-enter-from .app-modal-card,
.app-modal-fade-leave-to .app-modal-card {
  transform: translateY(8px) scale(0.985);
}
</style>
