<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import type { UserRead } from '@/validation/user/userRead';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Eye, 
  Mail, 
  Star,
  MoreVertical,
  Edit,
  Ban,
  UserCheck,
  Loader2,
  SlidersHorizontal,
} from 'lucide-vue-next';
import SearchField from '@/components/SearchField.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import ConfirmWindow from '@/components/ConfirmWindow.vue';
import { useI18n } from 'vue-i18n';
import BackButton from '@/components/navigation/BackButton.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { formatCurrencyAmount } from '@/utils/currency';

const { t } = useI18n();
const router = useRouter();
const users = ref<UserRead[]>([]);
const isLoading = ref(true);

const searchQuery = ref('')
const sortBy = ref('created_desc')
const statusFilter = ref('all')
const roleFilter = ref('all')
const isMobileFiltersOpen = ref(false)
const dropdownOpenId = ref<string | null>(null); // Для отслеживания открытого dropdown
const confirmWindowOpen = ref(false)
const userToBan = ref<string | null>(null)
const userActionType = ref<'ban' | 'unban'>('ban')
const isBanning = ref(false)
const selectedBanReasonCode = ref('fraud')
const customBanReason = ref('')
const banReasonError = ref('')

const listRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
const pageSize = 20
const visibleCount = ref(pageSize)
let observer: IntersectionObserver | null = null

async function loadUsersList() {
  try {
    const data = await adminService.getAllUsers();
    users.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading users:', error);
  } finally {
    isLoading.value = false;
  }
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesQuery = normalizedQuery.value
      ? [
          user.username,
          user.email,
          user.id,
          user.description ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery.value)
      : true

    const matchesStatus =
      statusFilter.value === 'all'
        ? true
        : statusFilter.value === 'online'
          ? user.is_active && !user.is_banned
          : statusFilter.value === 'offline'
            ? !user.is_active && !user.is_banned
            : user.is_banned

    const matchesRole =
      roleFilter.value === 'all' ? true : user.role === roleFilter.value

    return matchesQuery && matchesStatus && matchesRole
  })
})

const sortedUsers = computed(() => {
  const data = [...filteredUsers.value]
  switch (sortBy.value) {
    case 'created_asc':
      return data.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    case 'balance_desc':
      return data.sort((a, b) => b.balance - a.balance)
    case 'balance_asc':
      return data.sort((a, b) => a.balance - b.balance)
    case 'rating_desc':
      return data.sort((a, b) => b.rating - a.rating)
    case 'rating_asc':
      return data.sort((a, b) => a.rating - b.rating)
    case 'name_desc':
      return data.sort((a, b) => b.username.localeCompare(a.username))
    case 'name_asc':
      return data.sort((a, b) => a.username.localeCompare(b.username))
    default:
      return data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }
})

const visibleUsers = computed(() => sortedUsers.value.slice(0, visibleCount.value))

const displayTotal = computed(() => {
  if (normalizedQuery.value || statusFilter.value !== 'all' || roleFilter.value !== 'all') {
    return filteredUsers.value.length
  }
  return users.value.length
})

const isBanAction = computed(() => userActionType.value === 'ban')

const banReasonOptions = computed(() => [
  { value: 'fraud', label: t('common.userBanReasons.fraud') },
  { value: 'spam', label: t('common.userBanReasons.spam') },
  { value: 'multipleAccounts', label: t('common.userBanReasons.multipleAccounts') },
  { value: 'chargebackAbuse', label: t('common.userBanReasons.chargebackAbuse') },
  { value: 'termsViolation', label: t('common.userBanReasons.termsViolation') },
  { value: 'otherReason', label: t('common.userBanReasons.otherReason') },
])

function formatPrice(price: number) {
  return formatCurrencyAmount(price)
}

onMounted(async () => {
    await loadUsersList()
    resetPagination()
    nextTick(setupObserver)
});

onUnmounted(() => {
  observer?.disconnect()
})

function navigateToProfile(username: string) {
  router.push(`/user/${username}`);
}

function navigateToEditUser(userId: string) {
  router.push(`/admin/users/edit/${userId}`);
}

function getStatusBadge(user: UserRead) {
  if (user.is_banned) {
    return { text: 'common.banned', class: 'bg-[rgb(var(--palette-red-500)/0.2)] text-[rgb(var(--palette-red-400))] border-[rgb(var(--palette-red-500)/0.3)]' };
  }
  if (user.is_active) {
    return { text: 'common.online', class: 'bg-[rgb(var(--palette-green-500)/0.2)] text-[rgb(var(--palette-green-400))] border-[rgb(var(--palette-green-500)/0.3)]' };
  }
  return { text: 'common.offline', class: 'bg-[rgb(var(--palette-gray-500)/0.2)] text-[rgb(var(--palette-gray-400))] border-[rgb(var(--palette-gray-500)/0.3)]' };
}

function getRoleBadge(user: UserRead) {
  if (user.role === 'admin') {
    return { text: 'common.admin', class: 'bg-[rgb(var(--palette-purple-500)/0.2)] text-[rgb(var(--palette-purple-400))] border-[rgb(var(--palette-purple-500)/0.3)]' };
  }
  if (user.role === 'partner') {
    return { text: 'common.partner', class: 'bg-[rgb(var(--palette-cyan-500)/0.2)] text-[rgb(var(--palette-cyan-300))] border-[rgb(var(--palette-cyan-500)/0.3)]' };
  }
  return { text: 'common.user', class: 'bg-[rgb(var(--palette-blue-500)/0.2)] text-[rgb(var(--palette-blue-400))] border-[rgb(var(--palette-blue-500)/0.3)]' };
}

function showBanConfirm(userId: string) {
    userToBan.value = userId
    userActionType.value = 'ban'
    selectedBanReasonCode.value = 'fraud'
    customBanReason.value = ''
    banReasonError.value = ''
    confirmWindowOpen.value = true
}

function showUnbanConfirm(userId: string) {
    userToBan.value = userId
    userActionType.value = 'unban'
    selectedBanReasonCode.value = 'fraud'
    customBanReason.value = ''
    banReasonError.value = ''
    confirmWindowOpen.value = true
}

async function confirmBan() {
    if (!userToBan.value) return

    let reasonCode: string | null = null
    let reasonText: string | null = null
    banReasonError.value = ''

    if (isBanAction.value) {
      reasonCode = selectedBanReasonCode.value
      if (!reasonCode) {
        banReasonError.value = t('pages.admin.usersPage.banReasonRequired')
        return
      }

      if (reasonCode === 'otherReason') {
        const customReason = customBanReason.value.trim()
        if (customReason.length < 5) {
          banReasonError.value = t('pages.admin.usersPage.customBanReasonRequired')
          return
        }
        reasonText = customReason
      }
    }

    isBanning.value = true
    try {
        const response = userActionType.value === 'ban'
          ? await adminService.banUser(userToBan.value, reasonCode || 'fraud', reasonText)
          : await adminService.unbanUser(userToBan.value)
        if (response) {
            await loadUsersList()
        }
    } finally {
        isBanning.value = false
        confirmWindowOpen.value = false
        userToBan.value = null
        customBanReason.value = ''
        banReasonError.value = ''
    }
}

function cancelBan() {
    confirmWindowOpen.value = false
    userToBan.value = null
    customBanReason.value = ''
    banReasonError.value = ''
}

function loadMoreUsers() {
  if (visibleCount.value >= sortedUsers.value.length) return
  visibleCount.value = Math.min(visibleCount.value + pageSize, sortedUsers.value.length)
}

function resetPagination() {
  visibleCount.value = pageSize
  if (listRef.value) listRef.value.scrollTop = 0
}

function setupObserver() {
  if (!sentinelRef.value) return
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) loadMoreUsers()
    },
    { root: listRef.value, threshold: 0.1 }
  )
  observer.observe(sentinelRef.value)
}

// Функции для управления dropdown
function toggleDropdown(userId: string) {
  if (dropdownOpenId.value === userId) {
    dropdownOpenId.value = null;
  } else {
    dropdownOpenId.value = userId;
  }
}

function closeDropdown() {
  dropdownOpenId.value = null;
}

// Закрытие dropdown при клике вне его области
function setupClickOutside() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      closeDropdown();
    }
  });
}

onMounted(() => {
  setupClickOutside();
});

watch([searchQuery, sortBy, statusFilter, roleFilter], () => {
  resetPagination()
  nextTick(setupObserver)
})

watch(sortedUsers, () => {
  if (visibleCount.value > sortedUsers.value.length) {
    visibleCount.value = sortedUsers.value.length
  }
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <!-- Заголовок -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex gap-2">
        <BackButton/>
        <h1 class="text-xl sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.usersPage.title') }}</h1>
      </div>
      <div class="text-sm sm:text-base text-text-secondary">
        {{ $t('common.total') }} {{ displayTotal }}
      </div>
    </div>

    <SearchField
        v-model="searchQuery"
        :placeholder="$t('common.search')"
    />

    <div class="sm:hidden">
      <button
        type="button"
        class="admin-btn admin-btn-ghost w-full justify-center"
        :class="{ 'border-[rgb(var(--palette-blue-500)/0.4)] text-[rgb(var(--palette-blue-300))]': isMobileFiltersOpen }"
        @click="isMobileFiltersOpen = !isMobileFiltersOpen"
      >
        <SlidersHorizontal class="w-4 h-4" />
        <span>
          {{
            isMobileFiltersOpen
              ? $t('pages.admin.activityLogs.hideFilters')
              : $t('pages.admin.activityLogs.showFilters')
          }}
        </span>
      </button>
    </div>

    <div
      class="admin-filter-panel grid grid-cols-1 gap-2 rounded-[1.5rem] p-3 sm:grid-cols-3"
      :class="{ 'hidden sm:grid': !isMobileFiltersOpen }"
    >
      <CustomSelect
        v-model="sortBy"
        :options="[
          { value: 'created_desc', label: t('common.sortOptions.newest') },
          { value: 'created_asc', label: t('common.sortOptions.oldest') },
          { value: 'balance_desc', label: t('common.sortOptions.balanceHigh') },
          { value: 'balance_asc', label: t('common.sortOptions.balanceLow') },
          { value: 'rating_desc', label: t('common.sortOptions.ratingHigh') },
          { value: 'rating_asc', label: t('common.sortOptions.ratingLow') },
          { value: 'name_asc', label: t('common.sortOptions.nameAsc') },
          { value: 'name_desc', label: t('common.sortOptions.nameDesc') },
        ]"
        :placeholder="$t('common.sortBy')"
      />
      <CustomSelect
        v-model="statusFilter"
        :options="[
          { value: 'all', label: t('common.all') },
          { value: 'online', label: t('common.online') },
          { value: 'offline', label: t('common.offline') },
          { value: 'banned', label: t('common.filters.banned') },
        ]"
        :placeholder="$t('common.filters.status')"
      />
      <CustomSelect
        v-model="roleFilter"
        :options="[
          { value: 'all', label: t('common.all') },
          { value: 'admin', label: t('common.admin') },
          { value: 'partner', label: t('common.partner') },
          { value: 'user', label: t('common.user') },
        ]"
        :placeholder="$t('common.filters.role')"
      />
    </div>

    <!-- Список пользователей -->
    <div class="flex-1 overflow-hidden">

      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[rgb(var(--palette-blue-500))]" />
        <span class="ml-2 sm:ml-3 text-base sm:text-lg text-[rgb(var(--palette-gray-400))]">{{ $t('common.loading') }}</span>
      </div>

      <div ref="listRef" v-else class="h-full overflow-y-auto space-y-3">
        <!-- Карточка пользователя -->
        <div
          v-for="user in visibleUsers"
          :key="user.id"
          class="admin-surface-card rounded-[1.4rem] p-3 sm:p-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div class="flex items-center gap-3 sm:gap-4">
              <div class="flex-shrink-0">
                <div class="relative">
                  <UserAvatar
                    :avatar-url="user.avatar_url"
                    :alt="user.username"
                    class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[rgb(var(--palette-white)/0.1)]"
                  />
                  <div
                    class="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-background"
                    :class="user.is_active && !user.is_banned ? 'bg-[rgb(var(--palette-green-500))]' : 'bg-[rgb(var(--palette-gray-500))]'"
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
                      <Mail class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span class="truncate text-xs">{{ user.email }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span :class="user.has_frozen_balance ? 'text-[rgb(var(--palette-orange-400))]' : 'text-[rgb(var(--palette-green-400))]'">
                        {{ formatPrice(user.balance) }}
                        <span v-if="user.has_frozen_balance" class="text-[rgb(var(--palette-orange-300))] text-xs">{{ $t('pages.admin.usersPage.freezedBalance') }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-shrink-0 flex gap-2 justify-end sm:justify-start items-center">
              <button
                @click="navigateToProfile(user.username)"
                class="admin-btn admin-btn-primary admin-btn-xs sm:px-3 sm:py-2 sm:text-sm flex-1 sm:flex-none justify-center"
              >
                <Eye class="w-3 h-3 sm:w-4 sm:h-4" />
                <span class="">{{ $t("pages.admin.usersPage.profile") }}</span>
              </button>
              
              <button
                v-if="!user.is_banned"
                @click="showBanConfirm(user.id)"
                class="admin-btn admin-btn-danger admin-btn-xs sm:px-3 sm:py-2 sm:text-sm flex-1 sm:flex-none justify-center"
              >
                <Ban class="w-3 h-3 sm:w-4 sm:h-4" />
                <span class="">{{ $t("pages.admin.usersPage.ban") }}</span>
              </button>

              <button
                v-if="user.is_banned"
                @click="showUnbanConfirm(user.id)"
                class="admin-btn admin-btn-success admin-btn-xs sm:px-3 sm:py-2 sm:text-sm flex-1 sm:flex-none justify-center"
              >
                <UserCheck class="w-3 h-3 sm:w-4 sm:h-4" />
                <span class="">{{ $t("pages.admin.usersPage.unban") }}</span>
              </button>

              <!-- Dropdown меню -->
              <div class="relative dropdown-container">
                <button
                  @click.stop="toggleDropdown(user.id)"
                  class="admin-btn admin-btn-ghost w-8 h-8 p-0"
                >
                  <MoreVertical class="w-4 h-4 text-text-secondary" />
                </button>

                <!-- Dropdown контент -->
                <div
                  v-if="dropdownOpenId === user.id"
                  class="admin-surface-soft absolute right-0 top-full z-10 mt-1 w-48 rounded-lg shadow-lg"
                >
                  <button
                    @click="navigateToEditUser(user.id)"
                    class="flex items-center gap-2 w-full rounded-lg px-4 py-2 text-sm text-mainText transition-colors hover:bg-[rgb(var(--palette-white)/0.04)]"
                  >
                    <Edit class="w-4 h-4" />
                    <span>{{ $t('common.edit') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[rgb(var(--palette-white)/0.08)] text-xs text-text-secondary">
            <div class="flex flex-col xs:flex-row gap-1 xs:gap-2 sm:gap-4">
              <div>{{ $t('common.memberSince') }} {{ new Date(user.created_at).toLocaleDateString('ru-RU') }}</div>
              <div v-if="user.description" class="truncate flex-1 hidden sm:block">
                {{ $t('common.description') }}: {{ user.description }}
              </div>
              <div class="flex items-center gap-1 sm:hidden">
                <Star class="w-3 h-3" />
                <span>{{ $t('common.rating') }} {{ user.rating }}</span>
              </div>
            </div>
          </div>
        </div>

        <div ref="sentinelRef" class="h-4 w-full"></div>
      </div>
    </div>

    <ConfirmWindow
      :is-open="confirmWindowOpen"
      :title="userActionType === 'ban' ? $t('pages.admin.usersPage.ban') : $t('pages.admin.usersPage.unban')"
      :message="userActionType === 'ban' ? $t('pages.admin.usersPage.confirmBanMessage') : $t('pages.admin.usersPage.confirmUnbanMessage')"
      :confirm-text="userActionType === 'ban' ? $t('pages.admin.usersPage.ban') : $t('pages.admin.usersPage.unban')"
      :cancel-text="$t('common.cancel')"
      :is-loading="isBanning"
      @confirm="confirmBan"
      @cancel="cancelBan"
    >
      <template #body>
        <div v-if="isBanAction" class="space-y-3">
          <label class="block text-sm text-[rgb(var(--palette-gray-300))]">
            {{ $t('pages.admin.usersPage.banReasonLabel') }}
          </label>
          <CustomSelect
            v-model="selectedBanReasonCode"
            :options="banReasonOptions"
            :placeholder="$t('pages.admin.usersPage.selectBanReason')"
          />
          <div v-if="selectedBanReasonCode === 'otherReason'" class="space-y-2">
            <textarea
              v-model="customBanReason"
              class="admin-input-surface w-full rounded-lg text-[rgb(var(--palette-white))] px-3 py-2 resize-none min-h-[110px]"
              :placeholder="$t('pages.admin.usersPage.customBanReasonPlaceholder')"
            />
          </div>
          <p v-if="banReasonError" class="text-[rgb(var(--palette-red-400))] text-sm">
            {{ banReasonError }}
          </p>
        </div>
      </template>
    </ConfirmWindow>
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
  background: var(--scrollbar-thumb);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* Медиа-запрос для очень маленьких экранов */
@media (max-width: 360px) {
  .text-xs {
    font-size: 0.7rem;
  }
}
</style>
