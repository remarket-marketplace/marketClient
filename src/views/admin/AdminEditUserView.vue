<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
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
const balance = ref('');
const rating = ref('');
const isBanned = ref(false);
const isActive = ref(true);
const role = ref<'user' | 'admin' | 'partner'>('user');
const hasFrozenBalance = ref(false);

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
      balance.value = userData.balance.toString();
      rating.value = userData.rating.toString();
      isBanned.value = userData.is_banned;
      isActive.value = userData.is_active;
      role.value = userData.role;
      hasFrozenBalance.value = userData.has_frozen_balance;
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

    const userData = {
      email: email.value,
      username: username.value,
      description: description.value,
      balance: balanceValue,
      rating: ratingValue,
      is_banned: isBanned.value,
      is_active: isActive.value,
      role: role.value,
      has_frozen_balance: hasFrozenBalance.value,
    };

    const success = await adminService.updateUserData(userId.value, userData);

    if (success === false) {
      errorMessage.value = t('pages.admin.editUser.errorSaving');
      return;
    }

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

onMounted(() => {
  loadUser();
});

watch(isBanned, (value) => {
  if (value) {
    isActive.value = false;
  }
});

watch(isActive, (value) => {
  if (value && isBanned.value) {
    isBanned.value = false;
  }
});
</script>

<template>
  <div class=" h-full w-full flex flex-col items-center overflow-scroll pb-36">
    <div class="max-w-md w-full border border-dark-700 rounded-2xl bg-background p-6 sm:p-8 backdrop-blur-md space-y-6">
      <div class="text-center">
        <h1 class="text-2xl sm:text-3xl text-mainText font-bold">
          {{ $t('pages.admin.editUser.title') }}
        </h1>
        <p class="text-text-secondary mt-2" v-if="user">
          {{ $t('pages.admin.editUser.editing') }}: {{ user.username }}
        </p>
      </div>

      <!-- Состояние загрузки -->
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-3 text-text-secondary">{{ $t('common.loading') }}</span>
      </div>

      <!-- Edit form -->
      <form v-else @submit.prevent="saveUser" class="space-y-4">

        <!-- Email -->
        <div>
          <label for="email" class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.email') }}
          </label>
          <TheInput id="email" v-model="email" type="email" :placeholder="$t('common.email')" required />
        </div>

        <!-- Username -->
        <div>
          <label for="username" class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.username') }}
          </label>
          <TheInput id="username" v-model="username" type="text" :placeholder="$t('common.username')" required
            :minlength="5" :maxlength="15" />
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.description') }}
          </label>
          <textarea id="description" v-model="description" :placeholder="$t('common.description')"
            class="w-full max-h-28 px-3 py-2 border border-dark-700 rounded-lg bg-dark-600 text-mainText placeholder-text-secondary focus:outline-none focus:border-blue-500 transition-colors resize-none"
            rows="3" :maxlength="500"></textarea>
          <div class="text-xs text-text-secondary mt-1 text-right">
            {{ description.length }}/500
          </div>
        </div>

        <!-- Avatar -->
        <div>
          <label class="mb-2 block text-sm text-text-secondary">
            {{ $t('pages.admin.editUser.avatarLabel') }}
          </label>
          <div class="mb-3 flex items-center gap-3 rounded-xl border border-dark-700 bg-dark-600/40 p-3">
            <img
              :src="avatarPreviewUrl"
              :alt="$t('pages.admin.editUser.avatarLabel')"
              class="h-14 w-14 rounded-full border border-dark-500 object-cover"
            />
            <div class="flex flex-col gap-2">
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
          </div>

          <FileUploader
            v-model="avatarFiles"
            :max-files="1"
            :label="$t('pages.admin.editUser.newAvatarLabel')"
          />

          <p v-if="removeAvatarAfterSave && avatarFiles.length === 0" class="mt-2 text-xs text-orange-300">
            {{ $t('pages.admin.editUser.avatarWillBeRemoved') }}
          </p>
        </div>

        <!-- Balance and rating  -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Balance -->
          <div>
            <label for="balance" class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.balance') }}
            </label>
            <TheInput id="balance" v-model="balance" type="text" inputmode="decimal"
              :placeholder="$t('common.balance')" />
          </div>

          <!-- Rating -->
          <div>
            <label for="rating" class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.rating') }}
            </label>
            <TheInput id="rating" v-model="rating" type="text" inputmode="numeric" :placeholder="$t('common.rating')" />
          </div>
        </div>

        <!-- Status and role -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Status -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.status') }}
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <Checkbox v-model="isBanned" />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.banned') }}
                </span>
              </label>
              <label class="flex items-center">
                <Checkbox v-model="isActive" />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.isActive') }}
                </span>
              </label>
              <label class="flex items-center">
                <Checkbox v-model="hasFrozenBalance" />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('pages.admin.editUser.frozenBalance') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Role -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.role') }}
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <RadioButton v-model="role" name="role" value="user">
                  <span class="text-sm text-mainText">
                    {{ $t('common.user') }}
                  </span>
                </RadioButton>
              </label>
              <label class="flex items-center">
                <RadioButton v-model="role" name="role" value="admin">
                  <span class="text-sm text-mainText">
                    {{ $t('common.admin') }}
                  </span>
                </RadioButton>
              </label>
              <label class="flex items-center">
                <RadioButton v-model="role" name="role" value="partner">
                  <span class="text-sm text-mainText">
                    {{ $t('common.partner') }}
                  </span>
                </RadioButton>
              </label>
            </div>
          </div>
        </div>

        <!-- Readonly info -->
        <div v-if="user" class="border-t border-dark-700 pt-4 space-y-2 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-text-secondary">{{ $t('common.memberSince') }}</span>
            <span class="text-mainText">{{ new Date(user.created_at).toLocaleDateString('ru-RU') }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-text-secondary">{{ $t('common.userId') }}:</span>
            <span class="text-mainText font-mono text-xs">{{ user.id }}</span>
          </div>
        </div>

        <ErrorBanner :message="errorMessage" />
        <SuccessMessage v-if="successMessage" :success-message="successMessage" />

        <!-- Action buttons -->
        <div class="flex gap-3 pt-4">
          <button type="button" @click="cancel"
            class="admin-btn flex-1"
            :disabled="isSaving">
            {{ $t('common.cancel') }}
          </button>
          <button type="submit" :disabled="isSaving"
            class="admin-btn admin-btn-primary flex-1">
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            {{ isSaving ? $t('common.loading') : $t('common.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
