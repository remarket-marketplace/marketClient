import { z } from 'zod'
import { ProductSchema } from '@/validation/product/product'

// Basic scheme
export const BaseMessageSchema = z.object({
  id: z.string(),
  chat_room_id: z.string(),
  created_at: z.string(),
  message_type: z.string(),
})
// Text message
export const TextMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('text_message'),
  sender_id: z.string(),
  text: z.string(),
  is_read: z.boolean(),
})


// Purchase message
export const ProductMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('purchase_message'),
  product: ProductSchema,
})


// Update deal status message
export const DealStatusMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('update_deal_status_message'),
  new_status: z.string(),
})


// discriminated union по полю message_type
export const ChatMessageUnionSchema = z.object({
  message: z.discriminatedUnion('message_type', [
    TextMessageSchema,
    ProductMessageSchema,
    DealStatusMessageSchema,
  ])
})


export const ChatUpdateSchema = z.object({
  chat_id: z.string(),
  last_message: ChatMessageUnionSchema,
  unread_count: z.number(),
})

export type ChatMessageUnion = z.infer<typeof ChatMessageUnionSchema>
export type ChatUpdateSchema = z.infer<typeof ChatUpdateSchema>
export const ChatArrayUnionSchema = z.array(ChatMessageUnionSchema)