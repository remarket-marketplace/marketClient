export const SAFE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export const SAFE_IMAGE_INPUT_ACCEPT = Array.from(SAFE_IMAGE_MIME_TYPES).join(',')

export const PRODUCT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const PRODUCT_IMAGE_INPUT_ACCEPT = Array.from(PRODUCT_IMAGE_MIME_TYPES).join(',')

export function isSafeImageFile(file: File | null | undefined): file is File {
  return Boolean(file && SAFE_IMAGE_MIME_TYPES.has(file.type))
}

export function isProductImageFile(file: File | null | undefined): file is File {
  return Boolean(file && PRODUCT_IMAGE_MIME_TYPES.has(file.type))
}
