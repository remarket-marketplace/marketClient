import { z } from 'zod'
import { ReviewsListSchema } from '../review/review'
import { CategorySchema } from '../category/category'

export const UUIDSchema = z.string()

export const ProductImageSchema = z.object({
  id: UUIDSchema,
  image_url: z.string(),
}).strip()

export const SellerSchema = z.object({
  username: z.string(),
  nickname_style_id: z.string().max(64).nullish().transform((value) => value ?? 'default'),
  avatar_url: z.string(),
  is_active: z.boolean(),
  last_seen_at: z.string().nullable().optional(),
  average_first_response_time_seconds: z.number().int().nonnegative().nullable().optional(),
  is_banned: z.boolean(),
  rating: z.number(),
  created_at: z.string(),
}).strip()

export const SellerTrustSchema = z.object({
  total_deals_count: z.number(),
  completed_deals_count: z.number(),
  successful_deals_percent: z.number().nullable(),
}).strip()

export const FortniteAccountDetailsSchema = z.object({
  can_change_email: z.boolean().nullable().optional(),
  last_email_change: z.string().nullable().optional(),
  first_email: z.boolean().nullable().optional(),
  registration_date: z.string().nullable().optional(),
  email_confirmed: z.boolean().nullable().optional(),
  parental_control: z.boolean().nullable().optional(),
  display_name: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  two_factor_enabled: z.boolean().nullable().optional(),
  last_login: z.string().nullable().optional(),
  last_display_name_change: z.string().nullable().optional(),
  last_match_date: z.string().nullable().optional(),
  skins_count: z.number().nullable().optional(),
  backpacks_count: z.number().nullable().optional(),
  pickaxes_count: z.number().nullable().optional(),
  emotes_count: z.number().nullable().optional(),
  gliders_count: z.number().nullable().optional(),
  wraps_count: z.number().nullable().optional(),
  banners_count: z.number().nullable().optional(),
  sprays_count: z.number().nullable().optional(),
  exclusives_count: z.number().nullable().optional(),
}).strip()

export const ProductSchema = z.object({
  id: UUIDSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  is_sold: z.boolean(),
  status: z.string(),
  category: CategorySchema,
  price: z.number(),
  created_at: z.string(),
  seller: SellerSchema,
  images: z.array(ProductImageSchema),
  count: z.number(),
  auto_delivery: z.boolean(),
  is_raika_verified: z.boolean().optional(),
  moderation_reject_reason_code: z.string().nullable().optional(),
  moderation_reject_reason_text: z.string().nullable().optional(),
  reviews: ReviewsListSchema.nullable().optional(),
  is_owner: z.boolean().optional(),
  product_data_string: z.string().nullable().optional(),
  likes: z.number().nullable().optional(),
  is_liked: z.boolean().nullable().optional(),
  seller_trust: SellerTrustSchema.nullable().optional(),
  fortnite_account_details: FortniteAccountDetailsSchema.nullable().optional(),
}).strip()

export type Product = z.infer<typeof ProductSchema>
export type ProductImage = z.infer<typeof ProductImageSchema>
export type ProductEdit = z.infer<typeof ProductSchema>
export type SellerTrust = z.infer<typeof SellerTrustSchema>
export type FortniteAccountDetails = z.infer<typeof FortniteAccountDetailsSchema>
export { CategorySchema }
