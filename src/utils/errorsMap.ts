// ERRORS MAP
// error_code => ключ для i18n

export const errorCodeMap: Record<string, string> = {
  CATEGORY_ALREADY_EXISTS: 'errors.CATEGORY_ALREADY_EXISTS',
  CATEGORY_NOT_FOUND: 'errors.CATEGORY_NOT_FOUND',
  PARENT_CATEGORY_NOT_FOUND: 'errors.PARENT_CATEGORY_NOT_FOUND',
  CATEGORY_NAME_ALREADY_EXISTS: 'errors.CATEGORY_NAME_ALREADY_EXISTS',
  DATABASE_ERROR: 'errors.DATABASE_ERROR',
  PRODUCT_ID_REQUIRED: 'errors.PRODUCT_ID_REQUIRED',
  MAXIMUM_NUMBER_PHOTOS_EXCEEDED: 'errors.MAXIMUM_NUMBER_PHOTOS_EXCEEDED',
  USER_NOT_FOUND: 'errors.USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'errors.PRODUCT_NOT_FOUND',
  TOKEN_NOT_FOUND: 'errors.TOKEN_NOT_FOUND',
  INVALID_TOKEN: 'errors.INVALID_TOKEN',
  TOKEN_IS_EXPIRED: 'errors.TOKEN_IS_EXPIRED',
  TOKEN_IS_INVALID: 'errors.TOKEN_IS_INVALID',
  TOKEN_IS_REVOKED: 'errors.TOKEN_IS_REVOKED',
  USER_IS_BANNED: 'errors.USER_IS_BANNED',
  INSUFFICIENT_PERMISSIONS: 'errors.INSUFFICIENT_PERMISSIONS',
  CREATE_PRODUCT_ERROR: 'errors.CREATE_PRODUCT_ERROR',
  SELLER_NOT_FOUND: 'errors.SELLER_NOT_FOUND',
  REGISTRATION_FAILED: 'errors.REGISTRATION_FAILED',
  WRONG_VERIFICATION_CODE: 'errors.WRONG_VERIFICATION_CODE',
  FAILED_TO_SEND_VERIFICATION_CODE: 'errors.FAILED_TO_SEND_VERIFICATION_CODE',
  WRONG_IMAGE_FORMAT: 'errors.WRONG_IMAGE_FORMAT',
  WRONG_FILE_TYPE: 'errors.WRONG_FILE_TYPE',
  IMAGE_TOO_LARGE: 'errors.IMAGE_TOO_LARGE',
  WRONG_IMAGE_URL: 'errors.WRONG_IMAGE_URL',
  USERNAME_ALREADY_EXISTS: 'errors.USERNAME_ALREADY_EXISTS',
  USER_WITH_THIS_EMAIL_ALREADY_EXISTS: 'errors.USER_WITH_THIS_EMAIL_ALREADY_EXISTS',
  USER_WITH_THIS_USERNAME_ALREADY_EXISTS: 'errors.USER_WITH_THIS_USERNAME_ALREADY_EXISTS',
  NOT_ENOUGH_BALANCE: 'errors.NOT_ENOUGH_BALANCE',
  SERVER_ERROR: 'errors.SERVER_ERROR',
  PAYLOAD_IS_EMPTY: 'errors.PAYLOAD_IS_EMPTY',
  INVALID_REFRESH_TOKEN: 'errors.INVALID_REFRESH_TOKEN',
  INCORRECT_EMAIL_OR_PASSWORD: 'errors.INCORRECT_EMAIL_OR_PASSWORD',
  EMAIL_ALREADY_EXISTS: 'errors.EMAIL_ALREADY_EXISTS',
  EMAIL_VERIFICATION_MAX_COUNT_OF_TRIES_EXCEEDED: 'errors.EMAIL_VERIFICATION_MAX_COUNT_OF_TRIES_EXCEEDED',
  NETWORK_ERROR: 'errors.NETWORK_ERROR',
  VERIFY_CAPTCHA_TOKEN_FAILED: 'errors.VERIFY_CAPTCHA_TOKEN_FAILED',
  FILL_REQUIRED_FIELDS: 'errors.FILL_REQUIRED_FIELDS',
  INVALID_PASSWORD: 'errors.INVALID_PASSWORD',
  PASSWORD_SAME_AS_CURRENT: 'errors.PASSWORD_SAME_AS_CURRENT',
  PRODUCT_UPDATE_ERROR: 'errors.PRODUCT_UPDATE_ERROR',
  PRODUCT_EDIT_PERMISSION_DENIED: 'errors.PRODUCT_EDIT_PERMISSION_DENIED',
  INVALID_PRODUCT_DATA: 'errors.INVALID_PRODUCT_DATA',
  PRODUCT_ALREADY_SOLD: 'errors.PRODUCT_ALREADY_SOLD',
  AT_LEAST_ONE_IMAGE_REQUIRED: 'errors.AT_LEAST_ONE_IMAGE_REQUIRED',
  PRODUCT_PRICE_INVALID: 'errors.PRODUCT_PRICE_INVALID',
  PRODUCT_PRICE_OUT_OF_RANGE: 'errors.PRODUCT_PRICE_OUT_OF_RANGE',
  PRODUCT_PRICE_CURRENCY_UNSUPPORTED: 'errors.PRODUCT_PRICE_CURRENCY_UNSUPPORTED',
}

// errorDetail = { error_code: 'TOKEN_NOT_FOUND', error_message: 'Token not found' }
export function getErrorMessage(errorDetail: unknown, t: (key: string) => string): string {
  if (!errorDetail) {
    return t('errors.SERVER_ERROR')
  }

  if (typeof errorDetail === 'string') {
    const mappedByCode = errorCodeMap[errorDetail]
    return mappedByCode ? t(mappedByCode) : errorDetail
  }

  if (Array.isArray(errorDetail)) {
    const firstError = errorDetail[0] as { msg?: string } | undefined
    if (firstError?.msg) {
      return firstError.msg
    }
    return t('errors.SERVER_ERROR')
  }

  if (typeof errorDetail === 'object') {
    const detail = errorDetail as { error_code?: string; error_message?: string; message?: string }

    if (detail.error_code) {
      const i18nKey = errorCodeMap[detail.error_code]
      if (i18nKey) {
        return t(i18nKey)
      }
      return detail.error_message || detail.error_code
    }

    if (detail.message) {
      return detail.message
    }
  }

  return t('errors.SERVER_ERROR')
}
