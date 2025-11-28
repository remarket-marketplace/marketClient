import { ZodError } from 'zod'
import { httpClient } from '..'
import { UserReadSchema, type UserRead } from '@/validation/user/userRead'
import { useUserStore } from '@/stores/user'
import { getErrorMessage } from '@/utils/errorsMap'

export const authService = {

  async getUser(): Promise<UserRead | null> {
    try {
      const response = await httpClient.post('/auth/')
      const userData = UserReadSchema.parse(response.data)
      return userData
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return null
    }
  },

  async sendVerificationCode(email: string, username: string) {
     return await httpClient.post('/auth/send-verification-code', {
      email,
      username,
    })
  },

  async sendPasswordResetCode(email: string) {
    try {
      const response = await httpClient.post('/auth/password-reset-code', {
        email,
      })
      return response.status === 200
    }
    catch (e: any) {
      return e.response.data
    }
  },

  async confirmPasswordResetCode(email: string, code: string) {
    try {
      const response = await httpClient.post('/auth/confirm-password-reset-code', {
        email,
        code
      })
      return response.status === 200
    }
    catch (e: any) {
      return e.response.data
    }
  },

  async setNewPassword(email: string, fullCode: string, newPassword: string) {
    try {
      const response = await httpClient.post('/auth/set-new-password', {
        email,
        code: fullCode,
        new_password: newPassword
      })
      return response.status === 200
    }
    catch (e: any) {
      return e.response.data
    }
  },

  async signIn(email: string, password: string) {
    const response = await httpClient.post('/auth/login', {
      email,
      password,
    })
    const userData = UserReadSchema.parse(response.data)
    await useUserStore().setUser(userData)
    return response
  },

  async signUp(email: string, password: string, username: string, code: string) {
    try {
      const response = await httpClient.post('/auth/confirm-verification-code', {
        email,
        username,
        password,
        email_code: code,
      })
      const userData = UserReadSchema.parse(response.data)
      await useUserStore().setUser(userData)
      return true
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error('Ошибка валидации пользователя:', e.issues)
      }
      return false
    }
  },

  async refreshTokens() {
    try {
      const response = await httpClient.post('/auth/update-tokens')
      return response.status === 200
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async logout() {
    try {
      const response = await httpClient.post('/auth/logout', {})
      await useUserStore().clearUser()
      return response.status === 200
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      await useUserStore().clearUser()
      return false
    }
  },

  async getMyUserId() {
    try {
      const response = await httpClient.get('/auth/get-my-user-id')
      return response.data
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },


  async pingOnlineStatus() {
    await httpClient.patch("/users/ping-online")
  }
}
