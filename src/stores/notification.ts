import { notificationsService } from "@/api/notifications/NotificationsService"
import type { InboxNotification } from "@/validation/user/inboxNotifications"
import { defineStore } from "pinia"

const INBOX_PAGE_SIZE = 60

function toTimestamp(value: string | undefined): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function countUnread(items: InboxNotification[]): number {
  return items.reduce((total, item) => total + (item.is_read ? 0 : 1), 0)
}

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    currentUserId: null as string | null,
    items: [] as InboxNotification[],
    unreadTotal: 0,
    total: 0,
    totalPages: 0,
    isLoaded: false,
    isLoading: false,
  }),
  getters: {
    sortedItems: (state) => [...state.items].sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at)),
  },
  actions: {
    initForUser(userId: string) {
      if (!userId) return
      if (this.currentUserId === userId) return
      this.currentUserId = userId
      this.items = []
      this.unreadTotal = 0
      this.total = 0
      this.totalPages = 0
      this.isLoaded = false
      this.isLoading = false
    },

    clear() {
      this.currentUserId = null
      this.items = []
      this.unreadTotal = 0
      this.total = 0
      this.totalPages = 0
      this.isLoaded = false
      this.isLoading = false
    },

    async loadInbox(force = false) {
      if (!this.currentUserId) return
      if (this.isLoading) return
      if (this.isLoaded && !force) return

      this.isLoading = true
      try {
        const response = await notificationsService.getInboxNotifications(1, INBOX_PAGE_SIZE)
        if (!response.success || !response.data) {
          return
        }
        this.items = response.data.notifications
        this.unreadTotal = response.data.unread_total
        this.total = response.data.total
        this.totalPages = response.data.total_pages
        this.isLoaded = true
      } finally {
        this.isLoading = false
      }
    },

    pushRealtimeNotification(payload: unknown) {
      const parsed = notificationsService.parseNotificationPayload(payload)
      if (!parsed) return

      const existingIndex = this.items.findIndex((item) => item.id === parsed.id)
      if (existingIndex === -1) {
        this.items.unshift(parsed)
      } else {
        this.items[existingIndex] = parsed
      }

      this.items = this.items
        .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
        .slice(0, INBOX_PAGE_SIZE)
      this.total = Math.max(this.total, this.items.length)
      this.unreadTotal = countUnread(this.items)
    },

    async markAsRead(notificationId: string) {
      const index = this.items.findIndex((item) => item.id === notificationId)
      if (index === -1) return

      const current = this.items[index]
      if (!current || current.is_read) return

      this.items[index] = { ...current, is_read: true }
      this.unreadTotal = countUnread(this.items)
      await notificationsService.markNotificationAsRead(notificationId)
    },

    async markAllAsRead() {
      let changed = false
      this.items = this.items.map((item) => {
        if (item.is_read) return item
        changed = true
        return { ...item, is_read: true }
      })
      if (!changed) return

      this.unreadTotal = 0
      await notificationsService.markAllNotificationsAsRead()
    },
  },
})
