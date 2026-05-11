import { z } from 'zod'
import { PublicProfileDataSchema } from '../user/userRead'
import { ChatMessageUnionSchema } from './chatMessage'

export const ChatListItemSchema = z.object({
  id: z.string().uuid(),
  another_user: PublicProfileDataSchema,
  last_message: ChatMessageUnionSchema.nullable(),
  unread_count: z.number().default(0),
  // Optional support case lifecycle flags (backward-compatible).
  // Backend may expose one of these fields for support chats.
  support_ticket_status: z.string().nullable().optional().transform((value) => value ?? undefined),
  support_status: z.string().optional(),
  is_closed: z.boolean().optional(),
  is_resolved: z.boolean().optional(),
  chat_type: z.union([
    z.literal('chat'),
    z.literal('support_chat')
  ])
})

export type ChatListItem = z.infer<typeof ChatListItemSchema>

export const ChatListSchema = z.array(ChatListItemSchema)
