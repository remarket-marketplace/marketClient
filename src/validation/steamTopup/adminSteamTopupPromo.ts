import z from 'zod'

export const adminSteamTopupPromoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  discount_percent: z.number(),
  is_active: z.boolean(),
  usage_limit: z.number().int().positive().nullable(),
  used_count: z.number().int().nonnegative(),
  expires_at: z.string().datetime().nullable(),
  created_by_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const adminSteamTopupPromosListSchema = z.object({
  promos: z.array(adminSteamTopupPromoSchema),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
})

const promoCodeSchema = z.string().trim().min(3).max(64).transform(value => value.toUpperCase())
const promoDiscountSchema = z.number().positive().max(99.99)

export const createAdminSteamTopupPromoSchema = z.object({
  code: promoCodeSchema,
  discount_percent: promoDiscountSchema,
  usage_limit: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
})

export const updateAdminSteamTopupPromoSchema = z.object({
  code: promoCodeSchema.optional(),
  discount_percent: promoDiscountSchema.optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type AdminSteamTopupPromo = z.infer<typeof adminSteamTopupPromoSchema>
export type AdminSteamTopupPromosList = z.infer<typeof adminSteamTopupPromosListSchema>
export type CreateAdminSteamTopupPromoPayload = z.infer<typeof createAdminSteamTopupPromoSchema>
export type UpdateAdminSteamTopupPromoPayload = z.infer<typeof updateAdminSteamTopupPromoSchema>
