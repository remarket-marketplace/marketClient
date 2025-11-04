<script setup lang="ts">
import { authService } from '@/api/auth/AuthService'
import { productService } from '@/api/product/ProductService'
import { profileService } from '@/api/profile/ProfileService'
import Loader from '@/components/Loader.vue'
import { useUserStore } from '@/stores/user'
import type { Product } from '@/validation/product/product'
import type { ProfileData, PublicProfileData, UserRead } from '@/validation/user/userRead'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ProfileProductCard from '@/components/ProfileProductCard.vue'

import { 
  Wallet
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUserStore()
const { user: currentUser } = storeToRefs(store)
const API_HOST = import.meta.env.VITE_API_HOST

const username = computed(() => route.params.username as string)
const profileData = ref<PublicProfileData | UserRead | null>(null)
const profileProducts = ref<Product[]>([])
const isLoading = ref(true)

const isOwner = computed(() => currentUser.value?.username === username.value)

// Данные профиля
const currentProfileData = ref<UserRead | PublicProfileData | null>(null)
const products = ref<Product[]>([])
const newDescription = ref('')
const isEditingDescription = ref(false)

const menuContainerRef = ref<HTMLElement | null>(null)
const showMenu = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const showAvatarOverlay = ref(false)

// Загрузка данных профиля
async function loadProfileData() {
  try {
    isLoading.value = true
    const data = await profileService.getUserProfileData(username.value)
    const userProducts = await productService.getUserProductsByUsername(username.value)
    
    profileData.value = data
    profileProducts.value = userProducts
    currentProfileData.value = data
    products.value = userProducts
    
    // Инициализируем описание
    if (data?.description) {
      newDescription.value = data.description ?? ''
    }
  } catch (error: any) {
    console.error('Ошибка при загрузке профиля:', error)
    if (error.response?.status === 404) router.push('/404')
    else router.push('/error')
  } finally {
    isLoading.value = false
  }
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(useI18n().locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
}

async function logout() {
  if (!isOwner.value) return
  const result = await authService.logout()
  if (result) {
    router.push('/signin')
  }
}

async function updateProfileDescription(newValue: string) {
  if (!isOwner.value) return
  
  try {
    const result = await profileService.updateProfileDescription(newValue)
    store.updateUserProfile({ description: newValue })
    isEditingDescription.value = false
    if (result) {
      currentProfileData.value = result
      profileData.value = result
    }
  } catch (error) {
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

// Функции для загрузки аватара
function triggerFileInput() {
  if (isOwner.value && fileInputRef.value) {
    fileInputRef.value.click()
  }
}

async function handleAvatarUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file || !isOwner.value) return

  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите изображение')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Размер файла не должен превышать 5MB')
    return
  }

  isUploading.value = true

  try {
    const avatarUrl = await profileService.uploadAvatar(file)
    if (avatarUrl) {
      if (currentProfileData.value) {
        currentProfileData.value.avatar_url = avatarUrl
      }
      if (profileData.value) {
        profileData.value.avatar_url = avatarUrl
      }
      
      if (isOwner.value) {
        store.updateUserProfile({ avatar_url: avatarUrl })
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error)
    alert('Произошла ошибка при загрузке аватара')
  } finally {
    isUploading.value = false
    if (target) target.value = ''
  }
}

function showAvatarEdit() {
  if (isOwner.value) {
    showAvatarOverlay.value = true
  }
}

function hideAvatarEdit() {
  showAvatarOverlay.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadProfileData()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="flex h-full w-full items-center justify-center">
      <Loader/>
    </div>

    <!-- Основной контент профиля -->
    <section v-else-if="currentProfileData" class="h-full w-full flex flex-col gap-6 py-10 text-mainText lg:flex-row overflow-scroll lg:overflow-hidden no-scrollbar">
      <!-- Левая колонка - информация профиля -->
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

          <!-- Блок аватара с возможностью загрузки -->
          <div 
            class="relative mt-4 group"
            @mouseenter="showAvatarEdit"
            @mouseleave="hideAvatarEdit"
          >
            <div class="relative">
              <img
                v-if="currentProfileData.avatar_url"
                :src="`${API_HOST}${currentProfileData.avatar_url}`"
                class="h-36 w-36 border-2 border-dark-600 rounded-full object-cover transition-all duration-300"
                :class="{
                  'brightness-75': showAvatarOverlay && isOwner,
                  'animate-pulse': isUploading
                }"
                alt="Avatar"
              />
              <div
                v-else
                class="h-36 w-36 flex items-center justify-center border-2 border-dark-600 rounded-full bg-dark-800 transition-all duration-300"
                :class="{
                  'brightness-75': showAvatarOverlay && isOwner,
                  'animate-pulse': isUploading
                }"
              >
                <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              <!-- Overlay для загрузки аватара -->
              <div
                v-if="showAvatarOverlay && isOwner && !isUploading"
                class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer transition-opacity duration-300"
                @click="triggerFileInput"
              >
                <div class="text-white text-center">
                  <svg class="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="text-xs font-medium">{{ $t('pages.profile.changePhoto') }}</span>
                </div>
              </div>

              <Loader v-if="isUploading"/>
            </div>

            <!-- Скрытый input для выбора файла -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarUpload"
            />
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
                  :disabled="!newDescription.trim() || newDescription === currentProfileData.description"
                  @click="updateProfileDescription(newDescription)"
                >
                  {{ $t('common.save') }}
                </button>
              </div>
            </template>
          </div>

          <!-- Баланс (только для владельца) -->
          <div v-if="isOwner" class="mt-4 text-sm sm:text-base flex">
            <p v-if="'balance' in currentProfileData">
              {{ $t('common.balance') }}:
              <span class="text-green-400">
                {{ (currentProfileData as ProfileData).balance.toFixed(2) }}₽
              </span>
            </p>
            <Wallet class="mx-3 cursor-pointer" @click="router.push('/wallet')"/>
          </div>

          <!-- Рейтинг и дата регистрации -->
          <p class="mt-2 text-xs text-gray-400 sm:text-sm">
            🌟 {{ currentProfileData.rating.toFixed(1) }} •
            {{ $t('common.memberSince') }} {{ formatFullDate(currentProfileData.created_at.toString()) }}
          </p>
        </div>
      </div>

      <!-- Правая колонка с товарами -->
      <div class="w-full h-max-content lg:h-full flex flex-col border border-dark-600 rounded-lg space-y-4 lg:overflow-hidden">
        <!-- Блок с кнопками -->
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

        <!-- Блок с кнопками для гостя -->
        <div v-else class="w-full flex">
          <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
            {{ $t('common.productStatuses.active') }}
          </button>
          <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
            {{ $t('pages.profile.reviews') }}
          </button>
          <button class="flex-1 hover:bg-dark-500 transition py-4 rounded">
            {{ $t('common.productStatuses.') }}
          </button>
        </div>

        <!-- Прокручиваемая область товаров -->
        <div class="w-full flex-1 overflow-scroll no-scrollbar">
          <div class="p-4 pb-8">
            <div v-if="products.length === 0" class="w-full flex items-center justify-center py-6 text-text-secondaryDark">
              {{ $t('pages.profile.noProducts') }}
            </div>

            <div v-else>
              <div v-for="product in products" :key="product.id" class="w-full border-b border-dark-600 hover:bg-dark-800/50 transition">
                <ProfileProductCard :product="product" :is-owner="isOwner" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>