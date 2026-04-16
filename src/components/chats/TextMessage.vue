<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, CheckCheck, Copy } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/AppModal.vue'

interface TextMessageProps {
  id: string;
  chat_room_id: string;
  created_at: string;
  message_type: "text_message";
  sender_id: string;
  text: string;
  is_read: boolean;
  is_admin_message?: boolean;
  data?: Record<string, any> | null;
}

const props = defineProps<{
  textMessage: TextMessageProps | null;
  user: any;
  formatDate: (dateStr: string) => string;
  showAdminBadge?: boolean;
  chatParticipantIds?: string[];
  senderLabel?: string;
  senderRole?: 'buyer' | 'seller' | 'admin';
  forceShowSender?: boolean;
}>()

const { t, locale } = useI18n()
const isScopeVpnLinkCopied = ref(false)
const pendingExternalUrl = ref<string | null>(null)

type TextPart =
  | { type: 'text'; value: string }
  | { type: 'url'; value: string }
  | { type: 'newline'; value: '\n' }

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

function splitTextWithLinks(content: string): TextPart[] {
  if (!content) return []

  const parts: TextPart[] = []
  const lines = content.split('\n')

  lines.forEach((line, lineIndex) => {
    let lastIndex = 0

    for (const match of line.matchAll(URL_PATTERN)) {
      const url = match[0]
      const start = match.index ?? 0

      if (start > lastIndex) {
        parts.push({ type: 'text', value: line.slice(lastIndex, start) })
      }

      parts.push({ type: 'url', value: url })
      lastIndex = start + url.length
    }

    if (lastIndex < line.length) {
      parts.push({ type: 'text', value: line.slice(lastIndex) })
    }

    if (lineIndex < lines.length - 1) {
      parts.push({ type: 'newline', value: '\n' })
    }
  })

  return parts
}

const scopeVpnData = computed(() => {
  const data = props.textMessage?.data
  if (!data?.scope_vpn_order_id || typeof data.subscription_url !== 'string') {
    return null
  }

  return {
    subscriptionUrl: data.subscription_url,
    durationDays: Number(data.duration_days) || null,
    isTrial: Boolean(data.is_trial),
    trafficLimitGb: Number(data.traffic_limit_gb) || null,
  }
})

const scopeVpnPartnerTemplateText = computed(() => {
  const data = props.textMessage?.data
  if (!data || typeof data.subscription_url === 'string') return ''

  const ru = typeof data.scope_vpn_partner_message_ru === 'string'
    ? data.scope_vpn_partner_message_ru.trim()
    : ''
  const en = typeof data.scope_vpn_partner_message_en === 'string'
    ? data.scope_vpn_partner_message_en.trim()
    : ''

  return locale.value.startsWith('ru') ? (ru || en) : (en || ru)
})

const scopeVpnTitle = computed(() => {
  if (!scopeVpnData.value) return ''
  if (scopeVpnData.value.isTrial) {
    return t('pages.chats.scopeVpn.trialTitle')
  }
  return t('pages.chats.scopeVpn.paidTitle', {
    days: scopeVpnData.value.durationDays ?? '',
  })
})

const scopeVpnTrafficLimit = computed(() => {
  if (!scopeVpnData.value?.trafficLimitGb) return ''
  return t('pages.chats.scopeVpn.trafficLimit', {
    limit: scopeVpnData.value.trafficLimitGb,
  })
})

async function copyScopeVpnLink() {
  const url = scopeVpnData.value?.subscriptionUrl
  if (!url || typeof navigator === 'undefined' || !navigator.clipboard) return

  await navigator.clipboard.writeText(url)
  isScopeVpnLinkCopied.value = true
  window.setTimeout(() => {
    isScopeVpnLinkCopied.value = false
  }, 1600)
}

function requestOpenExternalLink(url: string) {
  if (!url) return
  pendingExternalUrl.value = url
}

function closeExternalLinkModal() {
  pendingExternalUrl.value = null
}

function confirmOpenExternalLink() {
  const url = pendingExternalUrl.value
  if (!url || typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
  pendingExternalUrl.value = null
}

const adminContent = computed(() => {
  if (!props.textMessage) return ''
  if (props.textMessage.data?.i18n_key) {
    const prefix = t(String(props.textMessage.data.i18n_key))
    return prefix
  }
  return props.textMessage.text
})

const regularContent = computed(() => {
  if (!props.textMessage) return ''
  if (scopeVpnPartnerTemplateText.value) {
    return scopeVpnPartnerTemplateText.value
  }
  if (props.textMessage.data?.i18n_key) {
    const prefix = t(String(props.textMessage.data.i18n_key))
    return prefix
  }
  return props.textMessage.text
})

const adminContentParts = computed(() => splitTextWithLinks(adminContent.value))
const regularContentParts = computed(() => splitTextWithLinks(regularContent.value))
const reasonTextParts = computed(() => splitTextWithLinks(reasonText.value))

const reasonText = computed(() => {
  if (!props.textMessage) return ''
  return props.textMessage.data?.reason || props.textMessage.text
})

const hasReason = computed(() => {
  return Boolean(props.textMessage?.data?.reason)
})

const isOwnMessage = computed(() => {
  return props.textMessage?.sender_id === props.user?.id
})

const readStatusTitle = computed(() => {
  if (!props.textMessage || !isOwnMessage.value) return ''
  return props.textMessage.is_read ? t('common.messageRead') : t('common.messageUnread')
})

const readStatusClass = computed(() => {
  if (!props.textMessage || !isOwnMessage.value) return ''
  return props.textMessage.is_read ? 'text-sky-300' : 'text-gray-300/85'
})

const bubbleRoleClass = computed(() => {
  if (props.textMessage?.sender_id === props.user?.id) {
    return 'bg-blue-600 text-mainText rounded-br-none self-end'
  }

  return 'bg-dark-600 text-mainText rounded-bl-none'
})

const pillClasses = computed(() => 'text-gray-200 bg-dark-700/80 border border-dark-600')

const isAdminSenderParticipantInCurrentChat = computed(() => {
  if (!props.textMessage?.is_admin_message) return false
  const participants = props.chatParticipantIds ?? []
  if (participants.length === 0) return false
  return participants.includes(props.textMessage.sender_id)
})

const shouldRenderAdminMessage = computed(() => {
  return Boolean(
    props.textMessage
    && props.showAdminBadge
    && props.textMessage.is_admin_message
    && !isAdminSenderParticipantInCurrentChat.value
  )
})
</script>

<template>
	<!-- Admin message - centered, full width -->
	<div v-if="shouldRenderAdminMessage" class="w-full min-w-0 flex justify-center">
		<div class="w-full min-w-0 max-w-2xl overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-3 text-sm text-mainText break-words [overflow-wrap:anywhere]">
			<div class="flex items-start gap-2">
				<div class="flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-blue-500/20">
					<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
						<path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 011.5-1.5h3V2a.5.5 0 00-.5-.5h-3A4.5 4.5 0 0010 5.5v6a4.5 4.5 0 004.5 4.5h3a.5.5 0 00.5-.5V15h-3a1.5 1.5 0 01-1.5-1.5z"></path>
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-blue-200 font-medium text-xs mb-1">{{ $t('common.admin') }}</p>
          <p v-if="senderLabel || forceShowSender" class="text-xs text-gray-400 mb-1">{{ senderLabel || $t('common.admin') }}</p>
					<p class="whitespace-pre-wrap text-gray-100 break-words [overflow-wrap:anywhere]">
            <template v-for="(part, index) in adminContentParts" :key="`admin-${textMessage?.id}-${index}`">
              <br v-if="part.type === 'newline'" />
              <template v-else-if="part.type === 'text'">{{ part.value }}</template>
              <button
                v-else
                type="button"
                class="inline-block max-w-full whitespace-normal break-all align-baseline rounded-sm text-left text-sky-300 underline decoration-sky-300/70 underline-offset-2 transition hover:text-sky-200"
                :title="t('pages.chats.openLink')"
                @click="requestOpenExternalLink(part.value)"
              >
                {{ part.value }}
              </button>
            </template>
          </p>
          <div v-if="hasReason" class="mt-2 space-y-2">
            <p class="font-semibold text-gray-50">{{ $t('common.reason') }}</p>
            <div class="rounded-lg border border-dark-600 bg-dark-900/70 px-3 py-2 text-gray-100">
              <p class="whitespace-pre-line break-words [overflow-wrap:anywhere]">
                <template v-for="(part, index) in reasonTextParts" :key="`admin-reason-${textMessage?.id}-${index}`">
                  <br v-if="part.type === 'newline'" />
                  <template v-else-if="part.type === 'text'">{{ part.value }}</template>
                  <button
                    v-else
                    type="button"
                    class="inline-block max-w-full whitespace-normal break-all align-baseline rounded-sm text-left text-sky-300 underline decoration-sky-300/70 underline-offset-2 transition hover:text-sky-200"
                    :title="t('pages.chats.openLink')"
                    @click="requestOpenExternalLink(part.value)"
                  >
                    {{ part.value }}
                  </button>
                </template>
              </p>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-end gap-2 text-xs text-gray-400">
            <span>{{ textMessage ? formatDate(textMessage.created_at) : '' }}</span>
            <span
              v-if="isOwnMessage"
              class="inline-flex items-center leading-none select-none transition-colors duration-200"
              :class="readStatusClass"
              :title="readStatusTitle"
              :aria-label="readStatusTitle"
            >
              <Check
                v-if="textMessage ? !textMessage.is_read : false"
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
          </div>
				</div>
			</div>
		</div>
	</div>

	<!-- Regular messages -->
	<div v-else-if="textMessage != null && scopeVpnData" class="min-w-0 max-w-[92%] rounded-2xl border border-dark-700 bg-dark-800/50 px-3.5 py-3 text-sm text-mainText md:max-w-md" :class="textMessage.sender_id === user?.id ? 'self-end' : 'self-start'">
    <div v-if="senderLabel || forceShowSender" class="mb-2 flex items-center gap-2">
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="pillClasses">
        {{ senderLabel || $t('common.user') }}
      </span>
    </div>

    <div class="min-w-0">
        <p class="text-sm font-semibold text-white">{{ scopeVpnTitle }}</p>
        <p class="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          {{ t('pages.chats.scopeVpn.connectionLink') }}
        </p>

        <div class="mt-2 flex w-full min-w-0 items-start gap-2 rounded-xl border border-dark-600 bg-dark-900/55 px-3 py-2">
          <button
            type="button"
          class="min-w-0 flex-1 whitespace-normal break-all text-left text-xs leading-5 text-sky-300 underline decoration-sky-300/70 underline-offset-2 transition hover:text-sky-200"
            :title="t('pages.chats.openLink')"
            @click="requestOpenExternalLink(scopeVpnData.subscriptionUrl)"
          >
            {{ scopeVpnData.subscriptionUrl }}
          </button>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 rounded-full border border-dark-600 bg-dark-700/70 px-2 py-1 text-[11px] font-semibold text-gray-200 transition hover:border-dark-500 hover:text-white"
            :title="t('pages.chats.scopeVpn.copyLink')"
            @click="copyScopeVpnLink"
          >
            <Copy class="h-3.5 w-3.5" stroke-width="1.8" />
            {{ isScopeVpnLinkCopied ? t('common.copied') : t('common.copy') }}
          </button>
        </div>

        <p v-if="scopeVpnTrafficLimit" class="mt-2 text-xs leading-5 text-gray-300">
          {{ scopeVpnTrafficLimit }}
        </p>
    </div>

    <div class="mt-2 flex items-center justify-end gap-2 text-xs text-gray-400">
      <span>{{ formatDate(textMessage.created_at) }}</span>
      <span
        v-if="isOwnMessage"
        class="inline-flex items-center leading-none select-none transition-colors duration-200"
        :class="readStatusClass"
        :title="readStatusTitle"
        :aria-label="readStatusTitle"
      >
        <Check
          v-if="!textMessage.is_read"
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
    </div>
	</div>

	<div v-else-if="textMessage != null" class="min-w-0 max-w-[70%] rounded-xl px-4 py-2 text-sm break-words [overflow-wrap:anywhere] md:max-w-[40%]" :class="[
    bubbleRoleClass,
    textMessage.sender_id === user?.id ? 'self-end' : 'self-start'
	]">
    <div v-if="senderLabel || forceShowSender" class="mb-1 flex items-center gap-2">
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="pillClasses">
        {{ senderLabel || $t('common.user') }}
      </span>
    </div>
		<p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      <template v-for="(part, index) in regularContentParts" :key="`regular-${textMessage.id}-${index}`">
        <br v-if="part.type === 'newline'" />
        <template v-else-if="part.type === 'text'">{{ part.value }}</template>
        <button
          v-else
          type="button"
          class="inline-block max-w-full whitespace-normal break-all align-baseline rounded-sm text-left text-sky-200 underline decoration-sky-200/70 underline-offset-2 transition hover:text-sky-100"
          :title="t('pages.chats.openLink')"
          @click="requestOpenExternalLink(part.value)"
        >
          {{ part.value }}
        </button>
      </template>
    </p>
    <div v-if="hasReason" class="mt-2 space-y-2">
      <p class="font-semibold text-gray-50">{{ $t('common.reason') }}</p>
      <div class="rounded-lg border border-dark-700 bg-dark-900/60 px-3 py-2 text-gray-100">
        <p class="whitespace-pre-line break-words [overflow-wrap:anywhere]">
          <template v-for="(part, index) in reasonTextParts" :key="`regular-reason-${textMessage.id}-${index}`">
            <br v-if="part.type === 'newline'" />
            <template v-else-if="part.type === 'text'">{{ part.value }}</template>
            <button
              v-else
              type="button"
              class="inline-block max-w-full whitespace-normal break-all align-baseline rounded-sm text-left text-sky-200 underline decoration-sky-200/70 underline-offset-2 transition hover:text-sky-100"
              :title="t('pages.chats.openLink')"
              @click="requestOpenExternalLink(part.value)"
            >
              {{ part.value }}
            </button>
          </template>
        </p>
      </div>
    </div>
    <div class="mt-1 flex items-center justify-end gap-2 text-xs text-gray-300">
      <span>{{ formatDate(textMessage.created_at) }}</span>
      <span
        v-if="isOwnMessage"
        class="inline-flex items-center leading-none select-none transition-colors duration-200"
        :class="readStatusClass"
        :title="readStatusTitle"
        :aria-label="readStatusTitle"
      >
        <Check
          v-if="!textMessage.is_read"
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
    </div>
	</div>

  <AppModal
    :is-open="Boolean(pendingExternalUrl)"
    :title="t('pages.chats.externalLinkModal.title')"
    :description="t('pages.chats.externalLinkModal.description')"
    size="sm"
    @cancel="closeExternalLinkModal"
  >
    <div class="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      <p class="break-all text-sm leading-6 text-gray-100">
        {{ pendingExternalUrl }}
      </p>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.08]"
          @click="closeExternalLinkModal"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="market-primary-surface market-primary-hover inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-colors duration-200"
          @click="confirmOpenExternalLink"
        >
          {{ t('pages.chats.openLink') }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
