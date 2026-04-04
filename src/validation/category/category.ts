import { z } from 'zod'

export const CATEGORY_NAME_MIN_LENGTH = 1
export const CATEGORY_NAME_MAX_LENGTH = 32
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 256

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(CATEGORY_NAME_MIN_LENGTH).max(CATEGORY_NAME_MAX_LENGTH),
  slug: z.string(),
  description: z.string().max(CATEGORY_DESCRIPTION_MAX_LENGTH).nullable(),
  is_active: z.boolean(),
  image_url: z.string().nullable(),
  banner_url: z.string().nullable().optional(),
  parent_id: z.string().nullable(),
  active_products_count: z.number().int().nonnegative().default(0),
})

export type Category = z.infer<typeof CategorySchema>
