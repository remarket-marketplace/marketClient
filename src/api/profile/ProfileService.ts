import { ProfileDataSchema, PublicProfileDataSchema, type ProfileData, type PublicProfileData } from '@/validation/user/userRead'
import { ZodError } from 'zod'
import { httpClient } from '..'
import { SimpleDealsListSchema } from '@/validation/deal/deal'

export const profileService = {

  async getUserProfileData(username: string): Promise<PublicProfileData | ProfileData | null> {
    try {
      const response = await httpClient.get(`/users/${username}`)

      // Сначала пытаемся парсить как полные данные (для владельца профиля)
      try {
        return ProfileDataSchema.parse(response.data)
      }
      catch {
        // Если не получается, парсим как публичные данные (для других пользователей)
        return PublicProfileDataSchema.parse(response.data)
      }
    }
    catch (e) {
      if (e instanceof ZodError)
        console.error('Ошибка валидации профиля:', e.issues)
      return null
    }
  },

  async updateProfileDescription(new_description: string) {
    try {
      const response = await httpClient.post('/users/description', {
        description: new_description,
      })
      return ProfileDataSchema.parse(response.data)
    }
    catch (e) {
      if (e instanceof ZodError)
        console.error(e.issues)
      return null
    }
  },

  async getUserPurchases() {
    try {
      const response = await httpClient.get(`/deal/`)
      return SimpleDealsListSchema.parse(response.data)
    }
    catch (error) {
      console.error('Ошибка при загрузке покупок:', error)
      return []
    }
  },

  async uploadAvatar(file: File) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await httpClient.patch('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    }
    catch (error) {
      console.error('Ошибка загрузки аватара:', error)
      return null
    }
  },
}
