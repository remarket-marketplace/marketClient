import { httpClient } from ".."
import { ErrorHandler, type ApiError } from "../errorHandler"
import {
  NicknameStyleCatalogResponseSchema,
  type NicknameStyleCatalogResponse,
} from "@/validation/user/nicknameStyle"
import { UserReadSchema, type UserRead } from "@/validation/user/userRead"
import {
  NotificationSettingsSchema,
  NotificationSettingsUpdateSchema,
  TelegramConnectLinkSchema,
  type NotificationSettings,
  type NotificationSettingsUpdate,
  type TelegramConnectLink,
} from "@/validation/user/notificationSettings"
import {
  TwoFactorSettingsSchema,
  UpdateTwoFactorSettingsSchema,
  type TwoFactorSettings,
  type UpdateTwoFactorSettings,
} from "@/validation/user/twoFactorSettings"
import { ZodError } from "zod"

export const settingsService = {
    async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; data?: any; error?: ApiError }> {
        try {
            const response = await httpClient.patch('/users/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            })
            return { 
                success: true, 
                data: response.data 
            }
        } 
        catch (error) {
            const apiError = ErrorHandler.handleApiError(error)
            return { 
                success: false, 
                error: apiError
            }
        }
    },

    async changeUsername(username: string): Promise<{ success: boolean; data?: UserRead; error?: ApiError }> {
        try {
            const response = await httpClient.patch('/users/username', {
                username,
            })
            return {
                success: true,
                data: UserReadSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async getNicknameStyles(): Promise<{ success: boolean; data?: NicknameStyleCatalogResponse; error?: ApiError }> {
        try {
            const response = await httpClient.get('/users/nickname-styles')
            return {
                success: true,
                data: NicknameStyleCatalogResponseSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async purchaseNicknameStyle(styleId: string): Promise<{ success: boolean; data?: NicknameStyleCatalogResponse; error?: ApiError }> {
        try {
            const response = await httpClient.post('/users/nickname-styles/purchase', {
                style_id: styleId,
            })
            return {
                success: true,
                data: NicknameStyleCatalogResponseSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async activateNicknameStyle(styleId: string): Promise<{ success: boolean; data?: NicknameStyleCatalogResponse; error?: ApiError }> {
        try {
            const response = await httpClient.patch('/users/nickname-styles/active', {
                style_id: styleId,
            })
            return {
                success: true,
                data: NicknameStyleCatalogResponseSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async purchaseProfileBackgroundAccess(): Promise<{ success: boolean; data?: UserRead; error?: ApiError }> {
        try {
            const response = await httpClient.post('/users/profile-background/purchase')
            return {
                success: true,
                data: UserReadSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async uploadProfileBackground(file: File): Promise<{ success: boolean; data?: UserRead; error?: ApiError }> {
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await httpClient.patch('/users/profile-background', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            return {
                success: true,
                data: UserReadSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async removeProfileBackground(): Promise<{ success: boolean; data?: UserRead; error?: ApiError }> {
        try {
            const response = await httpClient.delete('/users/profile-background')
            return {
                success: true,
                data: UserReadSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async getNotificationSettings(): Promise<{ success: boolean; data?: NotificationSettings; error?: ApiError }> {
        try {
            const response = await httpClient.get('/users/notifications')
            return {
                success: true,
                data: NotificationSettingsSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async updateNotificationSettings(
      payload: NotificationSettingsUpdate,
    ): Promise<{ success: boolean; data?: NotificationSettings; error?: ApiError }> {
        try {
            const parsedPayload = NotificationSettingsUpdateSchema.parse(payload)
            const response = await httpClient.patch('/users/notifications', parsedPayload)
            return {
                success: true,
                data: NotificationSettingsSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async createTelegramConnectLink(): Promise<{ success: boolean; data?: TelegramConnectLink; error?: ApiError }> {
        try {
            const response = await httpClient.post('/users/notifications/telegram/connect')
            return {
                success: true,
                data: TelegramConnectLinkSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async disconnectTelegram(): Promise<{ success: boolean; data?: NotificationSettings; error?: ApiError }> {
        try {
            const response = await httpClient.delete('/users/notifications/telegram/connect')
            return {
                success: true,
                data: NotificationSettingsSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async getTwoFactorSettings(): Promise<{ success: boolean; data?: TwoFactorSettings; error?: ApiError }> {
        try {
            const response = await httpClient.get('/users/security/two-factor')
            return {
                success: true,
                data: TwoFactorSettingsSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },

    async updateTwoFactorSettings(
      payload: UpdateTwoFactorSettings,
    ): Promise<{ success: boolean; data?: TwoFactorSettings; error?: ApiError }> {
        try {
            const parsedPayload = UpdateTwoFactorSettingsSchema.parse(payload)
            const response = await httpClient.patch('/users/security/two-factor', parsedPayload)
            return {
                success: true,
                data: TwoFactorSettingsSchema.parse(response.data),
            }
        }
        catch (error) {
            if (error instanceof ZodError) {
                console.error(error.issues)
            }
            return {
                success: false,
                error: ErrorHandler.handleApiError(error),
            }
        }
    },
}
