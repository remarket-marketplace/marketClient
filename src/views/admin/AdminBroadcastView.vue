<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BackButton from '@/components/navigation/BackButton.vue';
import { Send, AlertTriangle, CheckCircle, Info } from 'lucide-vue-next';

const { t } = useI18n();

const EMAIL_SUBJECT_MAX_LENGTH = 100;
const EMAIL_TEXT_MAX_LENGTH = 5000;

const emailSubject = ref('');
const emailText = ref('');
const includeAdmins = ref(false);
const isSending = ref(false);
const sendSuccess = ref(false);
const sendError = ref('');

const subjectCharsRemaining = computed(() =>
  EMAIL_SUBJECT_MAX_LENGTH - emailSubject.value.length
);

const textCharsRemaining = computed(() =>
  EMAIL_TEXT_MAX_LENGTH - emailText.value.length
);

const isSubjectValid = computed(() =>
  emailSubject.value.trim().length > 0 && emailSubject.value.length <= EMAIL_SUBJECT_MAX_LENGTH
);

const isTextValid = computed(() =>
  emailText.value.trim().length > 0 && emailText.value.length <= EMAIL_TEXT_MAX_LENGTH
);

const isFormValid = computed(() =>
  isSubjectValid.value && isTextValid.value
);

const usernameTag = '<USERNAME>';

async function handleSend() {
  if (!isFormValid.value || isSending.value) return;

  isSending.value = true;
  sendSuccess.value = false;
  sendError.value = '';

  try {
    const result = await adminService.sendUsersBroadcast(
      emailSubject.value.trim(),
      emailText.value.trim(),
      includeAdmins.value,
    );

    if (result) {
      sendSuccess.value = true;
      emailSubject.value = '';
      emailText.value = '';
      includeAdmins.value = false;
    } else {
      sendError.value = t('pages.admin.broadcastPage.sendError');
    }
  } catch {
    sendError.value = t('pages.admin.broadcastPage.sendError');
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <BackButton />
      <div>
        <h1 class="text-lg sm:text-2xl font-bold text-mainText">
          {{ $t('pages.admin.broadcastPage.title') }}
        </h1>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="sendError"
      class="flex items-center gap-3 rounded-[1.4rem] border border-[rgb(var(--palette-red-500)/0.4)] bg-[rgb(var(--palette-red-500)/0.1)] px-4 py-3">
      <AlertTriangle class="w-5 h-5 text-[var(--text-danger)] shrink-0" />
      <p class="text-sm text-[var(--text-danger-soft)]">
        {{ sendError }}
      </p>
    </div>

    <!-- Scrollable form area -->
    <div class="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
      <!-- Info banner -->
      <div class="admin-surface-panel rounded-[1.4rem] py-2 px-4">
        <div class="flex items-center gap-3">
          <Info class="w-4 h-4 text-[var(--text-link)] shrink-0" />
          <div class="space-y-1">
            <p class="text-xs lg:text-sm text-[var(--text-body-strong)]">
              {{ $t('pages.admin.broadcastPage.usernameTagHint', { tag: usernameTag }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="admin-surface-panel rounded-[1.4rem] p-4 sm:p-5 space-y-4">
        <!-- Email Subject -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-[var(--text-body)]">
              {{ $t('pages.admin.broadcastPage.subjectLabel') }}
            </label>
            <span class="text-xs"
              :class="subjectCharsRemaining < 0 ? 'text-[var(--text-danger)]' : 'text-[var(--text-meta)]'">
              {{ subjectCharsRemaining }}
            </span>
          </div>
          <input v-model="emailSubject" type="text" :maxlength="EMAIL_SUBJECT_MAX_LENGTH"
            :placeholder="$t('pages.admin.broadcastPage.subjectPlaceholder')"
            class="admin-input-surface h-10 w-full rounded-lg px-3 text-sm text-mainText" />
        </div>

        <!-- Email Text -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-[var(--text-body)]">
              {{ $t('pages.admin.broadcastPage.messageLabel') }}
            </label>
            <span class="text-xs"
              :class="textCharsRemaining < 0 ? 'text-[var(--text-danger)]' : 'text-[var(--text-meta)]'">
              {{ textCharsRemaining }}
            </span>
          </div>
          <textarea v-model="emailText" :maxlength="EMAIL_TEXT_MAX_LENGTH" rows="8"
            :placeholder="$t('pages.admin.broadcastPage.messagePlaceholder')"
            class="admin-input-surface w-full rounded-lg px-3 py-2.5 text-sm text-mainText resize-none" />
        </div>

        <!-- Include Admins Toggle -->
        <div class="admin-surface-soft rounded-xl p-4">
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <p class="text-sm text-[var(--text-body-strong)] font-medium">
                {{ $t('pages.admin.broadcastPage.includeAdminsLabel') }}
              </p>
              <p class="text-xs text-[var(--text-muted)]">
                {{ $t('pages.admin.broadcastPage.includeAdminsHint') }}
              </p>
            </div>
            <button type="button"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="includeAdmins ? 'bg-[rgb(var(--palette-blue-500))]' : 'bg-[rgb(var(--palette-white)/0.15)]'"
              @click="includeAdmins = !includeAdmins">
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out"
                :class="includeAdmins ? 'translate-x-5' : 'translate-x-0'" />
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button type="button" class="admin-btn admin-btn-primary w-full justify-center py-2.5 text-sm font-semibold"
          :disabled="!isFormValid || isSending" @click="handleSend">
          <Send class="w-4 h-4" />
          <span>{{ isSending ? $t('common.sending') : $t('pages.admin.broadcastPage.sendButton') }}</span>
        </button>

        <!-- Success message -->
        <div v-if="sendSuccess"
          class="flex items-center gap-3 rounded-[1.4rem] border border-[rgb(var(--palette-emerald-500)/0.3)] bg-[rgb(var(--palette-emerald-500)/0.1)] px-4 py-3">
          <CheckCircle class="w-5 h-5 text-[var(--text-success)] shrink-0" />
          <p class="text-sm text-[var(--text-success)]">
            {{ $t('pages.admin.broadcastPage.sendSuccess') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
