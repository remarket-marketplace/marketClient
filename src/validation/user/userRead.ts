import { z } from 'zod'

export const UserReadSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().min(5).max(15),
  balance: z.number().nonnegative(),
  avatar_url: z.string().or(z.literal('')),
  description: z.string().max(500).nullable(),
  created_at: z.string().pipe(z.coerce.date()),
  has_frozen_balance: z.boolean(),
  is_banned: z.boolean(),
  is_active: z.boolean(),
  rating: z.number().int().nonnegative(),
  role: z.enum(['user', 'admin', 'partner']),
})

export type UserRead = z.infer<typeof UserReadSchema>

export const ProfileDataSchema = UserReadSchema
export type ProfileData = UserRead

export const PublicProfileDataSchema = z.object({
  username: z.string().min(5).max(15),
  avatar_url: z.string().or(z.literal('')),
  description: z.string().max(500).nullable(),
  is_active: z.boolean(),
  is_banned: z.boolean(),
  rating: z.number().int().nonnegative(),
  created_at: z.string().pipe(z.coerce.date()),
})

export type PublicProfileData = z.infer<typeof PublicProfileDataSchema>
