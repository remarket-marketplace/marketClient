import { z } from 'zod'
import { PublicProfileDataSchema } from '../user/userRead'
import { ChatMessageUnionSchema } from './chatMessage'

export const ChatListItemSchema = z.object({
  id: z.string().uuid(),
  another_user: PublicProfileDataSchema,
  last_message: ChatMessageUnionSchema,
})

export type ChatListItem = z.infer<typeof ChatListItemSchema>

export const ChatListSchema = z.array(ChatListItemSchema)