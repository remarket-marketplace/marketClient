import type { LocationQueryRaw, RouteLocationNormalizedLoaded } from 'vue-router'

const AUTH_PATHS = new Set([
  '/signin',
  '/signup',
  '/password-reset',
  '/password-reset-email',
  '/password-reset-code',
])

function getFirstQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }

  return typeof value === 'string' ? value : null
}

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.has(path)
}

export function getSafeAuthRedirect(value: unknown, fallback = '/'): string {
  const rawValue = getFirstQueryValue(value)?.trim()
  if (!rawValue) {
    return fallback
  }

  if (!rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return fallback
  }

  let decodedValue = rawValue
  try {
    decodedValue = decodeURIComponent(rawValue)
  } catch {
    decodedValue = rawValue
  }

  if (decodedValue.startsWith('//')) {
    return fallback
  }

  const pathWithoutHash = rawValue.split('#')[0] ?? rawValue
  const pathOnly = pathWithoutHash.split('?')[0] ?? pathWithoutHash
  if (isAuthPath(pathOnly)) {
    return fallback
  }

  return rawValue
}

export function getAuthRedirectFromRoute(route: RouteLocationNormalizedLoaded, fallback = '/'): string {
  return getSafeAuthRedirect(route.query.redirect, fallback)
}

export function buildAuthRedirectQuery(targetFullPath: string): LocationQueryRaw {
  const redirect = getSafeAuthRedirect(targetFullPath, '/')
  return redirect === '/' ? {} : { redirect }
}
