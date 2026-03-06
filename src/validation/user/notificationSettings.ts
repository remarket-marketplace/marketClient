import { z } from 'zod'

export const NotificationSettingsSchema = z.object({
  email_notifications_enabled: z.boolean(),
  telegram_notifications_enabled: z.boolean(),
  telegram_connected: z.boolean(),
  telegram_username: z.string().nullable().optional().transform((value) => value ?? null),
  telegram_bot_username: z.string().nullable().optional().transform((value) => value ?? null),
})

export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>

export const NotificationSettingsUpdateSchema = z.object({
  email_notifications_enabled: z.boolean().optional(),
  telegram_notifications_enabled: z.boolean().optional(),
})

export type NotificationSettingsUpdate = z.infer<typeof NotificationSettingsUpdateSchema>

export const TelegramConnectLinkSchema = z.object({
  connect_url: z.string().url(),
  expires_in_seconds: z.number().int().positive(),
})

export type TelegramConnectLink = z.infer<typeof TelegramConnectLinkSchema>
