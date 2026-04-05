import { z } from 'zod'
import { promoContextSchema, promoDiscountTypeSchema } from './adminPromoCode'

export const promoCodeValidateInputSchema = z.object({
  code: z.string().trim().min(3).max(64),
  context_type: promoContextSchema,
  amount: z.number().positive(),
}).strip()

export const promoCodeValidationResponseSchema = z.object({
  code: z.string(),
  context_type: promoContextSchema,
  amount: z.number(),
  discount_amount: z.number(),
  final_amount: z.number(),
  discount_type: promoDiscountTypeSchema,
  discount_value: z.number(),
  max_discount_amount: z.number().nullable().optional(),
}).strip()

export type PromoCodeValidatePayload = z.infer<typeof promoCodeValidateInputSchema>
export type PromoCodeValidationResponse = z.infer<typeof promoCodeValidationResponseSchema>
