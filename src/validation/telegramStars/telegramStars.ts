import { z } from 'zod'

export const TELEGRAM_STARS_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,31}$/
export const TELEGRAM_STARS_MIN_AMOUNT = 50

const telegramUsernameSchema = z
  .string()
  .trim()
  .transform((value) => (value.startsWith('@') ? value.slice(1) : value))
  .refine((value) => TELEGRAM_STARS_USERNAME_PATTERN.test(value), {
    message: 'Telegram username must start with a letter and contain only letters, digits or underscores',
  })

export const telegramStarsPricingSchema = z.object({
  price_per_star_rub: z.number().nonnegative(),
  enabled: z.boolean(),
}).strip()

export const telegramStarsPurchaseInputSchema = z.object({
  telegram_username: telegramUsernameSchema,
  telegram_stars_amount: z.number().int().gte(TELEGRAM_STARS_MIN_AMOUNT).max(100000),
}).strip()

const telegramStarsOrderServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
}).strip()

const telegramStarsOrderParamSchema = z.object({
  param_key: z.string(),
  param_value: z.string(),
}).strip()

const telegramStarsOrderSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string(),
  status: z.string(),
  currency: z.string().nullable().optional(),
  price: z.number(),
  cashback: z.number(),
  service: telegramStarsOrderServiceSchema,
  denomination: z.any().nullable().optional(),
  params: z.array(telegramStarsOrderParamSchema),
  created_at: z.string(),
  updated_at: z.string(),
}).strip()

export const telegramStarsPurchaseSchema = z.object({
  order: telegramStarsOrderSchema,
  charged_amount_rub: z.number(),
  user_balance_after_rub: z.number(),
  payment_status: z.string(),
  provider: z.string(),
  provider_tx_id: z.string(),
}).strip()

export type TelegramStarsPricing = z.infer<typeof telegramStarsPricingSchema>
export type TelegramStarsPurchasePayload = z.infer<typeof telegramStarsPurchaseInputSchema>
export type TelegramStarsPurchaseResponse = z.infer<typeof telegramStarsPurchaseSchema>

export function normalizeTelegramStarsUsername(username: string): string {
  const trimmed = username.trim()
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
}

export function isValidTelegramStarsUsername(username: string): boolean {
  return TELEGRAM_STARS_USERNAME_PATTERN.test(normalizeTelegramStarsUsername(username))
}
