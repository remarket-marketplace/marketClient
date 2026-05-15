<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, RotateCcw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { formatChatTime } from '@/utils/chatDate'
import {
  SUPPORT_FAQ_NAV_TEXT,
  SUPPORT_FAQ_ROOT_EN,
  SUPPORT_FAQ_ROOT_INTRO,
  SUPPORT_FAQ_ROOT_RU,
  type SupportFaqNode,
} from '@/config/supportFaq'

type FaqMessage = {
  id: string
  role: 'bot' | 'user'
  text: string
  created_at: string
}

const props = defineProps<{
  chatId: string | null
}>()

const { locale } = useI18n()
const localSequence = ref(0)
const navigationStack = ref<SupportFaqNode[]>([])
const messages = ref<FaqMessage[]>([])

const isRu = computed(() => String(locale.value).toLowerCase().startsWith('ru'))
const localeKey = computed<'ru' | 'en'>(() => (isRu.value ? 'ru' : 'en'))
const navText = computed(() => SUPPORT_FAQ_NAV_TEXT[localeKey.value])

const rootNodes = computed<SupportFaqNode[]>(() => (isRu.value ? SUPPORT_FAQ_ROOT_RU : SUPPORT_FAQ_ROOT_EN))
const rootIntro = computed(() => SUPPORT_FAQ_ROOT_INTRO[localeKey.value])

const currentNode = computed<SupportFaqNode | null>(() => navigationStack.value[navigationStack.value.length - 1] ?? null)
const currentOptions = computed<SupportFaqNode[]>(() => currentNode.value?.children ?? rootNodes.value)
const canGoBack = computed(() => navigationStack.value.length > 0)

function nowIso(): string {
  return new Date().toISOString()
}

function nextMessageId(prefix: string): string {
  localSequence.value += 1
  return `${prefix}-${Date.now()}-${localSequence.value}`
}

function pushBotMessage(text: string) {
  messages.value.push({
    id: nextMessageId('faq-bot'),
    role: 'bot',
    text,
    created_at: nowIso(),
  })
}

function pushUserMessage(text: string) {
  messages.value.push({
    id: nextMessageId('faq-user'),
    role: 'user',
    text,
    created_at: nowIso(),
  })
}

function resetFaq() {
  navigationStack.value = []
  messages.value = []
  pushBotMessage(rootIntro.value)
}

function handleSelectNode(node: SupportFaqNode) {
  pushUserMessage(node.label)
  pushBotMessage(node.reply)

  if (node.children && node.children.length > 0) {
    navigationStack.value = [...navigationStack.value, node]
  }
}

function goBack() {
  if (!canGoBack.value) return
  navigationStack.value = navigationStack.value.slice(0, -1)
  pushBotMessage(navText.value.levelUpReply)
}

function goRoot() {
  if (!canGoBack.value) return
  navigationStack.value = []
  pushBotMessage(navText.value.rootReply)
}

function formatFaqTime(dateInput: string): string {
  return formatChatTime(dateInput, locale.value)
}

watch(
  () => props.chatId,
  () => {
    resetFaq()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl rounded-2xl border border-[rgb(var(--palette-dark-700)/0.7)] bg-[rgb(var(--palette-dark-900)/0.62)] p-3 md:p-4">
    <div class="space-y-3">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div v-if="message.role === 'bot'" class="w-full max-w-3xl">
          <p class="mb-1 text-xs font-medium text-[rgb(var(--text-body-rgb)/0.78)]">{{ navText.botName }}</p>
          <div class="rounded-2xl rounded-bl-md border border-[rgb(var(--palette-dark-600)/0.8)] bg-[rgb(var(--palette-dark-800)/0.72)] px-3 py-2.5">
            <p class="whitespace-pre-wrap text-sm leading-6 text-[var(--text-body-strong)]">{{ message.text }}</p>
            <p class="mt-2 text-right text-xs text-[rgb(var(--text-body-rgb)/0.58)]">{{ formatFaqTime(message.created_at) }}</p>
          </div>
        </div>

        <div v-else class="max-w-[85%] rounded-2xl rounded-br-md border border-[rgb(var(--palette-blue-400)/0.45)] bg-[rgb(var(--palette-blue-600)/0.82)] px-3 py-2.5 text-sm text-[var(--text-title)]">
          <p class="whitespace-pre-wrap">{{ message.text }}</p>
          <p class="mt-1 text-right text-xs text-[rgb(var(--palette-white)/0.65)]">{{ formatFaqTime(message.created_at) }}</p>
        </div>
      </div>
    </div>

    <div class="mt-3 border-t border-[rgb(var(--palette-dark-700)/0.8)] pt-3">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <button
          v-if="canGoBack"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:text-[var(--text-title)]"
          @click="goBack"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          {{ navText.back }}
        </button>
        <button
          v-if="canGoBack"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:text-[var(--text-title)]"
          @click="goRoot"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ navText.root }}
        </button>
        <span class="ml-auto text-xs text-[rgb(var(--text-body-rgb)/0.7)]">
          {{ currentNode ? currentNode.label : navText.rootLabel }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="node in currentOptions"
          :key="node.id"
          type="button"
          class="rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-3 py-2 text-left text-sm font-medium text-[rgb(var(--palette-blue-300))] transition hover:border-[rgb(var(--palette-blue-500)/0.45)] hover:bg-[rgb(var(--palette-blue-600)/0.12)] hover:text-[var(--text-title)]"
          @click="handleSelectNode(node)"
        >
          {{ node.label }}
        </button>
      </div>
    </div>
  </div>
</template>
