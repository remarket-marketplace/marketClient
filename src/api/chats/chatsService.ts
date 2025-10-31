import { ChatArrayUnionSchema, ChatContentUnionSchema, type ChatContentUnion, type ChatMessage } from '@/validation/chat/chatMessage'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { ZodError } from 'zod'
import { httpClient } from '..'
import { ChatListSchema } from '@/validation/chat/ChatList'

let socket: Socket | null = null
type MessageCallback = (message: ChatMessage) => void
let onNewMessageCallback: MessageCallback | null = null
const WS_API_HOST = import.meta.env.VITE_WS_API_HOST

function isChatMessage(data: ChatContentUnion): data is ChatMessage {
    return 'sender_id' in data && 'text' in data
}

// Логгер с уровнями для удобства
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[CHAT SERVICE INFO] ${message}`, data ? data : '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[CHAT SERVICE WARN] ${message}`, data ? data : '')
  },
  error: (message: string, error?: any) => {
    console.error(`[CHAT SERVICE ERROR] ${message}`, error ? error : '')
  },
  debug: (message: string, data?: any) => {
    console.debug(`[CHAT SERVICE DEBUG] ${message}`, data ? data : '')
  }
}

export const chatsService = {
  async getChats() {
    logger.info('Fetching chats list...')
    try {
      const response = await httpClient.get('/chats/')
      logger.debug('Raw response from getChats:', response.data)
      
      const validatedData = ChatListSchema.parse(response.data)
      logger.info(`Successfully fetched ${validatedData.length} chats`)
      return validatedData
    }
    catch (e) {
      if (e instanceof ZodError) {
        logger.error('Zod validation error in getChats:', {
          issues: e.issues,
          data: e.message
        })
      }
      else {
        logger.error('Get chats API error:', e)
      }
      return []
    }
  },

  async getChatMessages(chatId: string): Promise<ChatContentUnion[]> {
    logger.info(`Fetching messages for chat: ${chatId}`)
    try {
      const response = await httpClient.get(`/chats/${chatId}/messages`)
      logger.debug(`Raw messages response for chat ${chatId}:`, response.data)
      
      const validatedMessages = ChatArrayUnionSchema.parse(response.data)
      logger.info(`Successfully fetched ${validatedMessages.length} messages for chat ${chatId}`)
      return validatedMessages
    }
    catch (e) {
      if (e instanceof ZodError) {
        logger.error(`Zod validation error for chat ${chatId} messages:`, {
          issues: e.issues,
          chatId
        })
      }
      else {
        logger.error(`Get chat messages error for chat ${chatId}:`, e)
      }
      return []
    }
  },

  async sendMessage(message: string, chatId: string) {
    logger.info(`Attempting to send message to chat ${chatId}`, {
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    })

    if (!socket) {
      logger.error('Socket not connected when trying to send message', {
        chatId,
        messageLength: message.length
      })
      return
    }

    if (!socket.connected) {
      logger.warn('Socket exists but not connected. Current socket state:', {
        connected: socket.connected,
        disconnected: socket.disconnected,
        id: socket.id
      })
    }

    try {
      logger.debug('Emitting send_message event:', { 
        chat_id: chatId, 
        messageLength: message.length 
      })
      
      socket.emit('send_message', { chat_id: chatId, message })
      logger.info(`Message emitted successfully to chat ${chatId}`)
      
    } catch (error) {
      logger.error('Error while sending message via websocket:', {
        error,
        chatId,
        messageLength: message.length
      })
    }
  },

  async connectChat(chatId?: string) {
    logger.info('connectChat called', { chatId, hasExistingSocket: !!socket })

    if (socket) {
      logger.debug('Existing socket found', {
        connected: socket.connected,
        socketId: socket.id,
        chatId
      })

      if (!socket.connected) {
        logger.warn('Existing socket is disconnected. Attempting to reconnect...')
        try {
          socket.connect()
          logger.info('Socket reconnection initiated')
        } catch (error) {
          logger.error('Error during socket reconnection:', error)
          return
        }
      }
      
      if (chatId) {
        logger.info('Joining room with existing socket:', chatId)
        socket.emit('join_room', { chat_id: chatId })
      }
      return
    }

    // Создание нового сокета
    logger.info('Creating new socket connection', { 
      WS_API_HOST,
      chatId 
    })

    try {
      socket = io(`${WS_API_HOST}`, {
        transports: ['websocket'],
        withCredentials: true,
      })

      logger.info('Socket instance created', { 
        socketId: socket.id,
        connected: socket.connected 
      })

      // Обработчики событий сокета
      socket.on('connect', () => {
        logger.info('Socket connected successfully', {
          socketId: socket?.id,
          chatId
        })

        if (chatId) {
          logger.info('Auto-joining room after connection:', chatId)
          socket!.emit('join_room', { chat_id: chatId })
        }
      })

      socket.on('connect_error', (error) => {
        logger.error('Socket connection error:', {
          error: error.message,
          name: error.name,
          chatId
        })
      })

      socket.on('disconnect', (reason) => {
        logger.warn('Socket disconnected', {
          reason,
          socketId: socket?.id,
          chatId
        })
      })

      socket.on('error', (error) => {
        logger.error('Socket error event:', {
          error,
          socketId: socket?.id
        })
      })

      socket.on('join_room_success', (data) => {
        logger.info('Successfully joined room', {
          room: data.room,
          socketId: socket?.id
        })
      })

      socket.on('join_room_error', (data) => {
        logger.error('Error joining room', {
          error: data.message,
          room: data.room,
          socketId: socket?.id
        })
      })

      // Обработчик новых сообщений
      socket.on('new_message', (data: any) => {
        logger.debug('Received new_message event', { 
          data,
          chatId 
        })

        try {
          const validatedMessage = ChatContentUnionSchema.parse(data)
          logger.debug('Message validated successfully', {
            id: validatedMessage.id
          })

          if (isChatMessage(validatedMessage)) {
            logger.info('Processing ChatMessage', {
              messageId: validatedMessage.id,
              sender: validatedMessage.sender_id,
              chatId: validatedMessage.chat_room_id
            })

            const mappedMessage: ChatMessage = {
              id: validatedMessage.id,
              sender_id: validatedMessage.sender_id,
              text: validatedMessage.text,
              is_read: validatedMessage.is_read,
              created_at: validatedMessage.created_at,
              chat_room_id: validatedMessage.chat_room_id,
            }

            if (onNewMessageCallback) {
              logger.debug('Calling onNewMessageCallback with message', {
                messageId: mappedMessage.id
              })
              onNewMessageCallback(mappedMessage)
            } else {
              logger.warn('No callback registered for new messages')
            }
          } else {
            logger.warn('Received Product card instead of ChatMessage, ignoring', {
              id: validatedMessage.id
            })
          }

        } catch (e) {
          if (e instanceof ZodError) {
            logger.error('Message validation error:', {
              issues: e.issues,
              rawData: data,
              chatId
            })
          } else {
            logger.error('Message processing error:', {
              error: e,
              rawData: data,
              chatId
            })
          }
        }
      })

      // Первое присоединение к комнате
      if (chatId) {
        logger.info('Initial room join after socket creation:', chatId)
        socket.emit('join_room', { chat_id: chatId })
      }

    } catch (error) {
      logger.error('Error during socket creation:', error)
      socket = null
    }
  },

  onNewMessage(callback: MessageCallback) {
    logger.info('Setting new message callback')
    onNewMessageCallback = callback
  },

  // Дополнительные методы для отладки
  getSocketState() {
    const state = socket ? {
      connected: socket.connected,
      id: socket.id,
      disconnected: socket.disconnected
    } : null
    
    logger.debug('Current socket state:', state)
    return state
  },

  disconnect() {
    if (socket) {
      logger.info('Manually disconnecting socket', { socketId: socket.id })
      socket.disconnect()
      socket = null
      onNewMessageCallback = null
    } else {
      logger.warn('No socket to disconnect')
    }
  },

  // Метод для тестирования соединения
  testConnection() {
    if (socket && socket.connected) {
      logger.info('Socket connection test: OK', { socketId: socket.id })
      return true
    } else {
      logger.warn('Socket connection test: FAILED', {
        hasSocket: !!socket,
        isConnected: socket?.connected
      })
      return false
    }
  }
}