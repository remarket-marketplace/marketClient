import { ZodError } from 'zod'
import { httpClient } from '..'
import {
  steamTopUpCreatePaymentInputSchema,
  steamTopUpCreatePaymentSchema,
  steamTopUpCreateOrderSchema,
  steamTopUpPayOrderInputSchema,
  steamTopUpOrderSchema,
  steamTopUpPayOrderSchema,
  steamTopUpPrecheckInputSchema,
  steamTopUpPrecheckSchema,
  steamTopUpServicesSchema,
  type SteamTopUpCreatePaymentPayload,
  type SteamTopUpCreatePaymentResponse,
  type SteamTopUpCreateOrderPayload,
  type SteamTopUpOrder,
  type SteamTopUpPayOrderPayload,
  type SteamTopUpPayOrderResponse,
  type SteamTopUpPrecheckPayload,
  type SteamTopUpPrecheckResponse,
  type SteamTopUpServicesResponse,
} from '@/validation/steamTopup/steamTopup'

export const steamTopupService = {
  async createPayment(payload: SteamTopUpCreatePaymentPayload): Promise<SteamTopUpCreatePaymentResponse> {
    const validatedPayload = steamTopUpCreatePaymentInputSchema.parse(payload)
    try {
      const response = await httpClient.post('/steam-topup/payments', validatedPayload)
      return steamTopUpCreatePaymentSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },

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

  async precheck(payload: SteamTopUpPrecheckPayload): Promise<SteamTopUpPrecheckResponse> {
    const validatedPayload = steamTopUpPrecheckInputSchema.parse(payload)
    try {
      const response = await httpClient.post('/steam-topup/precheck', validatedPayload)
      return steamTopUpPrecheckSchema.parse(response.data)
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

  async payOrder(
    orderId: number,
    payload: SteamTopUpPayOrderPayload = { payment_method: 'lava' },
  ): Promise<SteamTopUpPayOrderResponse> {
    const validatedPayload = steamTopUpPayOrderInputSchema.parse(payload)
    try {
      const response = await httpClient.post(`/steam-topup/orders/${orderId}/pay`, validatedPayload)
      return steamTopUpPayOrderSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },
}
