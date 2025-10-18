import { ChatArrayUnionSchema, ChatContentUnionSchema, type ChatContentUnion, type ChatMessage } from '@/validation/chat/chatMessage'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { ZodError } from 'zod'
import { httpClient } from '..'
import { ChatListSchema } from '@/validation/chat/ChatList'

let socket: Socket | null = null
type MessageCallback = (message: ChatMessage) => void
let onNewMessageCallback: MessageCallback | null = null
const API_HOST = import.meta.env.VITE_API_HOST

function isChatMessage(data: ChatContentUnion): data is ChatMessage {
    return 'sender_id' in data && 'text' in data
}

export const chatsService = {
  async getChats() {
    try {
      const response = await httpClient.get('/chats/')
      return ChatListSchema.parse(response.data)
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error('Zod validation error:', e.issues)
      }
      else {
        console.error('Get chats error:', e)
      }
      return []
    }
  },

  async getChatMessages(chatId: string): Promise<ChatContentUnion[]> {
    try {
      const response = await httpClient.get(`/chats/${chatId}/messages`)
      const validatedMessages = ChatArrayUnionSchema.parse(response.data)
      return validatedMessages
    }
    catch (e) {
      if (e instanceof ZodError) {
        console.error('Zod validation error:', e.issues)
      }
      else {
        console.error('Get chat messages error:', e)
      }
      return []
    }
  },

  async sendMessage(message: string, chatId: string) {
    if (!socket) {
      console.error('Socket not connected')
      return
    }
    console.warn('Emitting message:', { chat_id: chatId, message })
    socket.emit('send_message', { chat_id: chatId, message })
  },


  connectChat(chatId?: string) {
    if (socket) {
      console.warn('Socket already exists:', socket.id)
      if (chatId) {
        socket.emit('join_room', { chat_id: chatId })
      }
      return
    }

    socket = io(`${API_HOST}`, {
      transports: ['websocket'],
      withCredentials: true,
    })

    socket.on('new_message', (data: any) => {
      try {
        const validatedMessage = ChatContentUnionSchema.parse(data)

        if (isChatMessage(validatedMessage)) {
            const mappedMessage: ChatMessage = {
              id: validatedMessage.id,
              sender_id: validatedMessage.sender_id,
              text: validatedMessage.text,
              is_read: validatedMessage.is_read,
              created_at: validatedMessage.created_at,
              chat_room_id: validatedMessage.chat_room_id,
            }
            onNewMessageCallback?.(mappedMessage)
        } else {
            console.warn('Received a Product card instead of a ChatMessage via new_message socket event. Ignoring.')
        }

      }
      catch (e) {
        if (e instanceof ZodError) {
          console.error('Message validation error:', e.issues)
        }
        else {
          console.error('Message processing error:', e)
        }
      }
    })

    socket.on('disconnect', () => {
      // console.log('Socket disconnected')
    })
  },

  onNewMessage(callback: MessageCallback) {
    onNewMessageCallback = callback
  },
}
