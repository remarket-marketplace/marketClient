import { z } from 'zod'

export const NicknameStyleCatalogItemSchema = z.object({
  style_id: z.string().min(1).max(64),
  price_rub: z.number().nonnegative(),
  is_owned: z.boolean(),
  is_active: z.boolean(),
})

export const NicknameStyleCatalogResponseSchema = z.object({
  active_style_id: z.string().min(1).max(64),
  balance: z.number().nonnegative(),
  styles: z.array(NicknameStyleCatalogItemSchema),
})

export type NicknameStyleCatalogItem = z.infer<typeof NicknameStyleCatalogItemSchema>
export type NicknameStyleCatalogResponse = z.infer<typeof NicknameStyleCatalogResponseSchema>
