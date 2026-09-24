import { ZodError } from 'zod'

import { httpClient } from '..'
import {
  telegramStarsPricingSchema,
  telegramStarsPurchaseInputSchema,
  telegramStarsPurchaseSchema,
  type TelegramStarsPricing,
  type TelegramStarsPurchasePayload,
  type TelegramStarsPurchaseResponse,
} from '@/validation/telegramStars/telegramStars'


export const telegramStarsService = {
  async getPricing(): Promise<TelegramStarsPricing> {
    try {
      const response = await httpClient.get('/telegram-stars/pricing')
      return telegramStarsPricingSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('telegram stars pricing validation failed', error.issues)
      }
      throw error
    }
  },

  async purchase(payload: TelegramStarsPurchasePayload): Promise<TelegramStarsPurchaseResponse> {
    const validatedPayload = telegramStarsPurchaseInputSchema.parse(payload)
    try {
      const response = await httpClient.post('/telegram-stars/purchase', validatedPayload)
      return telegramStarsPurchaseSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('telegram stars purchase validation failed', error.issues)
      }
      throw error
    }
  },
}
