import { notificationsService } from "@/api/notifications/NotificationsService"
import type { InboxNotification } from "@/validation/user/inboxNotifications"
import { defineStore } from "pinia"

const INBOX_PAGE_SIZE = 60
const INBOX_CLEARED_BEFORE_STORAGE_KEY = "remarket_inbox_cleared_before_v1"

function toTimestamp(value: string | undefined): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function countUnread(items: InboxNotification[]): number {
  return items.reduce((total, item) => total + (item.is_read ? 0 : 1), 0)
}

function readClearedBeforeMap(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = window.localStorage.getItem(INBOX_CLEARED_BEFORE_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function writeClearedBeforeMap(value: Record<string, string>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(INBOX_CLEARED_BEFORE_STORAGE_KEY, JSON.stringify(value))
}

function getClearedBeforeTimestamp(userId: string): number {
  const map = readClearedBeforeMap()
  const value = map[userId]
  if (!value) return 0
  return toTimestamp(value)
}

function setClearedBeforeTimestamp(userId: string, isoDate: string) {
  const map = readClearedBeforeMap()
  map[userId] = isoDate
  writeClearedBeforeMap(map)
}

function filterNotificationsByClearedBefore(
  items: InboxNotification[],
  clearedBeforeTimestamp: number,
): InboxNotification[] {
  if (!clearedBeforeTimestamp) return items
  return items.filter((item) => toTimestamp(item.created_at) > clearedBeforeTimestamp)
}

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    currentUserId: null as string | null,
    items: [] as InboxNotification[],
    unreadTotal: 0,
    total: 0,
    totalPages: 0,
    clearedBeforeTimestamp: 0,
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
      this.clearedBeforeTimestamp = getClearedBeforeTimestamp(userId)
      this.isLoaded = false
      this.isLoading = false
    },

    clear() {
      this.currentUserId = null
      this.items = []
      this.unreadTotal = 0
      this.total = 0
      this.totalPages = 0
      this.clearedBeforeTimestamp = 0
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
        const filteredItems = filterNotificationsByClearedBefore(
          response.data.notifications,
          this.clearedBeforeTimestamp,
        )
        this.items = filteredItems
        this.unreadTotal = countUnread(filteredItems)
        this.total = filteredItems.length
        this.totalPages = filteredItems.length > 0 ? 1 : 0
        this.isLoaded = true
      } finally {
        this.isLoading = false
      }
    },

    pushRealtimeNotification(payload: unknown) {
      const parsed = notificationsService.parseNotificationPayload(payload)
      if (!parsed) return
      if (
        this.clearedBeforeTimestamp
        && toTimestamp(parsed.created_at) <= this.clearedBeforeTimestamp
      ) {
        return
      }

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

    async clearInbox() {
      if (!this.currentUserId) return

      const clearedAtIso = new Date().toISOString()
      this.clearedBeforeTimestamp = toTimestamp(clearedAtIso)
      setClearedBeforeTimestamp(this.currentUserId, clearedAtIso)

      this.items = []
      this.unreadTotal = 0
      this.total = 0
      this.totalPages = 0
      this.isLoaded = true

      await notificationsService.markAllNotificationsAsRead()
    },
  },
})
