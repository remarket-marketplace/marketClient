import { httpClient } from ".."
import { ErrorHandler, type ApiError } from "../errorHandler"

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
}