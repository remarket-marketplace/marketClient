import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatMessageUnion, ChatUpdateSchema } from '@/validation/chat/chatMessage'
import { defineStore } from 'pinia'

const STORAGE_KEY_PREFIX = 'market_notifications_inbox'
const MAX_NOTIFICATIONS = 80

export type InboxNotificationItem = {
  id: string
  chat_id: string
  message_id: string
  created_at: string
  message: ChatMessageUnion
  chat_title: string
  chat_type: 'chat' | 'support_chat' | null
  is_read: boolean
}

type NotificationContext = {
  userId: string
}

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`
}

function normalizeTimestamp(value: string | undefined): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    currentUserId: null as string | null,
    items: [] as InboxNotificationItem[],
  }),
  getters: {
    unreadTotal: (state) => state.items.reduce((total, item) => total + (item.is_read ? 0 : 1), 0),
    sortedItems: (state) => [...state.items].sort((a, b) => normalizeTimestamp(b.created_at) - normalizeTimestamp(a.created_at)),
  },
  actions: {
    initForUser(userId: string) {
      if (!userId) return
      if (this.currentUserId === userId) return
      this.currentUserId = userId
      this.items = this.loadFromStorage(userId)
    },

    clear() {
      this.currentUserId = null
      this.items = []
    },

    loadFromStorage(userId: string): InboxNotificationItem[] {
      if (typeof window === 'undefined') return []
      try {
        const raw = window.localStorage.getItem(getStorageKey(userId))
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
          .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
          .slice(0, MAX_NOTIFICATIONS) as InboxNotificationItem[]
      } catch {
        return []
      }
    },

    persist() {
      if (typeof window === 'undefined') return
      if (!this.currentUserId) return
      try {
        window.localStorage.setItem(getStorageKey(this.currentUserId), JSON.stringify(this.items.slice(0, MAX_NOTIFICATIONS)))
      } catch {
        // ignore localStorage quota/errors
      }
    },

    shouldCreateNotification(
      message: ChatMessageUnion,
      context: NotificationContext,
      unreadCount: number,
      options?: { isRealtime?: boolean },
    ): boolean {
      if (message.message_type === 'text_message' || message.message_type === 'image_message') {
        if (unreadCount <= 0) return false
        return message.sender_id !== context.userId
      }

      return options?.isRealtime === true || unreadCount > 0
    },

    upsertMessageNotification(params: {
      chatId: string
      message: ChatMessageUnion
      chatTitle: string
      chatType: 'chat' | 'support_chat' | null
      isRead: boolean
    }) {
      const itemId = `${params.chatId}:${params.message.id}`
      const existingIndex = this.items.findIndex((item) => item.id === itemId)

      const nextItem: InboxNotificationItem = {
        id: itemId,
        chat_id: params.chatId,
        message_id: params.message.id,
        created_at: params.message.created_at,
        message: params.message,
        chat_title: params.chatTitle,
        chat_type: params.chatType,
        is_read: params.isRead,
      }

      if (existingIndex === -1) {
        this.items.unshift(nextItem)
      } else {
        const current = this.items[existingIndex]
        if (!current) return
        this.items[existingIndex] = {
          ...nextItem,
          is_read: params.isRead ? current.is_read : false,
        }
      }

      this.items = this.items
        .sort((a, b) => normalizeTimestamp(b.created_at) - normalizeTimestamp(a.created_at))
        .slice(0, MAX_NOTIFICATIONS)
      this.persist()
    },

    markChatAsRead(chatId: string) {
      let changed = false
      this.items = this.items.map((item) => {
        if (item.chat_id !== chatId || item.is_read) return item
        changed = true
        return { ...item, is_read: true }
      })
      if (changed) this.persist()
    },

    markAsRead(notificationId: string) {
      const index = this.items.findIndex((item) => item.id === notificationId)
      if (index === -1) return
      const current = this.items[index]
      if (!current || current.is_read) return
      this.items[index] = { ...current, is_read: true }
      this.persist()
    },

    markAllAsRead() {
      let changed = false
      this.items = this.items.map((item) => {
        if (item.is_read) return item
        changed = true
        return { ...item, is_read: true }
      })
      if (changed) this.persist()
    },

    syncFromChats(chats: ChatListItem[], context: NotificationContext) {
      if (!context.userId) return
      for (const chat of chats) {
        if (!chat.last_message) continue
        if (!this.shouldCreateNotification(chat.last_message, context, chat.unread_count ?? 0)) {
          if ((chat.unread_count ?? 0) <= 0) {
            this.markChatAsRead(chat.id)
          }
          continue
        }
        this.upsertMessageNotification({
          chatId: chat.id,
          message: chat.last_message,
          chatTitle: chat.another_user.username,
          chatType: chat.chat_type,
          isRead: false,
        })
      }
    },

    handleChatUpdate(
      update: ChatUpdateSchema,
      chats: ChatListItem[],
      context: NotificationContext,
    ) {
      if (!context.userId) return
      if (!update.chat_id) return

      if ((update.unread_count ?? 0) <= 0) {
        this.markChatAsRead(update.chat_id)
      }

      if (!update.last_message) return
      if (
        !this.shouldCreateNotification(
          update.last_message,
          context,
          update.unread_count ?? 0,
          { isRealtime: true },
        )
      ) return

      const chat = chats.find((item) => item.id === update.chat_id)
      this.upsertMessageNotification({
        chatId: update.chat_id,
        message: update.last_message,
        chatTitle: chat?.another_user.username ?? '',
        chatType: chat?.chat_type ?? null,
        isRead: false,
      })
    },
  },
})
