import { ZodError } from 'zod'
import { httpClient } from '..'
import {
  promoCodeValidateInputSchema,
  promoCodeValidationResponseSchema,
  type PromoCodeValidatePayload,
  type PromoCodeValidationResponse,
} from '@/validation/promoCode/promoCode'

export const promoCodeService = {
  async validate(payload: PromoCodeValidatePayload): Promise<PromoCodeValidationResponse> {
    const normalizedPayload = promoCodeValidateInputSchema.parse(payload)
    try {
      const response = await httpClient.post('/promo-codes/validate', normalizedPayload)
      return promoCodeValidationResponseSchema.parse(response.data)
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      throw error
    }
  },
}
