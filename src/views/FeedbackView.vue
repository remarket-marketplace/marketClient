<script setup lang="ts">
import { feedbackService } from "@/api/feedback/FeedbackService";
import ErrorBanner from "@/components/ErrorBanner.vue";
import FileUploader from "@/components/FileUploader.vue";
import SuccessMessage from "@/components/SuccessMessage.vue";
import BackButton from "@/components/navigation/BackButton.vue";
import Captcha from "@/components/Captcha.vue";
import { MessageSquareText, ImagePlus, Lightbulb, SendHorizontal } from "lucide-vue-next";
import { computed, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

const FEEDBACK_LIMITS = {
  text: { min: 10, max: 2000 },
  images: { max: 10 },
};

const feedbackText = ref("");
const feedbackImages = ref<File[]>([]);
const captchaToken = ref("");
const isSending = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const redirectTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);

onUnmounted(() => {
  if (redirectTimeoutId.value) {
    clearTimeout(redirectTimeoutId.value);
    redirectTimeoutId.value = null;
  }
});

const isFormValid = computed(() => {
  const normalized = feedbackText.value.trim();
  return (
    normalized.length >= FEEDBACK_LIMITS.text.min &&
    normalized.length <= FEEDBACK_LIMITS.text.max &&
    feedbackImages.value.length <= FEEDBACK_LIMITS.images.max
  );
});

async function submitFeedback() {
  errorMessage.value = "";
  successMessage.value = "";

  const normalized = feedbackText.value.trim();
  if (normalized.length < FEEDBACK_LIMITS.text.min) {
    errorMessage.value = t("pages.feedback.textMinError", {
      min: FEEDBACK_LIMITS.text.min,
    });
    return;
  }

  if (feedbackImages.value.length > FEEDBACK_LIMITS.images.max) {
    errorMessage.value = t("pages.feedback.imagesMaxError", {
      max: FEEDBACK_LIMITS.images.max,
    });
    return;
  }

  if (!captchaToken.value) {
    errorMessage.value = t("pages.auth.signIn.completeCaptcha");
    return;
  }

  isSending.value = true;

  try {
    const result = await feedbackService.sendFeedback(
      normalized,
      captchaToken.value,
      feedbackImages.value
    );

    if (!result.success) {
      errorMessage.value = result.errorMessage || t("pages.feedback.sendError");
      return;
    }

    successMessage.value = t("pages.feedback.sendSuccess");
    feedbackText.value = "";
    feedbackImages.value = [];
    captchaToken.value = "";

    if (redirectTimeoutId.value) {
      clearTimeout(redirectTimeoutId.value);
    }

    redirectTimeoutId.value = setTimeout(() => {
      if (window.history.length > 1) {
        router.back();
        return;
      }
      router.push("/");
    }, 1000);
  } catch {
    errorMessage.value = t("pages.feedback.sendError");
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <div class="w-full h-full overflow-y-auto no-scrollbar pb-20 md:pb-6">
    <div class="mb-6 lg:hidden px-4 pt-4">
      <div class="flex gap-2">
        <BackButton />
        <h1 class="text-2xl font-bold text-[var(--text-title)]">
          {{ $t("pages.feedback.title") }}
        </h1>
      </div>
      <p class="mt-2 text-sm text-[var(--text-muted)]">
        {{ $t("pages.feedback.subtitle") }}
      </p>
    </div>

    <div class="mx-auto w-full max-w-4xl px-4 lg:px-0 lg:pt-6 pb-6">
      <form class="space-y-6" @submit.prevent="submitFeedback">
        <div class="hidden lg:block">
          <div class="flex gap-2">
            <BackButton />
            <h1 class="text-2xl font-bold text-[var(--text-title)]">
              {{ $t("pages.feedback.title") }}
            </h1>
          </div>
          <p class="mt-2 text-sm text-[var(--text-muted)]">
            {{ $t("pages.feedback.subtitle") }}
          </p>
        </div>

        <div class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.4)] p-5 space-y-3">
          <div class="flex items-center gap-2">
            <MessageSquareText class="w-4 h-4 text-[var(--text-link)]" />
            <label for="feedback-text" class="text-sm font-medium text-[var(--text-body)]">
              {{ $t("pages.feedback.descriptionLabel") }}
              <span class="text-xs text-[var(--text-danger)] ml-1">*</span>
            </label>
          </div>
          <textarea
            id="feedback-text"
            v-model="feedbackText"
            rows="10"
            :maxlength="FEEDBACK_LIMITS.text.max"
            :minlength="FEEDBACK_LIMITS.text.min"
            :placeholder="$t('pages.feedback.descriptionPlaceholder')"
            class="w-full rounded-lg bg-[rgb(var(--palette-dark-600))] border border-[rgb(var(--palette-dark-700))] px-4 py-3 text-sm outline-none text-[var(--text-title)] placeholder-[var(--text-placeholder)] resize-none"
          ></textarea>
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--text-meta)]">
              {{ $t("pages.feedback.textHint", { min: FEEDBACK_LIMITS.text.min }) }}
            </span>
            <span class="text-[var(--text-muted)]">
              {{ feedbackText.length }}/{{ FEEDBACK_LIMITS.text.max }}
            </span>
          </div>
        </div>

        <div class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.4)] p-5 space-y-3">
          <div class="flex items-center gap-2 text-sm text-[var(--text-body)]">
            <ImagePlus class="w-4 h-4 text-[var(--text-link)]" />
            <span>{{ $t("pages.feedback.imagesLabel") }}</span>
          </div>
          <FileUploader
            v-model="feedbackImages"
            :max-files="FEEDBACK_LIMITS.images.max"
            :hint="$t('pages.feedback.imagesHint', { max: FEEDBACK_LIMITS.images.max })"
          />
        </div>

        <div class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.4)] p-5 space-y-4">
          <h3 class="text-sm font-semibold text-[var(--text-title)] flex items-center gap-2">
            <Lightbulb class="w-4 h-4 text-[var(--text-link)]" />
            {{ $t("pages.feedback.tipsTitle") }}
          </h3>

          <div class="space-y-3 text-sm text-[var(--text-body)]">
            <p>{{ $t("pages.feedback.tipOne") }}</p>
            <p>{{ $t("pages.feedback.tipTwo") }}</p>
            <p>{{ $t("pages.feedback.tipThree") }}</p>
          </div>
        </div>

        <SuccessMessage
          v-if="successMessage"
          :success-message="successMessage"
        />
        <ErrorBanner
          v-if="errorMessage"
          :message="errorMessage"
        />

        <div class="rounded-xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.4)] p-5">
          <Captcha @verified="(token: string) => captchaToken = token" />
        </div>

        <div class="space-y-3">
          <button
            type="submit"
            :disabled="isSending || !isFormValid"
            class="market-btn w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
            :class="isSending || !isFormValid
              ? 'bg-[rgb(var(--palette-dark-600))] text-[var(--text-muted)] border border-[rgb(var(--palette-dark-700))]'
              : 'market-btn-primary text-mainText'"
          >
            <span class="inline-flex items-center justify-center gap-2">
              <SendHorizontal class="w-4 h-4" />
              {{ isSending ? $t("pages.feedback.sending") : $t("pages.feedback.submit") }}
            </span>
          </button>

          <p class="text-xs text-[var(--text-meta)] leading-relaxed">
            {{ $t("pages.feedback.footerHint") }}
          </p>
        </div>
      </form>
    </div>
  </div>
</template>
