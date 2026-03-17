import { z } from "zod"

export const InboxNotificationSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  title_i18n_key: z.string(),
  body_i18n_key: z.string().nullable().optional().transform((value) => value ?? null),
  body_i18n_params: z.record(z.string(), z.any()).nullable().optional().transform((value) => value ?? null),
  target_url: z.string().nullable().optional().transform((value) => value ?? null),
  payload: z.record(z.string(), z.any()).nullable().optional().transform((value) => value ?? null),
  is_read: z.boolean(),
  created_at: z.string(),
})

export type InboxNotification = z.infer<typeof InboxNotificationSchema>

export const InboxNotificationsListSchema = z.object({
  notifications: z.array(InboxNotificationSchema),
  unread_total: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
})

export type InboxNotificationsList = z.infer<typeof InboxNotificationsListSchema>
