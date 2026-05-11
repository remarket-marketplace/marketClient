import { defineStore } from 'pinia'
import type { ChatListItem } from '@/validation/chat/ChatList'
import type { ChatUpdateSchema } from '@/validation/chat/chatMessage'
import type { ChatMessageUnion } from '@/validation/chat/chatMessage'

export const useChatStore = defineStore('chat', {
  state: () => ({
    chats: [] as ChatListItem[],
    activeChatId: null as string | null,
  }),
  getters: {
    unreadTotal: (state) => state.chats.reduce((sum, chat) => sum + (chat.unread_count ?? 0), 0),
    unreadDialogTotal: (state) => state.chats.filter((chat) => (chat.unread_count ?? 0) > 0).length,
  },
  actions: {
    getMessageTimestamp(message?: ChatMessageUnion | null): number {
      if (!message?.created_at) return 0
      const timestamp = new Date(message.created_at).getTime()
      return Number.isFinite(timestamp) ? timestamp : 0
    },
    shouldApplyLastMessage(
      currentMessage?: ChatMessageUnion | null,
      incomingMessage?: ChatMessageUnion | null,
    ): boolean {
      if (!incomingMessage) return false
      if (!currentMessage) return true

      const currentTs = this.getMessageTimestamp(currentMessage)
      const incomingTs = this.getMessageTimestamp(incomingMessage)

      if (incomingTs > currentTs) return true
      if (incomingTs < currentTs) return false

      // Equal timestamp: allow same message updates (read-state changes).
      return incomingMessage.id === currentMessage.id
    },
    setChats(list: ChatListItem[]) {
      this.chats = list
    },
    clear() {
      this.chats = []
      this.activeChatId = null
    },
    setActive(chatId: string | null) {
      this.activeChatId = chatId
    },
    updateChatFromSocket(update: ChatUpdateSchema) {
      const chat = this.chats.find((c) => c.id === update.chat_id)
      if (!chat) return
      const unreadCount = this.activeChatId === update.chat_id ? 0 : update.unread_count
      if (update.last_message) {
        const incoming = update.last_message as ChatMessageUnion
        if (incoming.message_type === 'update_deal_status_message') {
          if (typeof unreadCount === 'number') chat.unread_count = unreadCount
          return
        }
        if (this.shouldApplyLastMessage(chat.last_message as ChatMessageUnion | null, incoming)) {
          chat.last_message = incoming
        }
      }
      if (typeof unreadCount === 'number') chat.unread_count = unreadCount
      if (typeof update.support_ticket_status === 'string') {
        chat.support_ticket_status = update.support_ticket_status
      }
    },
    resetUnread(chatId: string) {
      const chat = this.chats.find((c) => c.id === chatId)
      if (chat) chat.unread_count = 0
    },
    markMessagesRead(chatId: string, messageIds: string[]) {
      const chat = this.chats.find((c) => c.id === chatId)
      if (!chat?.last_message) return
      if (
        chat.last_message.message_type !== 'text_message'
        && chat.last_message.message_type !== 'image_message'
      ) return
      if (messageIds.includes(chat.last_message.id)) {
        chat.last_message.is_read = true
      }
    },
  },
})
