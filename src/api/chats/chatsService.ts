import { 
  ChatArrayUnionSchema, 
  ChatContentUnionSchema, 
  type ChatContentUnion, 
  type ChatMessage
} from '@/validation/chat/chatMessage'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { httpClient } from '..'
import { ChatListSchema } from '@/validation/chat/ChatList'


let socket: Socket | null = null

// Типы для колбэков
type MessageCallback = (message: ChatMessage) => void
type ChatUpdatedCallback = (data: ChatUpdateData) => void
type ChatNotificationCallback = (data: ChatUpdateData) => void

// Тип для данных обновления чата
interface ChatUpdateData {
  chat_id: string
  last_message: string
  last_message_time: string
  last_message_sender: string
  unread_count: number
}

const WS_API_HOST = import.meta.env.VITE_WS_API_HOST

// Колбэки для разных событий
let onNewMessageCallback: MessageCallback | null = null
let onChatUpdatedCallback: ChatUpdatedCallback | null = null
let onChatNotificationCallback: ChatNotificationCallback | null = null

function isChatMessage(data: ChatContentUnion): data is ChatMessage {
  return 'sender_id' in data && 'text' in data
}

export const chatsService = {
  async getChats() {
    try {
      const response = await httpClient.get('/chats/')
      const validatedData = ChatListSchema.parse(response.data)
      return validatedData
    } catch (e) {
      console.error('Ошибка получения списка чатов:', e)
      return []
    }
  },

  async subscribeChatList() {
    if (socket && socket.connected) {
      socket.emit('subscribe_chat_list')
    } else {
      console.warn('Socket не подключен для подписки на список чатов')
    }
  },

  async unsubscribeChatList() {
    if (socket && socket.connected) {
      socket.emit('unsubscribe_chat_list')
    }
  },

  async joinChat(chatId: string) {
    if (socket && socket.connected) {
      socket.emit('join_room', { chat_id: chatId })
    } else {
      console.warn('Socket не подключен для входа в чат')
    }
  },

  async getChatMessages(chatId: string): Promise<ChatContentUnion[]> {
    try {
      const response = await httpClient.get(`/chats/${chatId}/messages`)
      const validatedMessages = ChatArrayUnionSchema.parse(response.data)
      return validatedMessages
    } catch (e) {
      console.error(`Ошибка получения сообщений чата ${chatId}:`, e)
      return []
    }
  },

  async sendMessage(message: string, chatId: string) {
    if (!socket || !socket.connected) {
      console.error('Socket не подключен для отправки сообщения')
      return false
    }

    try {
      socket.emit('send_message', { chat_id: chatId, message })
      return true
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      return false
    }
  },

  async connectChatsWebsocket() {
    if (socket?.connected) {
      return true
    }

    // if socket exists but not not connected - reconnect
    if (socket && !socket.connected) {
      try {
        socket.connect()
        return true
      } catch (error) {
        return false
      }
    }

    // create new connection
    try {
      socket = io(`${WS_API_HOST}`, {
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      // handler of new chat messages
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
              message_type: validatedMessage.message_type
            }

            if (onNewMessageCallback) {
              onNewMessageCallback(mappedMessage)
            }
          }
        } catch (e) {
          console.error('Ошибка валидации нового сообщения:', e)
        }
      })

      // handler of chat update event
      socket.on('chat_updated', (data: any) => {
        try {
          const updateData: ChatUpdateData = {
            chat_id: String(data.chat_id),
            last_message: data.last_message,
            last_message_time: data.last_message_time,
            last_message_sender: data.last_message_sender,
            unread_count: data.unread_count || 0
          }

          if (onChatUpdatedCallback) {
            onChatUpdatedCallback(updateData)
          }
        } catch (e) {
          console.error('Ошибка обработки обновления чата:', e)
        }
      })

      // handler of chat notification event
      socket.on('chat_notification', (data: any) => {
        try {
          const notificationData: any = {
            chat_id: String(data.chat_id),
            last_message: data.last_message,
            last_message_time: data.last_message_time,
            last_message_sender: data.last_message_sender,
            unread_count: data.unread_count || 0
          }

          if (onChatNotificationCallback) {
            onChatNotificationCallback(notificationData)
          }
        } catch (e) {
          console.error('Ошибка обработки уведомления:', e)
        }
      })

      return true
    } catch (error) {
      console.error('Ошибка создания WebSocket подключения:', error)
      socket = null
      return false
    }
  },

  // callback for new chat messages
  onNewMessage(callback: MessageCallback | null) {
    onNewMessageCallback = callback
  },

  // callback for chat update
  onChatUpdated(callback: ChatUpdatedCallback | null) {
    onChatUpdatedCallback = callback
  },

  // callback for chat notifications
  onChatNotification(callback: ChatNotificationCallback | null) {
    onChatNotificationCallback = callback
  },

  getSocketState() {
    const state = socket ? {
      connected: socket.connected,
      id: socket.id,
      disconnected: socket.disconnected
    } : null
    
    return state
  },

  disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
      // break all callbacks
      onNewMessageCallback = null
      onChatUpdatedCallback = null
      onChatNotificationCallback = null
    }
  },

  reconnect() {
    this.disconnect()
    return this.connectChatsWebsocket()
  },

  // check connection
  testConnection() {
    return socket ? socket.connected : false
  }
}