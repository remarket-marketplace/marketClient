import { z } from 'zod'

const steamTopUpParamSchema = z.object({
  param_key: z.string(),
  param_type: z.string(),
}).strip()

const steamTopUpDenominationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  value: z.string(),
  currency: z.string(),
  price: z.number(),
}).strip()

export const steamTopUpServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  params: z.array(steamTopUpParamSchema),
  denominations: z.array(steamTopUpDenominationSchema),
  currency: z.string().nullable().optional(),
  in_game_currency: z.string().nullable().optional(),
}).strip()

export const steamTopUpServicesSchema = z.object({
  services: z.array(steamTopUpServiceSchema),
  total: z.number().int().nonnegative(),
}).strip()

const steamTopUpOrderServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
}).strip()

const steamTopUpOrderDenominationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  value: z.number(),
  currency: z.string(),
}).strip()

const steamTopUpOrderParamSchema = z.object({
  param_key: z.string(),
  param_value: z.string(),
}).strip()

export const steamTopUpOrderSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  status: z.string(),
  currency: z.string().nullable().optional(),
  price: z.number(),
  cashback: z.number(),
  service: steamTopUpOrderServiceSchema,
  denomination: steamTopUpOrderDenominationSchema.nullable().optional(),
  params: z.array(steamTopUpOrderParamSchema),
  created_at: z.string(),
  updated_at: z.string(),
}).strip()

export const steamTopUpPayOrderSchema = z.object({
  order: steamTopUpOrderSchema,
  charged_amount_rub: z.number(),
  user_balance_after_rub: z.number(),
}).strip()

export const steamTopUpCreateOrderSchema = z.object({
  service_id: z.number().int().positive(),
  account: z.string().trim().min(2).max(128),
  quantity: z.number().positive().optional(),
  denomination_id: z.number().int().positive().optional(),
  region: z.string().trim().min(1).max(64).optional(),
  server: z.string().trim().min(1).max(64).optional(),
}).superRefine((value, ctx) => {
  const hasQuantity = value.quantity !== undefined
  const hasDenomination = value.denomination_id !== undefined
  if (hasQuantity === hasDenomination) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide exactly one of quantity or denomination_id',
      path: ['quantity'],
    })
  }
})

export type SteamTopUpService = z.infer<typeof steamTopUpServiceSchema>
export type SteamTopUpServicesResponse = z.infer<typeof steamTopUpServicesSchema>
export type SteamTopUpOrder = z.infer<typeof steamTopUpOrderSchema>
export type SteamTopUpPayOrderResponse = z.infer<typeof steamTopUpPayOrderSchema>
export type SteamTopUpCreateOrderPayload = z.infer<typeof steamTopUpCreateOrderSchema>
