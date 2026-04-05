import { z } from 'zod'

export const promoContextSchema = z.enum(['wallet_topup', 'marketplace_purchase', 'steam_topup'])
export const promoDiscountTypeSchema = z.enum(['percent', 'fixed'])

export const adminPromoCodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  discount_type: promoDiscountTypeSchema,
  discount_value: z.number(),
  max_discount_amount: z.number().nullable().optional(),
  min_order_amount: z.number().nullable().optional(),
  total_usage_limit: z.number().int().positive().nullable().optional(),
  per_user_usage_limit: z.number().int().positive(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean(),
  applies_to: promoContextSchema,
  created_by_admin_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).strip()

export const adminPromoCodesListSchema = z.object({
  promos: z.array(adminPromoCodeSchema),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
}).strip()

export const createAdminPromoCodeSchema = z.object({
  code: z.string().trim().min(3).max(64),
  discount_type: promoDiscountTypeSchema,
  discount_value: z.number().positive(),
  max_discount_amount: z.number().positive().nullable().optional(),
  min_order_amount: z.number().nonnegative().nullable().optional(),
  total_usage_limit: z.number().int().positive().nullable().optional(),
  per_user_usage_limit: z.number().int().positive().default(1),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
  applies_to: promoContextSchema,
}).strip()

export const updateAdminPromoCodeSchema = createAdminPromoCodeSchema.partial()

export type AdminPromoCode = z.infer<typeof adminPromoCodeSchema>
export type CreateAdminPromoCodePayload = z.infer<typeof createAdminPromoCodeSchema>
export type UpdateAdminPromoCodePayload = z.infer<typeof updateAdminPromoCodeSchema>
