import { z } from 'zod'

export const UUIDSchema = z.string()

export const ProductImageSchema = z.object({
  id: UUIDSchema,
  image_url: z.string(),
}).strip()

export const SellerSchema = z.object({
  username: z.string(),
  avatar_url: z.string(),
  is_active: z.boolean(),
  is_banned: z.boolean(),
  rating: z.number(),
  created_at: z.string(),
}).strip()

export const CategorySchema = z.object({
  id: UUIDSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  parent_id: z.string().nullable(),
}).strip()

export const ProductSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  description: z.string(),
  is_sold: z.boolean(),
  status: z.string(),
  category: CategorySchema,
  price: z.number(),
  created_at: z.string(),
  seller: SellerSchema,
  images: z.array(ProductImageSchema),
  is_owner: z.boolean().optional(),
  product_data_string: z.string().nullable().optional(),
}).strip()

export type Product = z.infer<typeof ProductSchema>
