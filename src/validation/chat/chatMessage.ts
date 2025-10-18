import { z } from 'zod'
import { ProductSchema } from '../product/product'

// Схема для входящих сообщений (с сервера)
export const ChatMessageSchema = z.object({
  id: z.string(),
  sender_id: z.string(),
  text: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
  chat_room_id: z.string(),
})

// Схема для отправки сообщений
export const SendMessageSchema = z.object({
  chat_id: z.string(),
  message: z.string().min(1),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const ChatContentUnionSchema = z.union([
  ProductSchema, // Попробует валидировать как продукт
  ChatMessageSchema, // Попробует валидировать как сообщение
])

export type ChatContentUnion = z.infer<typeof ChatContentUnionSchema>
export const ChatArrayUnionSchema = z.array(ChatContentUnionSchema)