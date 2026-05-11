import { z } from 'zod'
import { ProductSchema } from '@/validation/product/product'
import { ReviewSchema } from '../review/review'

// Базовая схема
export const BaseMessageSchema = z.object({
  id: z.string(),
  chat_room_id: z.string(),
  created_at: z.string(),
  message_type: z.string(),
})

// Текстовое сообщение
export const TextMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('text_message'),
  sender_id: z.string(),
  text: z.string(),
  is_admin_message: z.boolean(),
  is_read: z.boolean(),
  data: z.record(z.string(), z.any()).nullable().optional(),
})

export const ImageMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('image_message'),
  sender_id: z.string(),
  text: z.string(),
  is_read: z.boolean(),
  data: z.record(z.string(), z.any()).nullable().optional(),
})

// Сообщение о покупке
export const ProductMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('purchase_message'),
  product: ProductSchema,
  deal_status: z.string(),
  deal_id: z.uuid(),
  has_review: z.boolean(),
})

// Сообщение об обновлении статуса сделки
export const DealStatusMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('update_deal_status_message'),
  product: ProductSchema,
  new_status: z.string(),
  deal_id: z.uuid(),
})

export const ReviewMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('review_message'),
  product: ProductSchema,
  review: ReviewSchema,
})

export const PriceOfferMessageSchema = BaseMessageSchema.extend({
  message_type: z.literal('price_offer_message'),
  product: ProductSchema,
  offer_id: z.uuid(),
  offered_price: z.number(),
  offer_status: z.string(),
  offer_message: z.string().nullable().optional(),
  buyer_id: z.uuid(),
  seller_id: z.uuid(),
  accepted_deal_id: z.uuid().nullable().optional(),
})

// discriminated union по полю message_type
export const ChatMessageUnionSchema = z.discriminatedUnion('message_type', [
  TextMessageSchema,
  ImageMessageSchema,
  ProductMessageSchema,
  DealStatusMessageSchema,
  ReviewMessageSchema,
  PriceOfferMessageSchema,
])

// Схема обновления чата
export const ChatUpdateSchema = z.object({
  chat_id: z.string(),
  last_message: ChatMessageUnionSchema.optional(),
  unread_count: z.number(),
  support_ticket_status: z.string().nullable().optional(),
})

export const MessagesReadSchema = z.object({
  chat_id: z.string(),
  message_ids: z.array(z.string()),
})

// Массив сообщений
export const ChatArrayUnionSchema = z.array(ChatMessageUnionSchema)

export type ChatMessageUnion = z.infer<typeof ChatMessageUnionSchema>
export type ChatUpdateSchema = z.infer<typeof ChatUpdateSchema>
export type MessagesReadPayload = z.infer<typeof MessagesReadSchema>
export type PurchaseMessage = z.infer<typeof ProductMessageSchema>

export type DealStatusMessageSchema = z.infer<typeof DealStatusMessageSchema>
