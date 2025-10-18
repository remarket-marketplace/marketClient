import { ZodError } from 'zod'
import { httpClient } from '..'
import { CategorySchema } from '@/validation/product/product'

export const categoryService = {
  async getCategory(game_id: string) {
    try {
      const response = await httpClient.get(`/categories/game/${game_id}`)
      return response.data.map((category: any) => CategorySchema.parse(category))
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return []
    }
  },

  async getAllCategories() {
    try {
      const response = await httpClient.get(`/categories/all`)
      return response.data.map((categories: any) => CategorySchema.parse(categories))
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return []
    }
  },

  async getSubcategories(parentId: string) {
    try {
      const response = await httpClient.get(`/categories/subcategories/${parentId}`)
      return response.data.map((subcategory: any) => CategorySchema.parse(subcategory))
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return []
    }
  },

  async AddCategory(name: string, description: string, file: File, parentId?: string) {
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('uploaded_image', file)
      if (parentId) {
        formData.append('parent_category_id', parentId)
      }
      const response = await httpClient.post('admin/category', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.status === 200
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },
}
