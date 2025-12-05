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

let socket: Socket | null = null

type MessageCallback = (message: ChatMessageUnion) => void
type ChatUpdatedCallback = (data: ChatUpdateSchema) => void
type ChatNotificationCallback = (data: ChatUpdateSchema) => void

const WS_API_HOST = import.meta.env.VITE_WS_API_HOST

const newMessageCallbacks: MessageCallback[] = []
const chatUpdatedCallbacks: ChatUpdatedCallback[] = []
const chatNotificationCallbacks: ChatNotificationCallback[] = []

let lastSubscribedChatId: string | null = null
let heartbeatIntervalHandle: number | null = null
let onlineHandlerRegistered = false
let visibilityHandlerRegistered = false

export const chatsService = {
  async getChats() {
    try {
      const response = await httpClient.get('/chats/')
      return ChatListSchema.parse(response.data)
    } catch (e) {
      console.error('Error fetching chat list:', e)
      return []
    }
  },

  isConnected() {
    return socket?.connected === true
  },

  /** Connection with proper error handling */
  async connectChatsWebsocket(): Promise<boolean> {
    return new Promise((resolve) => {
      if (socket?.connected) return resolve(true)

      socket = io(`${WS_API_HOST}`, {
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      })

      socket.on('connect', () => {
        console.log('%cWS connected ✓', 'color: green')
        if (lastSubscribedChatId) {
          socket!.emit('join_room', { chat_id: lastSubscribedChatId })
        }
        socket!.emit('subscribe_chat_list')
        if (!heartbeatIntervalHandle) {
          heartbeatIntervalHandle = window.setInterval(() => {
            if (socket?.connected) {
              socket!.emit('ping_alive')
            }
          }, 15000)
        }
        if (!onlineHandlerRegistered) {
          window.addEventListener('online', () => {
            this.connectChatsWebsocket()
          })
          window.addEventListener('offline', () => {
            console.warn('Network offline')
          })
          onlineHandlerRegistered = true
        }
        if (!visibilityHandlerRegistered) {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              this.connectChatsWebsocket()
            }
          })
          visibilityHandlerRegistered = true
        }
        resolve(true)
      })

      socket.on('connect_error', (err) => {
        console.error('WS connect error:', err)
        resolve(false)
      })

      socket.on('disconnect', (reason) => {
        console.warn('WS disconnected:', reason)
      })

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
          newMessageCallbacks.forEach(cb => cb(validated))
        } catch (e) {
          console.error('Error validating new message:', e)
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
          chatUpdatedCallbacks.forEach(cb => cb(validated))
        } catch (e) {
          console.error('Error validating chat update:', e)
        }
      })

      socket.on('chat_notification', (data: any) => {
        try {
          const lastMsg = data.last_message ? (data.last_message.message ?? data.last_message) : undefined
          const validated: ChatUpdateSchema = {
            chat_id: data.chat_id,
            last_message: lastMsg ? ChatMessageUnionSchema.parse(lastMsg) : undefined,
            unread_count: data.unread_count || 0,
          }
          chatNotificationCallbacks.forEach(cb => cb(validated))
        } catch (e) {
          console.error('Error validating chat notification:', e)
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
      console.error('Error fetching messages:', e)
      return []
    }
  },

  async sendMessage(message: string, chatId: string): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('WS offline → retry in 500ms')
      await new Promise(r => setTimeout(r, 500))

      if (!this.isConnected()) {
        console.error('Socket not connected even after retry')
        return false
      }
    }

    try {
      socket!.emit('send_message', { chat_id: chatId, message })
      return true
    } catch (e) {
      console.error('Error sending message:', e)
      return false
    }
  },

  onNewMessage(cb: MessageCallback | null) {
    if (cb === null) {
      newMessageCallbacks.length = 0
      return () => {}
    }
    newMessageCallbacks.push(cb)
    return () => {
      const idx = newMessageCallbacks.indexOf(cb)
      if (idx !== -1) newMessageCallbacks.splice(idx, 1)
    }
  },

  onChatUpdated(cb: ChatUpdatedCallback | null) {
    if (cb === null) {
      chatUpdatedCallbacks.length = 0
      return () => {}
    }
    chatUpdatedCallbacks.push(cb)
    return () => {
      const idx = chatUpdatedCallbacks.indexOf(cb)
      if (idx !== -1) chatUpdatedCallbacks.splice(idx, 1)
    }
  },

  onChatNotification(cb: ChatNotificationCallback | null) {
    if (cb === null) {
      chatNotificationCallbacks.length = 0
      return () => {}
    }
    chatNotificationCallbacks.push(cb)
    return () => {
      const idx = chatNotificationCallbacks.indexOf(cb)
      if (idx !== -1) chatNotificationCallbacks.splice(idx, 1)
    }
  },

  disconnect() {
    socket?.disconnect()
    socket = null
    newMessageCallbacks.length = 0
    chatUpdatedCallbacks.length = 0
    chatNotificationCallbacks.length = 0
    if (heartbeatIntervalHandle) {
      clearInterval(heartbeatIntervalHandle)
      heartbeatIntervalHandle = null
    }
    lastSubscribedChatId = null
  },
}
