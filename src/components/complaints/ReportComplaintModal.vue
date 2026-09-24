<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Flag, Loader2 } from 'lucide-vue-next'
import AppModal from '@/components/AppModal.vue'
import { feedbackService, type ComplaintTargetType } from '@/api/feedback/FeedbackService'
import { getErrorMessage } from '@/utils/errorsMap'

const props = defineProps<{
  isOpen: boolean
  targetType: ComplaintTargetType
  targetId: string
  targetLabel?: string | null
  targetUrl?: string | null
}>()

const emit = defineEmits<{
  close: []
  submitted: []
}>()

const { t } = useI18n()

const descriptionMinLength = 10
const descriptionMaxLength = 2000
const selectedReason = ref('')
const description = ref('')
const isSending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const reasonOptions = computed(() => [
  { value: 'fraud', label: t('complaints.reasons.fraud') },
  { value: 'forbidden_content', label: t('complaints.reasons.forbiddenContent') },
  { value: 'misleading_info', label: t('complaints.reasons.misleadingInfo') },
  { value: 'abuse', label: t('complaints.reasons.abuse') },
  { value: 'other', label: t('complaints.reasons.other') },
])

const normalizedDescription = computed(() => description.value.trim())
const canSubmit = computed(() =>
  Boolean(selectedReason.value)
  && normalizedDescription.value.length >= descriptionMinLength
  && normalizedDescription.value.length <= descriptionMaxLength
  && Boolean(props.targetId)
  && !isSending.value,
)

function resetForm() {
  selectedReason.value = ''
  description.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  isSending.value = false
}

function closeModal() {
  if (isSending.value) return
  emit('close')
}

async function submitComplaint() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedReason.value) {
    errorMessage.value = t('complaints.reasonRequired')
    return
  }

  if (normalizedDescription.value.length < descriptionMinLength) {
    errorMessage.value = t('complaints.descriptionMinError', { min: descriptionMinLength })
    return
  }

  isSending.value = true

  try {
    const result = await feedbackService.sendComplaint({
      reason: selectedReason.value,
      description: normalizedDescription.value,
      targetType: props.targetType,
      targetId: props.targetId,
      targetLabel: props.targetLabel,
      targetUrl: props.targetUrl,
    })

    if (!result.success) {
      errorMessage.value = result.errorMessage
      return
    }

    successMessage.value = t('complaints.sendSuccess')
    emit('submitted')
    window.setTimeout(() => {
      closeModal()
    }, 700)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t)
  } finally {
    isSending.value = false
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  },
)
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="$t('complaints.title')"
    :description="$t('complaints.subtitle')"
    size="sm"
    body-class="space-y-4"
    :dismissible="!isSending"
    @cancel="closeModal"
  >
    <div
      v-if="targetLabel"
      class="rounded-xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-sm text-[var(--text-body)]"
    >
      <span class="text-[var(--text-muted)]">{{ $t('complaints.target') }}:</span>
      <span class="ml-1 font-medium text-[var(--text-title)]">{{ targetLabel }}</span>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-[var(--text-body)]">
        {{ $t('complaints.reasonLabel') }}
      </label>
      <select
        v-model="selectedReason"
        class="w-full rounded-xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-dark-800))] px-4 py-3 text-sm font-medium text-[var(--text-title)] outline-none focus:border-[rgb(var(--palette-blue-500))] focus:ring-2 focus:ring-[rgb(var(--palette-blue-500)/0.3)]"
      >
        <option value="" disabled>{{ $t('complaints.reasonPlaceholder') }}</option>
        <option
          v-for="reason in reasonOptions"
          :key="reason.value"
          :value="reason.value"
        >
          {{ reason.label }}
        </option>
      </select>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-[var(--text-body)]">
        {{ $t('complaints.descriptionLabel') }}
      </label>
      <textarea
        v-model="description"
        rows="5"
        :maxlength="descriptionMaxLength"
        class="w-full resize-none rounded-xl border border-[rgb(var(--palette-white)/0.08)] bg-[rgb(var(--palette-white)/0.03)] px-4 py-3 text-sm text-[var(--text-title)] outline-none placeholder:text-[var(--text-placeholder)] focus:border-[rgb(var(--palette-blue-500))] focus:ring-2 focus:ring-[rgb(var(--palette-blue-500)/0.3)]"
        :placeholder="$t('complaints.descriptionPlaceholder')"
      />
      <div class="flex items-center justify-between gap-3 text-xs">
        <span class="text-[var(--text-muted)]">
          {{ $t('complaints.descriptionHint', { min: descriptionMinLength }) }}
        </span>
        <span class="text-[var(--text-meta)]">
          {{ description.length }}/{{ descriptionMaxLength }}
        </span>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-[rgb(var(--palette-red-500)/0.24)] bg-[rgb(var(--palette-red-500)/0.08)] px-4 py-3 text-sm text-[var(--text-danger)]"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="rounded-xl border border-[rgb(var(--palette-emerald-500)/0.24)] bg-[rgb(var(--palette-emerald-500)/0.08)] px-4 py-3 text-sm text-[var(--text-success)]"
    >
      {{ successMessage }}
    </p>

    <button
      type="button"
      :disabled="!canSubmit"
      class="market-btn market-btn-primary w-full rounded-xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      @click="submitComplaint"
    >
      <span class="inline-flex items-center justify-center gap-2">
        <Loader2 v-if="isSending" class="h-4 w-4 animate-spin" />
        <Flag v-else class="h-4 w-4" />
        {{ isSending ? $t('complaints.sending') : $t('complaints.submit') }}
      </span>
    </button>
  </AppModal>
</template>
