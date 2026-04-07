import { z } from 'zod'

export const STEAM_TOPUP_ACCOUNT_PATTERN = /^[a-z0-9]{3,15}$/
export const STEAM_TOPUP_SUPPORTED_SERVICE_CURRENCIES = ['RUB', 'USD'] as const
export type SteamTopUpServiceCurrency = typeof STEAM_TOPUP_SUPPORTED_SERVICE_CURRENCIES[number]

export function normalizeSteamTopUpAccount(account: string): string {
  return account.trim().toLowerCase()
}

export function isValidSteamTopUpAccount(account: string): boolean {
  return STEAM_TOPUP_ACCOUNT_PATTERN.test(normalizeSteamTopUpAccount(account))
}

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
  discount_amount_rub: z.number().optional(),
  applied_promo_code: z.string().nullable().optional(),
  promo_discount_percent: z.number().nullable().optional(),
  payment_method: z.string().optional(),
  payment_url: z.string().url().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  provider_tx_id: z.string().nullable().optional(),
}).strip()

export const steamTopUpPayOrderInputSchema = z.object({
  payment_method: z.literal('lava').default('lava'),
  promo_code: z.string().trim().min(3).max(64).optional(),
}).strip()

export const steamTopUpCreatePaymentSchema = z.object({
  account: z.string(),
  charged_amount_rub: z.number(),
  payment_url: z.string().url(),
  payment_status: z.string(),
  provider: z.string(),
  provider_tx_id: z.string(),
}).strip()

const steamTopUpAccountSchema = z
  .string()
  .trim()
  .min(3)
  .max(15)
  .transform((value) => value.toLowerCase())
  .refine((value) => STEAM_TOPUP_ACCOUNT_PATTERN.test(value), {
    message: 'Steam login must contain only latin letters and digits',
  })

export const steamTopUpCreateOrderSchema = z.object({
  service_id: z.number().int().positive(),
  account: steamTopUpAccountSchema,
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

export const steamTopUpCreatePaymentInputSchema = z.object({
  account: steamTopUpAccountSchema,
  amount_rub: z.number().positive(),
  promo_code: z.string().trim().min(3).max(64).optional(),
}).strip()

export type SteamTopUpService = z.infer<typeof steamTopUpServiceSchema>
export type SteamTopUpServicesResponse = z.infer<typeof steamTopUpServicesSchema>
export type SteamTopUpOrder = z.infer<typeof steamTopUpOrderSchema>
export type SteamTopUpPayOrderResponse = z.infer<typeof steamTopUpPayOrderSchema>
export type SteamTopUpPayOrderPayload = z.infer<typeof steamTopUpPayOrderInputSchema>
export type SteamTopUpCreateOrderPayload = z.infer<typeof steamTopUpCreateOrderSchema>
export type SteamTopUpCreatePaymentResponse = z.infer<typeof steamTopUpCreatePaymentSchema>
export type SteamTopUpCreatePaymentPayload = z.infer<typeof steamTopUpCreatePaymentInputSchema>

export function normalizeSteamTopUpServiceCurrency(
  currency: string | null | undefined,
): SteamTopUpServiceCurrency | null {
  if (!currency) return null
  const normalized = currency.trim().toUpperCase()
  return STEAM_TOPUP_SUPPORTED_SERVICE_CURRENCIES.includes(normalized as SteamTopUpServiceCurrency)
    ? normalized as SteamTopUpServiceCurrency
    : null
}

export function findSteamTopUpServiceByCurrency(
  services: SteamTopUpService[],
  currency: SteamTopUpServiceCurrency,
): SteamTopUpService | null {
  return services.find((service) => normalizeSteamTopUpServiceCurrency(service.currency) === currency) ?? null
}
