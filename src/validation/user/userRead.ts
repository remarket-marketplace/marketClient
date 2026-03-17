import { z } from 'zod'

const nicknameStyleIdSchema = z
  .string()
  .max(64)
  .nullish()
  .transform((value) => value ?? 'default')

export const UserReadSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().min(4).max(32),
  nickname_style_id: nicknameStyleIdSchema,
  balance: z.number().nonnegative(),
  avatar_url: z.string().or(z.literal('')),
  profile_background_url: z
    .string()
    .or(z.literal(''))
    .optional()
    .transform((value) => value ?? ''),
  profile_background_unlocked: z.boolean().optional().transform((value) => value ?? false),
  two_factor_enabled: z.boolean().optional().transform((value) => value ?? false),
  description: z.string().max(500).nullable(),
  created_at: z.string().pipe(z.coerce.date()),
  has_frozen_balance: z.boolean(),
  is_banned: z.boolean(),
  ban_reason_code: z.string().nullable().optional(),
  ban_reason_text: z.string().nullable().optional(),
  is_active: z.boolean(),
  rating: z.number().int().nonnegative(),
  role: z.enum(['user', 'admin', 'partner']),
})

export type UserRead = z.infer<typeof UserReadSchema>

export const ProfileDataSchema = UserReadSchema
export type ProfileData = UserRead

export const PublicProfileDataSchema = z.object({
  username: z.string().min(4).max(32),
  nickname_style_id: nicknameStyleIdSchema,
  avatar_url: z.string().or(z.literal('')),
  profile_background_url: z
    .string()
    .or(z.literal(''))
    .optional()
    .transform((value) => value ?? ''),
  description: z.string().max(500).nullable(),
  is_active: z.boolean(),
  is_banned: z.boolean(),
  ban_reason_code: z.string().nullable().optional(),
  ban_reason_text: z.string().nullable().optional(),
  rating: z.number().int().nonnegative(),
  created_at: z.string().pipe(z.coerce.date()),
})

export type PublicProfileData = z.infer<typeof PublicProfileDataSchema>
