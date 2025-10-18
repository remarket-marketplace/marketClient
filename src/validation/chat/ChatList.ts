import { z } from 'zod'
import { PublicProfileDataSchema } from '../user/userRead'

export const ChatListItemSchema = z.object({
  id: z.string().uuid(),
  another_user: PublicProfileDataSchema,
})

export type ChatListItem = z.infer<typeof ChatListItemSchema>

export const ChatListSchema = z.array(ChatListItemSchema)