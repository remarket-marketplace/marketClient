<script setup lang="ts">
import { adminService, type AdminUpdateUserPayload } from '@/api/admin/AdminService';
import type { UserRead } from '@/validation/user/userRead';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TheInput from '@/components/TheInput.vue';
import { Loader2 } from 'lucide-vue-next';
import SuccessMessage from '@/components/SuccessMessage.vue'
import Checkbox from '@/components/Checkbox.vue';
import RadioButton from '@/components/RadioButton.vue';
import FileUploader from '@/components/FileUploader.vue';
import { useImages } from '@/composables/useImages';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const API_HOST = import.meta.env.VITE_API_HOST || '';
const { images } = useImages()

const userId = ref<string>(route.params.id as string);
const user = ref<UserRead | null>(null);
const isLoading = ref<boolean>(true);
const isSaving = ref<boolean>(false);
const errorMessage = ref('');
const successMessage = ref('');

// Редактируемые поля
const email = ref('');
const username = ref('');
const description = ref('');
const currentAvatarUrl = ref('');
const removeAvatarAfterSave = ref(false);
const avatarFiles = ref<File[]>([]);
const currentProfileBackgroundUrl = ref('');
const removeProfileBackgroundAfterSave = ref(false);
const profileBackgroundFiles = ref<File[]>([]);
const balance = ref('');
const rating = ref('');
const isBanned = ref(false);
const role = ref<'user' | 'admin' | 'partner'>('user');
const hasFrozenBalance = ref(false);
const nicknameStyleId = ref('default');
const profileBackgroundUnlocked = ref(false);
const twoFactorEnabled = ref(false);
const newPassword = ref('');
const confirmNewPassword = ref('');

const hasCurrentAvatar = computed(() => Boolean(currentAvatarUrl.value) && !removeAvatarAfterSave.value)
const avatarPreviewUrl = computed(() => {
  if (!hasCurrentAvatar.value) {
    return images.avatars.default
  }
  if (
    currentAvatarUrl.value.startsWith('http://')
    || currentAvatarUrl.value.startsWith('https://')
  ) {
    return currentAvatarUrl.value
  }
  return `${API_HOST}${currentAvatarUrl.value}`
})
const hasCurrentProfileBackground = computed(
  () => Boolean(currentProfileBackgroundUrl.value) && !removeProfileBackgroundAfterSave.value,
)
const profileBackgroundPreviewStyle = computed(() => {
  if (!hasCurrentProfileBackground.value) return {}
  const rawUrl = currentProfileBackgroundUrl.value
  const resolvedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `${API_HOST}${rawUrl}`
  return {
    backgroundImage: `url(${resolvedUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as Record<string, string>
})

// Заглушка для получения пользователя
async function fetchUser(userId: string): Promise<UserRead | false> {
  return await adminService.getUserById(userId)
}

async function loadUser() {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    const userData = await fetchUser(userId.value);

    if (userData !== false) {
      user.value = userData;

      email.value = userData.email;
      username.value = userData.username;
      description.value = userData.description || '';
      currentAvatarUrl.value = userData.avatar_url || '';
      removeAvatarAfterSave.value = false;
      avatarFiles.value = [];
      currentProfileBackgroundUrl.value = userData.profile_background_url || '';
      removeProfileBackgroundAfterSave.value = false;
      profileBackgroundFiles.value = [];
      balance.value = userData.balance.toString();
      rating.value = userData.rating.toString();
      isBanned.value = userData.is_banned;
      role.value = userData.role;
      hasFrozenBalance.value = userData.has_frozen_balance;
      nicknameStyleId.value = userData.nickname_style_id || 'default';
      profileBackgroundUnlocked.value = userData.profile_background_unlocked || false;
      twoFactorEnabled.value = userData.two_factor_enabled || false;
      newPassword.value = '';
      confirmNewPassword.value = '';
    }
  } catch (error) {
    console.error('Error loading user:', error);
    errorMessage.value = t('pages.admin.editUser.errorLoading');
  } finally {
    isLoading.value = false;
  }
}

async function saveUser() {
  try {
    isSaving.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    const normalizedEmail = email.value.trim();
    const normalizedUsername = username.value.trim();
    email.value = normalizedEmail;
    username.value = normalizedUsername;

    if (normalizedUsername.length < 4 || normalizedUsername.length > 32) {
      errorMessage.value = t('pages.auth.signUp.usernameLengthError');
      return;
    }

    if (!/^[A-Za-z0-9_]+$/.test(normalizedUsername)) {
      errorMessage.value = t('pages.auth.signUp.usernameCharsError');
      return;
    }

    if (normalizedEmail.length > 64) {
      errorMessage.value = t('pages.auth.signUp.emailLengthError');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      errorMessage.value = t('pages.auth.signUp.invalidEmail');
      return;
    }

    const balanceValue = parseFloat(balance.value);
    const ratingValue = parseInt(rating.value);

    if (isNaN(balanceValue) || balanceValue < 0) {
      errorMessage.value = t('pages.admin.editUser.balanceNegativeError');
      return;
    }

    if (isNaN(ratingValue) || ratingValue < 0) {
      errorMessage.value = t('pages.admin.editUser.ratingNegativeError');
      return;
    }

    if (!Number.isInteger(ratingValue)) {
      errorMessage.value = t('pages.admin.editUser.ratingIntegerError');
      return;
    }

    const normalizedNicknameStyleId = nicknameStyleId.value.trim() || 'default';
    if (normalizedNicknameStyleId.length > 64) {
      errorMessage.value = t('pages.admin.editUser.nicknameStyleIdTooLong');
      return;
    }

    const hasPasswordInput = newPassword.value.length > 0 || confirmNewPassword.value.length > 0;
    if (hasPasswordInput) {
      if (!newPassword.value || !confirmNewPassword.value) {
        errorMessage.value = t('pages.admin.editUser.passwordFieldsRequired');
        return;
      }
      if (newPassword.value !== confirmNewPassword.value) {
        errorMessage.value = t('pages.admin.editUser.passwordsDoNotMatch');
        return;
      }
      if (newPassword.value.length < 8) {
        errorMessage.value = t('pages.auth.signUp.passwordLengthError');
        return;
      }
    }

    const userData: AdminUpdateUserPayload = {
      email: email.value,
      username: username.value,
      description: description.value,
      balance: balanceValue,
      rating: ratingValue,
      is_banned: isBanned.value,
      role: role.value,
      has_frozen_balance: hasFrozenBalance.value,
      nickname_style_id: normalizedNicknameStyleId,
      profile_background_unlocked: profileBackgroundUnlocked.value,
      two_factor_enabled: twoFactorEnabled.value,
    };

    if (hasPasswordInput && newPassword.value) {
      userData.new_password = newPassword.value;
    }

    const updateResponse = await adminService.updateUserData(userId.value, userData);

    if (updateResponse === false) {
      errorMessage.value = t('pages.admin.editUser.errorSaving');
      return;
    }

    user.value = updateResponse;
    email.value = updateResponse.email;
    username.value = updateResponse.username;
    description.value = updateResponse.description || '';
    balance.value = updateResponse.balance.toString();
    rating.value = updateResponse.rating.toString();
    isBanned.value = updateResponse.is_banned;
    role.value = updateResponse.role;
    hasFrozenBalance.value = updateResponse.has_frozen_balance;
    nicknameStyleId.value = updateResponse.nickname_style_id || 'default';
    profileBackgroundUnlocked.value = updateResponse.profile_background_unlocked || false;
    currentProfileBackgroundUrl.value = updateResponse.profile_background_url || '';
    twoFactorEnabled.value = updateResponse.two_factor_enabled || false;
    newPassword.value = '';
    confirmNewPassword.value = '';

    if (avatarFiles.value.length > 0) {
      const avatarResponse = await adminService.uploadUserAvatar(userId.value, avatarFiles.value[0]!)
      if (avatarResponse === false) {
        errorMessage.value = t('pages.admin.editUser.errorSaving');
        return;
      }
      currentAvatarUrl.value = avatarResponse.avatar_url || ''
      removeAvatarAfterSave.value = false
      avatarFiles.value = []
    } else if (removeAvatarAfterSave.value && currentAvatarUrl.value) {
      const avatarResponse = await adminService.deleteUserAvatar(userId.value)
      if (avatarResponse === false) {
        errorMessage.value = t('pages.admin.editUser.errorSaving');
        return;
      }
      currentAvatarUrl.value = avatarResponse.avatar_url || ''
      removeAvatarAfterSave.value = false
    }

    if (profileBackgroundFiles.value.length > 0) {
      const backgroundResponse = await adminService.uploadUserProfileBackground(
        userId.value,
        profileBackgroundFiles.value[0]!,
      )
      if (backgroundResponse === false) {
        errorMessage.value = t('pages.admin.editUser.errorSaving');
        return;
      }
      currentProfileBackgroundUrl.value = backgroundResponse.profile_background_url || ''
      profileBackgroundUnlocked.value = backgroundResponse.profile_background_unlocked || false
      removeProfileBackgroundAfterSave.value = false
      profileBackgroundFiles.value = []
    } else if (removeProfileBackgroundAfterSave.value && currentProfileBackgroundUrl.value) {
      const backgroundResponse = await adminService.deleteUserProfileBackground(userId.value)
      if (backgroundResponse === false) {
        errorMessage.value = t('pages.admin.editUser.errorSaving');
        return;
      }
      currentProfileBackgroundUrl.value = backgroundResponse.profile_background_url || ''
      profileBackgroundUnlocked.value = backgroundResponse.profile_background_unlocked || false
      removeProfileBackgroundAfterSave.value = false
    }

    successMessage.value = t('common.saved');

    setTimeout(() => {
      router.push('/admin/users');
    }, 1000);
  } catch (error) {
    console.error('Error saving user:', error);
    errorMessage.value = t('pages.admin.editUser.errorSaving');
  } finally {
    isSaving.value = false;
  }
}


function cancel() {
  router.push('/admin/users');
}

function markAvatarForDelete() {
  if (!currentAvatarUrl.value) return
  removeAvatarAfterSave.value = true
  avatarFiles.value = []
}

function cancelAvatarDelete() {
  removeAvatarAfterSave.value = false
}

function markProfileBackgroundForDelete() {
  if (!currentProfileBackgroundUrl.value) return
  removeProfileBackgroundAfterSave.value = true
  profileBackgroundFiles.value = []
}

function cancelProfileBackgroundDelete() {
  removeProfileBackgroundAfterSave.value = false
}

onMounted(() => {
  loadUser();
});

watch(profileBackgroundUnlocked, (value) => {
  if (!value) {
    removeProfileBackgroundAfterSave.value = true
    profileBackgroundFiles.value = []
  }
});
</script>

<template>
  <div class="h-full w-full overflow-y-auto pb-20 pt-3 md:pt-4">
    <div class="w-full px-1 sm:px-2">
      <div class="p-3 sm:p-5 lg:p-6 space-y-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-mainText">
              {{ $t('pages.admin.editUser.title') }}
            </h1>
            <p v-if="user" class="mt-2 text-sm text-text-secondary">
              {{ $t('pages.admin.editUser.editing') }}: <span class="text-mainText font-semibold">{{ user.username }}</span>
            </p>
          </div>
          <button
            type="button"
            class="admin-btn admin-btn-ghost self-start sm:self-auto"
            :disabled="isSaving"
            @click="cancel"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>

        <div v-if="isLoading" class="flex h-40 items-center justify-center rounded-xl bg-dark-600/25">
          <Loader2 class="h-7 w-7 animate-spin text-blue-400" />
          <span class="ml-3 text-text-secondary">{{ $t('common.loading') }}</span>
        </div>

        <form v-else class="space-y-8" @submit.prevent="saveUser">
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-[300px,1fr]">
            <section class="space-y-4">
              <h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                {{ $t('pages.admin.editUser.avatarLabel') }}
              </h2>
              <div class="flex items-center gap-3">
                <img
                  :src="avatarPreviewUrl"
                  :alt="$t('pages.admin.editUser.avatarLabel')"
                  class="h-16 w-16 rounded-full border border-dark-500 object-cover"
                />
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-mainText">{{ username || '-' }}</p>
                  <p class="mt-1 truncate text-xs text-text-secondary">{{ email || '-' }}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="admin-btn admin-btn-danger admin-btn-xs"
                  :disabled="!hasCurrentAvatar"
                  @click="markAvatarForDelete"
                >
                  {{ $t('pages.admin.editUser.removeAvatar') }}
                </button>
                <button
                  v-if="removeAvatarAfterSave && currentAvatarUrl"
                  type="button"
                  class="admin-btn admin-btn-ghost admin-btn-xs"
                  @click="cancelAvatarDelete"
                >
                  {{ $t('common.cancel') }}
                </button>
              </div>
              <FileUploader
                v-model="avatarFiles"
                :max-files="1"
                :label="$t('pages.admin.editUser.newAvatarLabel')"
              />
              <p v-if="removeAvatarAfterSave && avatarFiles.length === 0" class="text-xs text-orange-300">
                {{ $t('pages.admin.editUser.avatarWillBeRemoved') }}
              </p>

              <div v-if="user" class="pt-2 text-sm space-y-2 border-t border-dark-700/70">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-text-secondary">{{ $t('common.memberSince') }}</span>
                  <span class="text-mainText">{{ new Date(user.created_at).toLocaleDateString('ru-RU') }}</span>
                </div>
                <div class="space-y-1">
                  <span class="text-text-secondary">{{ $t('common.userId') }}</span>
                  <p class="break-all font-mono text-xs text-mainText">{{ user.id }}</p>
                </div>
              </div>
            </section>

            <section class="space-y-8">
              <div class="space-y-4">
                <h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                  {{ $t('common.account') }}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="email" class="mb-1 block text-sm text-text-secondary">
                      {{ $t('common.email') }}
                    </label>
                    <TheInput
                      id="email"
                      v-model="email"
                      type="email"
                      :placeholder="$t('common.email')"
                      required
                      :maxlength="64"
                    />
                  </div>
                  <div>
                    <label for="username" class="mb-1 block text-sm text-text-secondary">
                      {{ $t('common.username') }}
                    </label>
                    <TheInput
                      id="username"
                      v-model="username"
                      type="text"
                      :placeholder="$t('common.username')"
                      required
                      :minlength="4"
                      :maxlength="32"
                    />
                  </div>
                </div>
                <div>
                  <label for="description" class="mb-1 block text-sm text-text-secondary">
                    {{ $t('common.description') }}
                  </label>
                  <textarea
                    id="description"
                    v-model="description"
                    :placeholder="$t('common.description')"
                    class="w-full max-h-32 px-3 py-2 rounded-lg bg-dark-600 text-mainText placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/70 transition-colors resize-none"
                    rows="4"
                    :maxlength="500"
                  />
                  <div class="mt-1 text-right text-xs text-text-secondary">
                    {{ description.length }}/500
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                  {{ $t('common.settings') }}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="balance" class="mb-1 block text-sm text-text-secondary">
                      {{ $t('common.balance') }}
                    </label>
                    <TheInput
                      id="balance"
                      v-model="balance"
                      type="text"
                      inputmode="decimal"
                      :placeholder="$t('common.balance')"
                    />
                  </div>
                  <div>
                    <label for="rating" class="mb-1 block text-sm text-text-secondary">
                      {{ $t('common.rating') }}
                    </label>
                    <TheInput
                      id="rating"
                      v-model="rating"
                      type="text"
                      inputmode="numeric"
                      :placeholder="$t('common.rating')"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <p class="text-sm text-text-secondary">{{ $t('common.status') }}</p>
                    <label class="flex items-center gap-2 py-1">
                      <Checkbox v-model="isBanned" />
                      <span class="text-sm text-mainText">{{ $t('common.banned') }}</span>
                    </label>
                    <div class="flex items-center gap-2 py-1">
                      <span class="text-sm text-text-secondary">{{ $t('common.status') }}:</span>
                      <span
                        class="inline-flex rounded-full border px-2 py-1 text-xs font-medium"
                        :class="user?.is_active
                          ? 'border-green-500/30 bg-green-500/15 text-green-400'
                          : 'border-gray-500/30 bg-gray-500/15 text-gray-400'"
                      >
                        {{ user?.is_active ? $t('common.online') : $t('common.offline') }}
                      </span>
                    </div>
                    <label class="flex items-center gap-2 py-1">
                      <Checkbox v-model="hasFrozenBalance" />
                      <span class="text-sm text-mainText">{{ $t('pages.admin.editUser.frozenBalance') }}</span>
                    </label>
                  </div>

                  <div class="space-y-2">
                    <p class="text-sm text-text-secondary">{{ $t('common.role') }}</p>
                    <label class="flex items-center py-1">
                      <RadioButton v-model="role" name="role" value="user">
                        <span class="text-sm text-mainText">{{ $t('common.user') }}</span>
                      </RadioButton>
                    </label>
                    <label class="flex items-center py-1">
                      <RadioButton v-model="role" name="role" value="admin">
                        <span class="text-sm text-mainText">{{ $t('common.admin') }}</span>
                      </RadioButton>
                    </label>
                    <label class="flex items-center py-1">
                      <RadioButton v-model="role" name="role" value="partner">
                        <span class="text-sm text-mainText">{{ $t('common.partner') }}</span>
                      </RadioButton>
                    </label>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                  {{ $t('pages.admin.editUser.securityTitle') }}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label class="flex items-center gap-2 py-1">
                    <Checkbox v-model="twoFactorEnabled" />
                    <span class="text-sm text-mainText">{{ $t('pages.admin.editUser.twoFactorEnabled') }}</span>
                  </label>
                  <label class="flex items-center gap-2 py-1">
                    <Checkbox v-model="profileBackgroundUnlocked" />
                    <span class="text-sm text-mainText">{{ $t('pages.admin.editUser.backgroundUnlocked') }}</span>
                  </label>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="nicknameStyleId" class="mb-1 block text-sm text-text-secondary">
                      {{ $t('pages.admin.editUser.nicknameStyleId') }}
                    </label>
                    <TheInput
                      id="nicknameStyleId"
                      v-model="nicknameStyleId"
                      type="text"
                      :maxlength="64"
                      :placeholder="$t('pages.admin.editUser.nicknameStyleIdPlaceholder')"
                    />
                    <button
                      type="button"
                      class="mt-2 admin-btn admin-btn-ghost admin-btn-xs"
                      @click="nicknameStyleId = 'default'"
                    >
                      {{ $t('pages.admin.editUser.resetNicknameStyle') }}
                    </button>
                  </div>
                  <div class="space-y-2">
                    <p class="text-sm text-text-secondary">
                      {{ $t('pages.admin.editUser.backgroundPreview') }}
                    </p>
                    <div
                      class="h-20 rounded-lg border border-dark-700 bg-dark-700/35"
                      :style="profileBackgroundPreviewStyle"
                    />
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="admin-btn admin-btn-danger admin-btn-xs"
                        :disabled="!hasCurrentProfileBackground"
                        @click="markProfileBackgroundForDelete"
                      >
                        {{ $t('pages.admin.editUser.removeBackground') }}
                      </button>
                      <button
                        v-if="removeProfileBackgroundAfterSave && currentProfileBackgroundUrl"
                        type="button"
                        class="admin-btn admin-btn-ghost admin-btn-xs"
                        @click="cancelProfileBackgroundDelete"
                      >
                        {{ $t('common.cancel') }}
                      </button>
                    </div>
                    <FileUploader
                      v-model="profileBackgroundFiles"
                      :max-files="1"
                      :label="$t('pages.admin.editUser.newBackgroundLabel')"
                    />
                    <p
                      v-if="removeProfileBackgroundAfterSave && profileBackgroundFiles.length === 0"
                      class="text-xs text-orange-300"
                    >
                      {{ $t('pages.admin.editUser.backgroundWillBeRemoved') }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h2 class="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                  {{ $t('pages.admin.editUser.passwordResetTitle') }}
                </h2>
                <p class="text-xs text-text-secondary">
                  {{ $t('pages.admin.editUser.passwordResetHint') }}
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TheInput
                    id="newPassword"
                    v-model="newPassword"
                    type="password"
                    :placeholder="$t('pages.admin.editUser.newPasswordPlaceholder')"
                    autocomplete="new-password"
                  />
                  <TheInput
                    id="confirmNewPassword"
                    v-model="confirmNewPassword"
                    type="password"
                    :placeholder="$t('pages.admin.editUser.confirmNewPasswordPlaceholder')"
                    autocomplete="new-password"
                  />
                </div>
              </div>
            </section>
          </div>

          <ErrorBanner :message="errorMessage" />
          <SuccessMessage v-if="successMessage" :success-message="successMessage" />

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
            <button
              type="button"
              class="admin-btn min-w-32"
              :disabled="isSaving"
              @click="cancel"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="admin-btn admin-btn-primary min-w-40 inline-flex items-center justify-center gap-2"
              :disabled="isSaving"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              {{ isSaving ? $t('common.loading') : $t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
