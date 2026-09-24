import { httpClient } from ".."
import { ErrorHandler, type ApiError } from "../errorHandler"
import {
  InboxNotificationSchema,
  InboxNotificationsListSchema,
  type InboxNotification,
  type InboxNotificationsList,
} from "@/validation/user/inboxNotifications"
import { ZodError } from "zod"

export const notificationsService = {
  async getInboxNotifications(
    page = 1,
    perPage = 30,
  ): Promise<{ success: boolean; data?: InboxNotificationsList; error?: ApiError }> {
    try {
      const response = await httpClient.get("/users/inbox-notifications", {
        params: { page, per_page: perPage },
      })
      return {
        success: true,
        data: InboxNotificationsListSchema.parse(response.data),
      }
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(error.issues)
      }
      return {
        success: false,
        error: ErrorHandler.handleApiError(error),
      }
    }
  },

  async markNotificationAsRead(
    notificationId: string,
  ): Promise<{ success: boolean; data?: boolean; error?: ApiError }> {
    try {
      const response = await httpClient.post(`/users/inbox-notifications/${notificationId}/read`)
      return {
        success: true,
        data: Boolean(response.data?.success),
      }
    } catch (error) {
      return {
        success: false,
        error: ErrorHandler.handleApiError(error),
      }
    }
  },

  async markAllNotificationsAsRead(): Promise<{ success: boolean; data?: number; error?: ApiError }> {
    try {
      const response = await httpClient.post("/users/inbox-notifications/read-all")
      return {
        success: true,
        data: Number(response.data?.updated ?? 0),
      }
    } catch (error) {
      return {
        success: false,
        error: ErrorHandler.handleApiError(error),
      }
    }
  },

  parseNotificationPayload(payload: unknown): InboxNotification | null {
    try {
      return InboxNotificationSchema.parse(payload)
    } catch {
      return null
    }
  },
}
