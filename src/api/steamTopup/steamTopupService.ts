import { ZodError } from 'zod'
import { httpClient } from '..'
import {
  steamTopUpCreateOrderSchema,
  steamTopUpOrderSchema,
  steamTopUpPayOrderSchema,
  steamTopUpServicesSchema,
  type SteamTopUpCreateOrderPayload,
  type SteamTopUpOrder,
  type SteamTopUpPayOrderResponse,
  type SteamTopUpServicesResponse,
} from '@/validation/steamTopup/steamTopup'

export const steamTopupService = {
  async getServices(): Promise<SteamTopUpServicesResponse> {
    try {
      const response = await httpClient.get('/steam-topup/services')
      return steamTopUpServicesSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },

  async createOrder(payload: SteamTopUpCreateOrderPayload): Promise<SteamTopUpOrder> {
    const validatedPayload = steamTopUpCreateOrderSchema.parse(payload)
    try {
      const response = await httpClient.post('/steam-topup/orders', validatedPayload)
      return steamTopUpOrderSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },

  async getOrder(orderId: number): Promise<SteamTopUpOrder> {
    try {
      const response = await httpClient.get(`/steam-topup/orders/${orderId}`)
      return steamTopUpOrderSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },

  async payOrder(orderId: number): Promise<SteamTopUpPayOrderResponse> {
    try {
      const response = await httpClient.post(`/steam-topup/orders/${orderId}/pay`)
      return steamTopUpPayOrderSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },
}
