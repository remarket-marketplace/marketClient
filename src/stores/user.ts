import { authService } from '@/api/auth/AuthService'
import type { UserRead } from '@/validation/user/userRead'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
// import { authService } from '~/services/AuthService'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserRead | null>(null)
  const isResolved = ref(false)
  let inFlightUserRequest: Promise<UserRead | null> | null = null

  function resolveUser(userData: UserRead | null) {
    user.value = userData
    isResolved.value = true
    return userData
  }

  async function setUser(userData: UserRead) {
    return resolveUser(userData)
  }

  async function getUser(): Promise<UserRead | null> {
    return user.value
  }

  function updateUserProfile(profileData: Partial<UserRead>) {
    if (user.value) {
      user.value = { ...user.value, ...profileData }
    }
  }

  async function clearUser() {
    return resolveUser(null)
  }

  async function ensureUserLoaded(force = false) {
    if (isResolved.value && !force) {
      return user.value
    }

    if (inFlightUserRequest && !force) {
      return inFlightUserRequest
    }

    inFlightUserRequest = authService.getUser()
      .then((userData) => resolveUser(userData))
      .finally(() => {
        inFlightUserRequest = null
      })

    return inFlightUserRequest
  }

  async function fetchUser() {
    return ensureUserLoaded(true)
  }

  return {
    user,
    isResolved,
    setUser,
    getUser,
    updateUserProfile,
    clearUser,
    ensureUserLoaded,
    fetchUser,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
