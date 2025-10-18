import { authService } from '@/api/auth/AuthService'
import type { UserRead } from '@/validation/user/userRead'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
// import { authService } from '~/services/AuthService'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserRead | null>(null)

  async function setUser(userData: UserRead) {
    user.value = userData
  }

  async function getUser(): Promise<UserRead | null> {
    console.log('working')
    return user.value
  }

  function updateUserProfile(profileData: Partial<UserRead>) {
    if (user.value) {
      user.value = { ...user.value, ...profileData }
    }
  }

  async function clearUser() {
    user.value = null
  }

  async function fetchUser() {
    const userData = await authService.getUser()
    user.value = userData
  }

  return {
    user,
    setUser,
    getUser,
    updateUserProfile,
    clearUser,
    fetchUser,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
