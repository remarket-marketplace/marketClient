import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  slug: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  image_url: z.string().nullable(),
  parent_id: z.string().nullable(),
})

export type Category = z.infer<typeof CategorySchema>
