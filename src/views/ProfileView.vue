<script setup lang="ts">
import { productService } from '@/api/product/ProductService'
import { profileService } from '@/api/profile/ProfileService'
import ProfilePage from '@/components/ProfilePage.vue'
import { useUserStore } from '@/stores/user'
import type { Product } from '@/validation/product/product'
import type { PublicProfileData, UserRead } from '@/validation/user/userRead'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Loader from '@/components/Loader.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUserStore()
const { user: currentUser } = storeToRefs(store)

const username = computed(() => route.params.username as string)
const profileData = ref<PublicProfileData | UserRead | null>(null)
const profileProducts = ref<Product[]>([])
const isLoading = ref(true)

const isOwner = computed(() => currentUser.value?.username === username.value)

async function loadProfileData() {
  try {
    isLoading.value = true
    const data = await profileService.getUserProfileData(username.value)
    profileProducts.value = await productService.getUserProductsByUsername(username.value)
    profileData.value = data
  } catch (error: any) {
    console.error('Ошибка при загрузке профиля:', error)
    if (error.response?.status === 404) router.push('/404')
    else router.push('/error')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadProfileData)
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <div v-if="isLoading" class="flex h-full w-full items-center justify-center">
      <Loader/>
    </div>
    <ProfilePage
      v-else-if="profileData"
      :profile-data="profileData"
      :is-owner="isOwner"
      :Products="profileProducts"
    />
  </div>
</template>