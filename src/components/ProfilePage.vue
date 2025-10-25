<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import { profileService } from '@/api/profile/ProfileService'
import { useUserStore } from '@/stores/user'
import type { Product } from '@/validation/product/product'
import type { ProfileData, PublicProfileData, UserRead } from '@/validation/user/userRead'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ProfileProductCard from './ProfileProductCard.vue'

interface Props {
  profileData: ProfileData | PublicProfileData
  isOwner: boolean
  Products: Product[]
}

const props = defineProps<Props>()

const { locale } = useI18n()
const router = useRouter()
const store = useUserStore()
const API_HOST = import.meta.env.VITE_API_HOST

const currentProfileData = ref<UserRead | PublicProfileData>(props.profileData)
const products = ref<Product[]>(props.Products)
const newDescription = ref('description' in props.profileData ? props.profileData.description ?? '' : '')
const isEditingDescription = ref(false)

const menuContainerRef = ref<HTMLElement | null>(null)
const showMenu = ref(false)


function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

async function logout() {
  if (!props.isOwner)
    return
  const result = await authService.logout()
  if (result) {
    router.push('/signin')
  }
}

async function updateProfileDescription(newValue: string) {
  if (!props.isOwner) {
    return
  }
  try {
    const result = await profileService.updateProfileDescription(newValue)
    store.updateUserProfile({ description: newValue })
    isEditingDescription.value = false
    if (result)
      currentProfileData.value = result
  }
  catch (error) {
    console.error('Ошибка при обновлении описания:', error)
  }
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function goToSettings() {
  router.push('/settings')
}

function handleClickOutside(event: MouseEvent) {
  if (showMenu.value && menuContainerRef.value && !menuContainerRef.value.contains(event.target as Node)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-6 py-10 text-mainText lg:flex-row overflow-scroll lg:overflow-hidden no-scrollbar">
    <div class="w-full h-full border border-dark-600 rounded-lg p-6 lg:max-w-sm space-y-4">
      <div class="flex flex-col items-center text-center">
        <div class="w-full flex items-center justify-between">
          <h1 class="truncate text-lg font-semibold sm:text-xl">
            {{ currentProfileData.username }}
          </h1>

          <!-- Контейнер меню -->
          <div v-if="isOwner" class="relative" ref="menuContainerRef">
            <button class="text-gray-300 hover:text-mainText" @click.stop="toggleMenu">
              <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="18" r="1.6" />
              </svg>
            </button>

            <div v-if="showMenu" class="absolute right-0 z-10 mt-2 w-40 border border-dark-600 rounded-lg bg-dark-800 shadow-lg">
              <button class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700" @click="goToSettings">
                {{ $t('pages.profile.settings') }}
              </button>
              <button class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-700" @click="logout">
                {{ $t('pages.profile.logout') }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <img
            v-if="currentProfileData.avatar_url"
            :src="`${API_HOST}${currentProfileData.avatar_url}`"
            class="h-36 w-36 border-2 border-dark-600 rounded-full object-cover"
            alt="Avatar"
          >
          <div v-else class="h-36 w-36 flex items-center justify-center border-2 border-dark-600 rounded-full bg-dark-800">
            <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-300 sm:text-sm w-full">
          <template v-if="!isEditingDescription">
            <p>{{ currentProfileData.description || $t('pages.profile.descriptionMissing') }}</p>
            <button v-if="isOwner" class="mt-1 text-xs text-blue-400 hover:underline" @click="isEditingDescription = true">
              {{ $t('pages.profile.editDescription') }}
            </button>
          </template>

          <template v-else>
            <textarea
              v-model="newDescription"
              rows="3"
              maxlength="500"
              class="w-full border border-gray-600 rounded bg-dark-900 p-2 text-xs text-mainText outline-none"
              :placeholder="$t('pages.profile.descriptionPlaceholder')"
            />
            <div class="mt-2 flex justify-end gap-2 text-xs">
              <button class="text-gray-400 hover:underline" @click="isEditingDescription = false">
                {{ $t('common.cancel') }}
              </button>
              <button
                class="text-green-400 hover:underline"
                :disabled="!newDescription.trim() || newDescription === props.profileData.description"
                @click="updateProfileDescription(newDescription)"
              >
                {{ $t('common.save') }}
              </button>
            </div>
          </template>
        </div>

        <div v-if="isOwner" class="mt-4 text-sm sm:text-base">
          <p v-if="'balance' in currentProfileData">
            {{ $t('common.balance') }}:
            <span class="text-green-400">
              {{ (currentProfileData as ProfileData).balance.toFixed(2) }}₽
            </span>
          </p>
        </div>

        <p class="mt-2 text-xs text-gray-400 sm:text-sm">
          🌟 {{ currentProfileData.rating.toFixed(1) }} •
          {{ $t('common.memberSince') }} {{ formatFullDate(currentProfileData.created_at.toString()) }}
        </p>
      </div>
    </div>

    <!-- правая колонка с товарами -->
    <!-- ИСПРАВЛЕНИЕ 1: Добавлен flex flex-col -->
    <div class="w-full h-max-content lg:h-full flex flex-col border border-dark-600 rounded-lg space-y-4 lg:overflow-hidden">

      <!-- Блок с кнопками (фиксированная высота) -->
      <div v-if="isOwner" class="w-full flex">
        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('common.products') }}
        </button>

        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('pages.profile.reviews') }}
        </button>

        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('pages.profile.purchases') }}
        </button>
      </div>

      <!-- Блок с кнопками для гостя (фиксированная высота) -->
      <div v-else class="w-full flex">
        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('common.active') }}
        </button>

        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('pages.profile.reviews') }}
        </button>

        <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
          {{ $t('common.sold') }}
        </button>
      </div>
      

      <!-- Прокручиваемая область товаров -->
      <!-- ИСПРАВЛЕНИЕ 2: Убран h-full, оставлен flex-1 -->
      <div class="w-full flex-1 overflow-scroll no-scrollbar">
        <!-- ИСПРАВЛЕНИЕ 3: Добавлен внутренний div с padding для отступов -->
        <div class="p-4 pb-8">
          <div v-if="products.length === 0" class="w-full flex items-center justify-center py-6 text-text-secondaryDark">
            {{ $t('pages.profile.noProducts') }}
          </div>

          <div v-else>
            <div v-for="product in products" :key="product.id" class="w-full border-b border-dark-600 hover:bg-dark-800/50 transition">
              <ProfileProductCard
                :product="product"
                :is-owner="isOwner"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>