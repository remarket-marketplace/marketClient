import { literal, z } from 'zod'
import { PublicProfileDataSchema } from '../user/userRead'
import { ChatMessageUnionSchema } from './chatMessage'

export const ChatListItemSchema = z.object({
  id: z.string().uuid(),
  another_user: PublicProfileDataSchema,
  last_message: ChatMessageUnionSchema.nullable(),
  unread_count: z.number().default(0),
  chat_type: z.union([
    z.literal('chat'),
    z.literal('support_chat')
  ])
})

export type ChatListItem = z.infer<typeof ChatListItemSchema>

export const ChatListSchema = z.array(ChatListItemSchema)
