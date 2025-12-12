import { ZodError } from 'zod'
import { httpClient } from '..'
import { ProductSchema } from '@/validation/product/product'
import { UserReadSchema } from '@/validation/user/userRead'
import { DealSchema, DealsListSchema, type Deal } from '@/validation/deal/deal'

export const adminService = {
  async getDashboardData() {
    try {
      const response = await httpClient.get('/admin/dashboard-info')
      return response.data
    }
    catch (e) {
      return []
    }
  },

  async getAdminProductList() {
    try {
      const response = await httpClient.get('/admin/products')
      return response.data.map((product: any) => {
        const transformedProduct = {
          ...product,
          images: product.images.map((img: any) => ({
            ...img,
            url: img.url || img.image_url || '',
          })),
        }
        return ProductSchema.parse(transformedProduct)
      })
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return []
    }
  },

  async approveProduct(productId: string) {
    try {
      const response = await httpClient.post(`/admin/products/approve/${productId}`)
      return response.status === 200
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async rejectProduct(productId: string) {
    try {
      const response = await httpClient.post('/admin/products/reject', {
        product_id: productId,
      })
      return response.status === 200 && response.data === true
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async getAllUsers() {
    try {
      const response = await httpClient.get('/admin/users')
      return response.data.map((user: any) => UserReadSchema.parse(user))
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async getUserById(userId: string) {
    try {
      const response = await httpClient.get(`/admin/user/${userId}`,)
      return UserReadSchema.parse(response.data)
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async updateUserData(userId: string, updateData: any) {
    try {
      await httpClient.patch(`/admin/user/${userId}`, updateData)
    }
    catch (e) {
      return false
    }
  },

  async banUser(userId: string) {
    try {
      const response = await httpClient.post('/admin/ban-user', {
        id: userId,
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

    async unbanUser(userId: string) {
    try {
      const response = await httpClient.post('/admin/unban-user', {
        user_id: userId,
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

  async SearchUsers(query: string) {
    try {
      const response = await httpClient.get('/admin/users/search', { params: { q: query } })
      return response.data.map((user: any) => UserReadSchema.parse(user))
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error(e.issues)
      }
      return false
    }
  },

  async getAllDeals(page: number, perPage: number) {
    try {
      const response = await httpClient.get('/admin/deals', {
        params: { page, per_page: perPage },
      })
      return DealsListSchema.parse(response.data)
    }
    catch (e) {
      return false
    }
  },

  async refundDeal(dealId: string): Promise<Deal | false> {
    // 
    // refund deal api request
    // 
    try {
      const response = await httpClient.patch('/admin/deals/refund', {
        deal_id: dealId,
      })
      return DealSchema.parse(response.data)
    }
    catch (e) {
      return false
    }
  },

  async cancelDeal(dealId: string): Promise<Deal | false> {
    // 
    // cancel deal api request
    // 
    try {
      const response = await httpClient.patch('/admin/deals/cancel', {
        deal_id: dealId,
      })
      return DealSchema.parse(response.data)
    }
    catch (e) {
      return false
    }
  },

  async confirmDeal(dealId: string): Promise<Deal | false> {
    // 
    // confirm deal api request
    //
    try {
      const response = await httpClient.patch('/admin/deals/confirm', {
        deal_id: dealId,
      })
      return DealSchema.parse(response.data)
    }
    catch (e) {
      return false
    }
  },

  async resolveDealDispute(dealId: string, inFavorOf: 'seller' | 'buyer') {
    // 
    // resolve deal dispute
    //
    try {
      const response = await httpClient.patch('/admin/deals/resolve-dispute', {
        deal_id: dealId,
        resolve_favor: inFavorOf
      })
      return DealSchema.parse(response.data)
    }
    catch (e) {
      return false
    }
  }
}
