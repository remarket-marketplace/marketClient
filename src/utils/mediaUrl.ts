const API_HOST = (import.meta.env.VITE_API_HOST || '').replace(/\/$/, '')

export function resolveApiMediaUrl(rawUrl?: string | null): string {
  const normalizedUrl = rawUrl?.trim() ?? ''
  if (!normalizedUrl) return ''

  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl
  }

  const path = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`
  if (!API_HOST) return path

  if (path.startsWith('/v1/') && API_HOST.endsWith('/v1')) {
    return `${API_HOST.slice(0, -3)}${path}`
  }

  return `${API_HOST}${path}`
}
