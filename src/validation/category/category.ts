import { z } from 'zod'
import { i18n } from '@/i18n'

export const CATEGORY_NAME_MIN_LENGTH = 1
export const CATEGORY_NAME_MAX_LENGTH = 32
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 256

const CategorySchemaBase = z.object({
  id: z.string(),
  name: z.string().min(CATEGORY_NAME_MIN_LENGTH).max(CATEGORY_NAME_MAX_LENGTH),
  name_ru: z.string().min(CATEGORY_NAME_MIN_LENGTH).max(CATEGORY_NAME_MAX_LENGTH),
  name_en: z.string().min(CATEGORY_NAME_MIN_LENGTH).max(CATEGORY_NAME_MAX_LENGTH),
  slug: z.string(),
  description: z.string().max(CATEGORY_DESCRIPTION_MAX_LENGTH).nullable(),
  is_active: z.boolean(),
  image_url: z.string().nullable(),
  banner_url: z.string().nullable().optional(),
  parent_id: z.string().nullable(),
  active_products_count: z.number().int().nonnegative().default(0),
})

export const CategorySchema = CategorySchemaBase.transform((category) => {
  const localizedCategory = {
    ...category,
    get name() {
      const currentLocale = i18n.global.locale.value
      if (currentLocale === 'ru') {
        return category.name_ru || category.name_en || category.name
      }
      return category.name_en || category.name_ru || category.name
    },
  }

  return localizedCategory
})

export type Category = z.infer<typeof CategorySchema>
