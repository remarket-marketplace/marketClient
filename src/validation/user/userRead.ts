import { z } from 'zod'

const nicknameStyleIdSchema = z
  .string()
  .max(64)
  .nullish()
  .transform((value) => value ?? 'default')

const optionalDateSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return null
    const parsed = value instanceof Date ? value : new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  })

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
  last_seen_at: optionalDateSchema,
  average_first_response_time_seconds: z.number().int().nonnegative().nullable().optional(),
  rating: z.number().int().nonnegative(),
  role: z.enum(['user', 'admin', 'partner']),
  partner_type: z.enum(['raika', 'vpn']).nullable().optional(),
})

export type UserRead = z.infer<typeof UserReadSchema>

export const ProfileDataSchema = UserReadSchema
export type ProfileData = UserRead

export const PublicProfileDataSchema = z.object({
  id: z.string(),
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
  last_seen_at: optionalDateSchema,
  average_first_response_time_seconds: z.number().int().nonnegative().nullable().optional(),
  is_banned: z.boolean(),
  ban_reason_code: z.string().nullable().optional(),
  ban_reason_text: z.string().nullable().optional(),
  rating: z.number().int().nonnegative(),
  created_at: z.string().pipe(z.coerce.date()),
  is_subscribed: z.boolean().optional().transform((value) => value ?? false),
})

export type PublicProfileData = z.infer<typeof PublicProfileDataSchema>
