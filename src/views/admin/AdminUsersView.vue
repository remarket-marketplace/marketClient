<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import type { UserRead } from '@/validation/user/userRead';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useImages } from '@/composables/useImages';
import SearchField from '@/components/SearchField.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
const users = ref<UserRead[]>([]);
const isLoading = ref(true);
const API_HOST = import.meta.env.VITE_API_HOST

const searchFieldValue = ref<string>('')

const { images } = useImages()

async function loadUsersList() {
  try {
    const data = await adminService.getAllUsers();
    users.value = data;
  } catch (error) {
    console.error('Error loading users:', error);
  } finally {
    isLoading.value = false;
  }
}

async function searchUsers(query: string) {
    if (query === '') {
        const data = await adminService.getAllUsers();
        users.value = data;
    } else {
        const data = await adminService.SearchUsers(query);
        users.value = data;
    }
}

onMounted(async () => {
    await loadUsersList()
});

function navigateToProfile(username: string) {
  router.push(`/profile/${username}`);
}

function getStatusBadge(user: UserRead) {
  if (user.is_banned) {
    return { text: 'common.banned', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
  if (!user.is_active) {
    return { text: 'pages.admin.usersPage.notActive', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  }
  return { text: 'common.active', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
}

function getRoleBadge(user: UserRead) {
  return user.role === 'admin' 
    ? { text: 'common.admin', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
    : { text: 'common.user', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
}

async function banUser(userId: string) {
    const response = await adminService.banUser(userId)
    if (response) {
        await loadUsersList()
    }
}
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-hidden">
    <!-- Заголовок -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h1 class="text-xl sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.usersPage.title') }}</h1>
      <div class="text-sm sm:text-base text-text-secondary">
        {{ $t('common.total') }} {{ users.length }}
      </div>
    </div>

    <SearchField
        :model-value="searchFieldValue"
        :placeholder="$t('common.search')"
        @search-change="searchUsers"
    ></SearchField>

    <!-- Список пользователей -->
    <div class="flex-1 overflow-hidden">

      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Icon icon="eos-icons:loading" class="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 sm:ml-3 text-base sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else class="h-full overflow-y-auto no-scrollbar space-y-3 pr-1 sm:pr-2">
        <!-- Карточка пользователя -->
        <div
          v-for="user in users"
          :key="user.id"
          class="bg-dark-600 border border-dark-700 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-dark-500 transition-all duration-200"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div class="flex items-center gap-3 sm:gap-4">
              <div class="flex-shrink-0">
                <div class="relative">
                  <img
                    :src="user.avatar_url ? `${API_HOST}${user.avatar_url}` : images.avatars.default"
                    :alt="user.username"
                    class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-dark-400"
                    @error="(e: any) => e.target.src = images.avatars.default"
                  />
                  <div
                    class="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-dark-600"
                    :class="user.is_active && !user.is_banned ? 'bg-green-500' : 'bg-gray-500'"
                  />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-col gap-1 sm:gap-2">
                  <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <h3 class="text-base sm:text-lg font-semibold text-mainText truncate">
                      {{ user.username }}
                    </h3>
                    <div class="flex gap-1 sm:gap-2 flex-wrap">
                      <span
                        class="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium border"
                        :class="getStatusBadge(user).class"
                      >
                        {{ $t(getStatusBadge(user).text) }}
                      </span>
                      <span
                        class="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium border"
                        :class="getRoleBadge(user).class"
                      >
                        {{ $t(getRoleBadge(user).text) }}
                      </span>
                    </div>
                  </div>

                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-text-secondary">
                    <div class="flex items-center gap-1">
                      <Icon icon="mdi:email-outline" class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span class="truncate text-xs">{{ user.email }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <Icon icon="mdi:currency-usd" class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span :class="user.has_frozen_balance ? 'text-orange-400' : 'text-green-400'">
                        {{ user.balance }}
                        <span v-if="user.has_frozen_balance" class="text-orange-300 text-xs">{{ $t('pages.admin.usersPage.freezedBalance') }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-shrink-0 flex gap-2 justify-end sm:justify-start">
              <button
                @click="navigateToProfile(user.username)"
                class="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm flex-1 sm:flex-none justify-center"
              >
                <Icon icon="mdi:eye-outline" class="w-3 h-3 sm:w-4 sm:h-4" />
                <span class="">{{ $t("pages.admin.usersPage.profile") }}</span>
              </button>
              
              <button
                v-if="!user.is_banned && user.role != 'admin'"
                @click="banUser(user.id)"
                class="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs sm:text-sm flex-1 sm:flex-none justify-center"
              >
                <Icon icon="mdi:block-helper" class="w-3 h-3 sm:w-4 sm:h-4" />
                <span class="">{{ $t("pages.admin.usersPage.ban") }}</span>
              </button>
            </div>
          </div>

          <div class="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-dark-700 text-xs text-text-secondary">
            <div class="flex flex-col xs:flex-row gap-1 xs:gap-2 sm:gap-4">
              <div>{{ $t('common.memberSince') }} {{ new Date(user.created_at).toLocaleDateString('ru-RU') }}</div>
              <div v-if="user.description" class="truncate flex-1 hidden sm:block">
                {{ $t('common.description') }} {{ user.description }}
              </div>
              <div class="flex items-center gap-1 sm:hidden">
                <Icon icon="mdi:star-outline" class="w-3 h-3" />
                <span>{{ $t('common.rating') }} {{ user.rating }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Стили для скроллбара */
::-webkit-scrollbar {
  width: 3px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

/* Медиа-запрос для очень маленьких экранов */
@media (max-width: 360px) {
  .text-xs {
    font-size: 0.7rem;
  }
}
</style>