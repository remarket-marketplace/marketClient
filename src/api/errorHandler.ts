export interface ApiError {
  error_code: string
  error_message?: string
}

export class ErrorHandler {
  static handleApiError(error: any): ApiError {
    // Если ошибка уже в нашем формате
    if (error?.error_code) {
      return error
    }
    
    // Если ошибка от axios/HTTP клиента
    if (error?.response?.data?.detail) {
      return error.response.data.detail
    }
    
    // Сетевая ошибка или другие случаи
    return {
      error_code: 'NETWORK_ERROR',
      error_message: error?.message || 'Unknown error occurred'
    }
  }
}