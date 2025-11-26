import {
  ChatArrayUnionSchema,
  ChatMessageUnionSchema,
  ChatUpdateSchema,
  type ChatMessageUnion,
} from '@/validation/chat/chatMessage'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { httpClient } from '..'
import { ChatListSchema } from '@/validation/chat/ChatList'
import { da } from 'zod/locales'
import type { DefaultLocaleMessageSchema } from 'vue-i18n'
import ChatMessage from '@/components/chats/ChatMessage.vue'

let socket: Socket | null = null

type MessageCallback = (message: ChatMessageUnion) => void
type ChatUpdatedCallback = (data: ChatUpdateSchema) => void
type ChatNotificationCallback = (data: ChatUpdateSchema) => void

const WS_API_HOST = import.meta.env.VITE_WS_API_HOST

let onNewMessageCallback: MessageCallback | null = null
let onChatUpdatedCallback: ChatUpdatedCallback | null = null
let onChatNotificationCallback: ChatNotificationCallback | null = null

let lastSubscribedChatId: string | null = null

export const chatsService = {
  async getChats() {
    try {
      const response = await httpClient.get('/chats/')
      return ChatListSchema.parse(response.data)
    } catch (e) {
      console.error('Ошибка получения списка чатов:', e)
      return []
    }
  },

  /** Проверка подключения */
  isConnected() {
    return socket?.connected === true
  },

  /** Подключение с нормальной обработкой ошибок */
  async connectChatsWebsocket(): Promise<boolean> {
    return new Promise((resolve) => {
      if (socket?.connected) return resolve(true)

      socket = io(`${WS_API_HOST}`, {
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })

      /** SUCCESS */
      socket.on('connect', () => {
        console.log('%cWS connected ✓', 'color: green')
        if (lastSubscribedChatId) {
          socket!.emit('join_room', { chat_id: lastSubscribedChatId })
        }
        socket!.emit('subscribe_chat_list')
        resolve(true)
      })

      /** ERROR */
      socket.on('connect_error', (err) => {
        console.error('WS connect error:', err)
        resolve(false)
      })

      /** DISCONNECT */
      socket.on('disconnect', (reason) => {
        console.warn('WS disconnected:', reason)
      })

      /** RECONNECT */
      socket.on('reconnect', () => {
        console.log('%cWS reconnected ✓', 'color: orange')
        if (lastSubscribedChatId) {
          socket!.emit('join_room', { chat_id: lastSubscribedChatId })
        }
        socket!.emit('subscribe_chat_list')
      })

      socket.on('new_message', (data: any) => {
        try {
          const payload = data.message ?? data
          const validated = ChatMessageUnionSchema.parse(payload)
          onNewMessageCallback?.(validated)
        } catch (e) {
          console.error('Ошибка валидации нового сообщения:', e)
        }
      })

      socket.on('chat_updated', (data: any) => {
        try {
          const lastMsg = data.last_message ? (data.last_message.message ?? data.last_message) : undefined
          const validated: ChatUpdateSchema = {
            chat_id: data.chat_id,
            last_message: lastMsg ? ChatMessageUnionSchema.parse(lastMsg) : undefined,
            unread_count: data.unread_count || 0,
          }
          onChatUpdatedCallback?.(validated)
        } catch (e) {
          console.error('Ошибка валидации обновления чата:', e)
        }
      })
    })
  },

  async subscribeChatList() {
    if (!this.isConnected()) return console.warn('WS offline: subscribeChatList skipped')
    socket!.emit('subscribe_chat_list')
  },

  async unsubscribeChatList() {
    if (!this.isConnected()) return
    socket!.emit('unsubscribe_chat_list')
  },

  async joinChat(chatId: string) {
    lastSubscribedChatId = chatId
    if (!this.isConnected()) {
      console.warn('WS offline: joinChat scheduled')
      return
    }
    socket!.emit('join_room', { chat_id: chatId })
  },

  async getChatMessages(chatId: string) {
    try {
      const resp = await httpClient.get(`/chats/${chatId}/messages`)
      return ChatArrayUnionSchema.parse(resp.data)
    } catch (e) {
      console.error('Ошибка получения сообщений:', e)
      return []
    }
  },

  /** Теперь отправка сообщения надёжная */
  async sendMessage(message: string, chatId: string): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('WS offline → retry in 500ms')
      await new Promise(r => setTimeout(r, 500))

      if (!this.isConnected()) {
        console.error('Socket не подключен даже после retry')
        return false
      }
    }

    try {
      socket!.emit('send_message', { chat_id: chatId, message })
      return true
    } catch (e) {
      console.error('Ошибка отправки сообщения:', e)
      return false
    }
  },

  onNewMessage(cb: MessageCallback | null) { onNewMessageCallback = cb },
  onChatUpdated(cb: ChatUpdatedCallback | null) { onChatUpdatedCallback = cb },
  onChatNotification(cb: ChatNotificationCallback | null) { onChatNotificationCallback = cb },

  disconnect() {
    socket?.disconnect()
    socket = null
    onNewMessageCallback = null
    onChatUpdatedCallback = null
    onChatNotificationCallback = null
  },
}
