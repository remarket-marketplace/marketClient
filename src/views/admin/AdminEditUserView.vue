<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import type { UserRead } from '@/validation/user/userRead';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TheInput from '@/components/TheInput.vue';
import { Icon } from '@iconify/vue';
import { authService } from '@/api/auth/AuthService';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const userId = ref<string>(route.params.id as string);
const user = ref<UserRead | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Редактируемые поля
const email = ref('');
const username = ref('');
const description = ref('');
const avatarUrl = ref('');
const balance = ref('');
const rating = ref('');
const isBanned = ref(false);
const isActive = ref(true);
const role = ref<'user' | 'admin'>('user');
const hasFrozenBalance = ref(false);

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
        avatarUrl.value = userData.avatar_url || '';
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
      avatar_url: avatarUrl.value,
      balance: balanceValue,
      rating: ratingValue,
      is_banned: isBanned.value,
      is_active: isActive.value,
      role: role.value,
      has_frozen_balance: hasFrozenBalance.value,
    };

    // Вызываем функцию обновления из adminService
    const success = await adminService.updateUserData(userId.value, userData);
    
    if (success !== false) {
      successMessage.value = t('common.saved');
      // Можно обновить локальные данные или перенаправить
      setTimeout(() => {
        router.push('/admin/users');
      }, 1500);
    } else {
      errorMessage.value = t('pages.admin.editUser.errorSaving');
    }
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

onMounted(() => {
  loadUser();
});
</script>

<template>
  <div class="h-full w-full flex items-center justify-center py-6 overflow-auto">
    <div class="max-w-md w-full border border-dark-700 rounded-2xl bg-background p-6 sm:p-8 backdrop-blur-md space-y-6">
      <!-- Заголовок -->
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
        <Icon icon="eos-icons:loading" class="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-3 text-text-secondary">{{ $t('common.loading') }}</span>
      </div>

      <!-- Форма редактирования -->
      <form v-else @submit.prevent="saveUser" class="space-y-4">
        <ErrorBanner :message="errorMessage" />
        
        <!-- Сообщение об успехе -->
        <div v-if="successMessage" class="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {{ successMessage }}
        </div>

        <!-- Email -->
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
          />
        </div>

        <!-- Username -->
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
            :minlength="5"
            :maxlength="15"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="mb-1 block text-sm text-text-secondary">
            {{ $t('common.description') }}
          </label>
          <textarea
            id="description"
            v-model="description"
            :placeholder="$t('common.description')"
            class="w-full px-3 py-2 border border-dark-700 rounded-lg bg-dark-600 text-mainText placeholder-text-secondary focus:outline-none focus:border-blue-500 transition-colors resize-none"
            rows="3"
            :maxlength="500"
          ></textarea>
          <div class="text-xs text-text-secondary mt-1 text-right">
            {{ description.length }}/500
          </div>
        </div>

        <!-- Avatar URL -->
        <div>
          <label for="avatarUrl" class="mb-1 block text-sm text-text-secondary">
            {{ $t('pages.admin.editUser.avatarUrl') }}
          </label>
          <TheInput
            id="avatarUrl"
            v-model="avatarUrl"
            type="text"
            :placeholder="$t('pages.admin.editUser.avatarUrlPlaceholder')"
          />
        </div>

        <!-- Баланс и рейтинг -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Баланс -->
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

          <!-- Рейтинг -->
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

        <!-- Статус и роль -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Статус активности -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.status') }}
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  v-model="isActive"
                  type="checkbox"
                  class="rounded border-dark-700 bg-dark-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-dark-600"
                  :true-value="true"
                  :false-value="false"
                />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.active') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="isBanned"
                  type="checkbox"
                  class="rounded border-dark-700 bg-dark-600 text-red-500 focus:ring-red-500 focus:ring-offset-dark-600"
                  :true-value="true"
                  :false-value="false"
                />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.banned') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="hasFrozenBalance"
                  type="checkbox"
                  class="rounded border-dark-700 bg-dark-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-dark-600"
                  :true-value="true"
                  :false-value="false"
                />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('pages.admin.editUser.frozenBalance') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Роль -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">
              {{ $t('common.role') }}
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  v-model="role"
                  type="radio"
                  value="user"
                  class="rounded-full border-dark-700 bg-dark-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-dark-600"
                />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.user') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="role"
                  type="radio"
                  value="admin"
                  class="rounded-full border-dark-700 bg-dark-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-dark-600"
                />
                <span class="ml-2 text-sm text-mainText">
                  {{ $t('common.admin') }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Информация только для чтения -->
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

        <!-- Кнопки действий -->
        <div class="flex gap-3 pt-4">
            <button
                type="button"
                @click="cancel"
                class="flex-1 px-4 py-2 border border-dark-700 rounded-lg text-mainText hover:bg-dark-600 transition-colors"
                :disabled="isSaving"
            >
                {{ $t('common.cancel') }}
            </button>
            <button
                type="submit"
                :disabled="isSaving"
                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                <Icon 
                v-if="isSaving" 
                icon="eos-icons:loading" 
                class="h-4 w-4 animate-spin" 
                />
                {{ isSaving ? $t('common.saving') : $t('common.save') }}
            </button>
            </div>
      </form>
    </div>
  </div>
</template>